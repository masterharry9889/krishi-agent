"""Centralized agent registry for the Krishi Agent backend.

This is the SINGLE SOURCE OF TRUTH for all agent metadata. Both the API
endpoints and (eventually) the frontend derive agent configuration from here.

Each agent entry defines:
  - key:           endpoint name (used in /agents/{key}/run)
  - display_name:  human-friendly name shown in the UI
  - description:   short description of what the agent does
  - implemented:   whether the agent has real logic (vs. stub/compleing_soon)
  - phase:         pipeline phase the agent belongs to
  - dependencies:  list of agent keys that must succeed first
  - icon_category: used by frontend for display
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class AgentEntry:
    key: str
    display_name: str
    description: str
    implemented: bool
    phase: str
    dependencies: List[str] = field(default_factory=list)
    icon_category: str = "general"

    aliases: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "display_name": self.display_name,
            "description": self.description,
            "implemented": self.implemented,
            "phase": self.phase,
            "dependencies": self.dependencies,
            "icon_category": self.icon_category,
            "aliases": self.aliases,
        }


def resolve_agent_key(key: str) -> Optional[str]:
    """Resolve an agent key or alias to its canonical key."""
    for agent in AGENT_REGISTRY:
        if agent.key == key:
            return agent.key
        if key in agent.aliases:
            return agent.key
    return None


# ─── Agent definitions ────────────────────────────────────────────────────────
# Ordered by pipeline flow.  Dependencies must be registered first.
AGENT_REGISTRY: List[AgentEntry] = [
    # Phase 2: Diagnostics
    AgentEntry(
        key="soil",
        display_name="Soil Analysis",
        description="Analyses Soil Health Card data — pH, NPK status, micronutrient deficiencies, and corrective measures.",
        phase="diagnostics",
        implemented=True,
        dependencies=[],
        icon_category="soil",
    ),
    AgentEntry(
        key="weather",
        display_name="Weather",
        description="7-day weather forecast and seasonal monsoon outlook for your location.",
        phase="diagnostics",
        implemented=True,
        dependencies=[],
        icon_category="weather",
    ),
    AgentEntry(
        key="market_intelligence",
        display_name="Market Intelligence",
        description="Agmarknet mandi prices, demand-supply trends, and best market timing for your district.",
        phase="diagnostics",
        implemented=True,
        dependencies=[],
        icon_category="market",
    ),
    # Disease Detection (conditional - triggered by image upload)
    AgentEntry(
        key="disease_detection",
        display_name="Disease Detection",
        description="Identifies crop diseases and pests from leaf/crop photos using vision AI. Returns structured diagnosis with confidence scoring.",
        phase="diagnostics",
        implemented=True,
        dependencies=[],
        icon_category="disease",
    ),
    AgentEntry(
        key="disease_research",
        display_name="Disease Treatment Research",
        description="Generates actionable, regionally-appropriate treatment plans for detected diseases. Prioritizes organic/low-cost interventions for smallholders.",
        phase="diagnostics",
        implemented=True,
        dependencies=["disease_detection"],
        icon_category="disease",
    ),
    # Government Schemes (conditional - triggered by scheme/policy questions in chat)
    AgentEntry(
        key="government_schemes",
        display_name="Government Schemes & Policies",
        description="Answers questions about and matches farmers to relevant central government schemes, subsidies, and policies (PM-KISAN, PMFBY, KCC, PM-KUSUM, and more).",
        phase="diagnostics",
        implemented=True,
        dependencies=[],
        icon_category="schemes",
    ),
    # Phase 3: Recommendation
    AgentEntry(
        key="crop_recommendation",
        display_name="Crop Recommendation",
        description="Ranked crop shortlist based on your soil report, weather outlook, and market signals.",
        phase="recommendation",
        implemented=True,
        dependencies=["soil", "weather"],
        icon_category="crop",
    ),
    AgentEntry(
        key="irrigation",
        display_name="Irrigation Planning",
        description="Water scheduling and irrigation optimization based on soil moisture and forecast.",
        phase="recommendation",
        implemented=True,
        dependencies=["soil", "weather", "crop_recommendation"],
        icon_category="irrigation",
    ),
    AgentEntry(
        key="budget_estimator",
        display_name="Budget Estimator",
        description="Totals input costs and expected returns for the recommended crop plan.",
        phase="planning",
        implemented=True,
        dependencies=["irrigation", "crop_recommendation"],
        icon_category="budget",
    ),
    AgentEntry(
        key="input_verification",
        display_name="Input Verification",
        description="Verified seed and fertilizer dealer contacts to avoid counterfeit inputs.",
        phase="planning",
        implemented=True,
        dependencies=["budget_estimator"],
        icon_category="verification",
    ),
    # Phase 4: Risk Management
    AgentEntry(
        key="scheme_insurance",
        display_name="Insurance & Schemes",
        description="PMFBY crop insurance eligibility, government scheme matching, and subsidy alerts.",
        phase="planning",
        implemented=True,
        dependencies=["input_verification", "crop_recommendation"],
        icon_category="insurance",
        aliases=["insurance"],
    ),
    AgentEntry(
        key="credit",
        display_name="Credit",
        description="Kisan Credit Card and rural bank loan options suited to your crop and land.",
        phase="planning",
        implemented=True,
        dependencies=["budget_estimator", "scheme_insurance"],
        icon_category="credit",
    ),
    # Phase 5: Monitoring
    AgentEntry(
        key="crop_monitoring",
        display_name="Crop Monitoring",
        description="Satellite NDVI crop health monitoring, pest alerts, and disease risk flags.",
        phase="monitoring",
        implemented=True,
        dependencies=["crop_recommendation"],
        icon_category="monitoring",
        aliases=["monitoring"],
    ),
    AgentEntry(
        key="advisory",
        display_name="Advisory",
        description="Personalized agronomic nudges for irrigation, pest management, and labour timing.",
        phase="monitoring",
        implemented=True,
        dependencies=["crop_monitoring", "weather"],
        icon_category="advisory",
    ),
    # Phase 6: Harvest Decision
    AgentEntry(
        key="storage_sell_timing",
        display_name="Harvest & Sell Timing",
        description="Post-harvest storage recommendations and optimal sell-timing window analysis.",
        phase="harvest_decision",
        implemented=True,
        dependencies=["crop_monitoring", "market_intelligence"],
        icon_category="harvest",
        aliases=["storage"],
    ),
    # Phase 7: Market Linkage
    AgentEntry(
        key="market_linkage",
        display_name="Market Linkage",
        description="e-NAM and FPO connections, direct buyer linkage, and transport cost estimation.",
        phase="market_linkage",
        implemented=True,
        dependencies=["storage_sell_timing", "crop_recommendation"],
        icon_category="market",
    ),
    # Phase 8: Feedback
    AgentEntry(
        key="feedback",
        display_name="Feedback",
        description="Capture season learnings to continuously improve next season's recommendations.",
        phase="feedback",
        implemented=True,
        dependencies=["market_linkage"],
        icon_category="feedback",
    ),
    # Phase 9: Validation (guardrail layer — runs last, before user response)
    AgentEntry(
        key="validation",
        display_name="Validation Guardrails",
        description="Safety and quality validation layer: schema checks, confidence thresholds, pesticide cautions, financial certainty, language validation.",
        phase="validation",
        implemented=True,
        dependencies=["feedback"],
        icon_category="validation",
        aliases=["information_validation"],
    ),
]

# ─── Convenience structures ────────────────────────────────────────────────────
AGENT_KEYS: List[str] = [a.key for a in AGENT_REGISTRY]
IMPLEMENTED_AGENT_KEYS: List[str] = [a.key for a in AGENT_REGISTRY if a.implemented]
ALL_KNOWN_AGENT_KEYS: List[str] = AGENT_KEYS
AGENT_LOOKUP: Dict[str, AgentEntry] = {a.key: a for a in AGENT_REGISTRY}


def get_agent(key: str) -> Optional[AgentEntry]:
    """Look up an agent by its key."""
    for agent in AGENT_REGISTRY:
        if agent.key == key:
            return agent
    return None


def get_registry_dict() -> Dict[str, dict]:
    """Return the full registry as a dict keyed by agent key.

    Useful for exposing via an API endpoint.
    """
    return {agent.key: agent.to_dict() for agent in AGENT_REGISTRY}


def check_dependencies_met(
    agent_key: str, completed_agents: set
) -> List[str]:
    """Return the list of missing dependency keys for the given agent.

    An empty list means all dependencies are satisfied (or the agent has none).
    """
    agent = get_agent(agent_key)
    if agent is None:
        return []  # unknown agent — will be caught elsewhere
    return [dep for dep in agent.dependencies if dep not in completed_agents]
