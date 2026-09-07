"""
AgentOrchestrator — Smart Orchestration Engine for the 14-Agent Krishi Pipeline.

Executes required agents in topological dependency order:
- Concurrent execution for independent diagnostic agents (Soil, Weather, Market).
- Sequential execution for downstream dependent agents as prerequisites complete.
- Freshness checks to prevent redundant API/LLM execution.
- Generates and persists unified FarmerInsightService summary.
"""
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Dict, Any, List

from ..db import FarmerService
from ..context.farmer_context import FarmerContext
from ..agents.registry import AGENT_REGISTRY, AGENT_LOOKUP, check_dependencies_met, resolve_agent_key
from .farmer_insight_service import FarmerInsightService, is_agent_fresh

logger = logging.getLogger("krishi_agent")

# Independent diagnostic agents that can safely execute concurrently
INDEPENDENT_AGENTS = ["soil", "weather", "market_intelligence"]

# Canonical execution order for dependent pipeline agents
DEPENDENT_PIPELINE = [
    "crop_recommendation",
    "irrigation",
    "budget_estimator",
    "input_verification",
    "scheme_insurance",
    "credit",
    "crop_monitoring",
    "advisory",
    "storage_sell_timing",
    "market_linkage",
    "feedback",
]

# Core diagnostic & planning agents whose outputs are displayed on the farmer dashboard:
# 1. soil -> soil priorities & crop suitability factors
# 2. weather -> weather forecast, rain/dry spell alerts & crop suitability factors
# 3. market_intelligence -> mandi modal prices, market trends & selling recommendation
# 4. crop_recommendation -> recommended crop decision card & variety guidance
# 5. irrigation -> water schedule & input requirements (prerequisite for budget)
# 6. budget_estimator -> input costs, expected net margin & financial snapshot
DASHBOARD_AGENTS = [
    "soil",
    "weather",
    "market_intelligence",
    "crop_recommendation",
    "irrigation",
    "budget_estimator",
]


class AgentOrchestrator:
    """Orchestrates multi-agent execution efficiently with concurrency and dependency management."""

    def __init__(self, service: FarmerService | None = None):
        self.service = service or FarmerService()

    def orchestrate(
        self,
        farmer_id: str,
        season_id: str,
        force_refresh: bool = False,
        agents_to_run: List[str] | None = None,
    ) -> Dict[str, Any]:
        """
        Loads farmer context, evaluates missing/stale agents, executes independent agents concurrently,
        executes downstream dependent agents in topological order, and updates unified insights.
        Only runs agents whose information is required for the dashboard by default.
        """
        # Validate farmer_id and season_id isolation
        farmer = self.service.get_by_farmer_id(farmer_id)
        if not farmer:
            raise LookupError(f"Farmer not found for farmer_id={farmer_id}")
        if farmer.get("season_id") != season_id:
            raise PermissionError(f"Season ID '{season_id}' does not belong to farmer '{farmer_id}'")

        # Determine targeted agents: default to dashboard-only agents unless "all" or specific list requested
        if not agents_to_run:
            active_agents = set(DASHBOARD_AGENTS)
        elif "all" in agents_to_run:
            active_agents = None  # None indicates all pipeline agents can run
        else:
            active_agents = set(agents_to_run)

        context = FarmerContext(farmer_id=farmer_id, season_id=season_id, service=self.service)
        state = context.load()
        existing_outputs = farmer.get("agent_outputs", [])
        existing_by_agent = {e["agent"]: e for e in existing_outputs if "agent" in e}

        # ── 1. Determine which independent agents need execution ──────
        independent_tasks = []
        for agent_key in INDEPENDENT_AGENTS:
            if active_agents is not None and agent_key not in active_agents:
                continue
            entry = existing_by_agent.get(agent_key)
            if force_refresh or not entry or not is_agent_fresh(entry):
                independent_tasks.append(agent_key)

        # ── 2. Run independent agents concurrently using ThreadPool ───
        if independent_tasks:
            logger.info(f"[ORCHESTRATOR] Running independent dashboard agents concurrently: {independent_tasks}")
            with ThreadPoolExecutor(max_workers=min(4, len(independent_tasks))) as executor:
                futures = {
                    executor.submit(self._run_single_agent, context, key): key
                    for key in independent_tasks
                }
                for future in as_completed(futures):
                    agent_key = futures[future]
                    try:
                        future.result()
                    except Exception as exc:
                        logger.error(f"[ORCHESTRATOR ERROR] Independent agent '{agent_key}' failed: {exc}")

        # Reload state and existing_by_agent map after independent executions
        state = context.load()
        farmer = self.service.get_by_farmer_id(farmer_id)
        existing_outputs = farmer.get("agent_outputs", [])
        existing_by_agent = {e["agent"]: e for e in existing_outputs if "agent" in e}

        # ── 3. Run dependent agents sequentially as prerequisites complete ──
        for agent_key in DEPENDENT_PIPELINE:
            if active_agents is not None and agent_key not in active_agents:
                continue

            # Check if prerequisites are satisfied
            canonical_key = resolve_agent_key(agent_key)
            agent_entry = AGENT_LOOKUP.get(canonical_key)
            if not agent_entry:
                continue

            missing_deps = check_dependencies_met(canonical_key, set(existing_by_agent.keys()))
            if missing_deps:
                logger.info(f"[ORCHESTRATOR SKIP] Skipping '{canonical_key}' — missing prerequisites: {missing_deps}")
                continue

            existing_entry = existing_by_agent.get(canonical_key)
            if force_refresh or not existing_entry or not is_agent_fresh(existing_entry):
                logger.info(f"[ORCHESTRATOR] Executing dependent agent: {canonical_key}")
                try:
                    self._run_single_agent(context, canonical_key)
                    # Refresh state and existing map after execution
                    state = context.load()
                    farmer = self.service.get_by_farmer_id(farmer_id)
                    existing_outputs = farmer.get("agent_outputs", [])
                    existing_by_agent = {e["agent"]: e for e in existing_outputs if "agent" in e}
                except Exception as exc:
                    logger.error(f"[ORCHESTRATOR ERROR] Dependent agent '{canonical_key}' failed: {exc}")

        # ── 4. Generate & persist unified FarmerInsight ───────────────
        final_state = context.load()
        try:
            insight = FarmerInsightService.generate_insight(final_state)
        except Exception as exc:
            logger.error(f"[ORCHESTRATOR] FarmerInsightService.generate_insight failed: {exc}")
            insight = {
                "summary": "Insight generation encountered an error. Partial data may be available.",
                "farmer_id": farmer_id,
                "season_id": season_id,
                "error": str(exc),
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }

        # Persist insight to MongoDB
        try:
            self.service.update_farmer(farmer_id, {"farmer_insight": insight})
        except Exception as exc:
            logger.error(f"[ORCHESTRATOR] Failed to persist farmer_insight: {exc}")

        return {
            "farmer_id": farmer_id,
            "season_id": season_id,
            "context": final_state,
            "insight": insight,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _run_single_agent(self, context: FarmerContext, agent_key: str):
        from backend.main import AGENT_INSTANCES
        canonical_key = resolve_agent_key(agent_key)
        if canonical_key not in AGENT_INSTANCES:
            raise KeyError(f"Agent instance '{canonical_key}' not found.")

        agent_instance = AGENT_INSTANCES[canonical_key]
        state = context.load()
        result = agent_instance.run(state)

        # Extract output dict
        if isinstance(result, dict) and canonical_key in result:
            output = result[canonical_key]
        elif isinstance(result, dict) and len(result) == 1:
            output = list(result.values())[0]
        else:
            output = result

        context.save_agent_output(canonical_key, output)
