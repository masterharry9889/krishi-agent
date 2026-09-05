from langgraph.graph import StateGraph, END
# Try to import PostgresSaver, fall back to MemorySaver if not available
try:
    from langgraph.checkpoint.postgres import PostgresSaver
except ImportError:
    # Fallback to memory for testing or if postgres dependencies are not installed
    from langgraph.checkpoint.memory import MemorySaver as PostgresSaver
from .state import FarmerState
from .nodes import (
    onboarding_node, soil_node, weather_node,
    crop_recommendation_node, market_intel_node,
    resource_irrigation_node, budget_estimator_node,
    input_verification_node, scheme_insurance_node, credit_node,
    storage_sell_timing_node, market_linkage_node, feedback_node,
    crop_monitoring_node, advisory_node,
    monitoring_handoff_node, harvest_ready_signal_node, await_price_trigger_node,
    validation_node,
    disease_detection_node, disease_research_node,
    diagnostics_entry_node
)
from .router import needs_credit, insurance_deadline_soon, has_image_attachment


def build_graph(checkpointer: PostgresSaver):
    graph = StateGraph(FarmerState)

    # Nodes for phases 1-4
    graph.add_node("onboarding", onboarding_node)
    graph.add_node("diagnostics_entry", diagnostics_entry_node)  # fans out to soil, weather, market_intel
    graph.add_node("soil", soil_node)
    graph.add_node("weather", weather_node)
    graph.add_node("market_intel", market_intel_node)
    graph.add_node("crop_recommendation", crop_recommendation_node)
    graph.add_node("resource_irrigation", resource_irrigation_node)
    graph.add_node("budget_estimator", budget_estimator_node)
    graph.add_node("input_verification", input_verification_node)
    graph.add_node("scheme_insurance", scheme_insurance_node)
    graph.add_node("credit", credit_node)

    # Disease detection nodes (conditional branch)
    graph.add_node("disease_detection", disease_detection_node)
    graph.add_node("disease_research", disease_research_node)

    # Nodes for phase 5 (monitoring) - handled by workers, but we have handoff and resume nodes
    graph.add_node("monitoring_handoff", monitoring_handoff_node)
    graph.add_node("crop_monitoring", crop_monitoring_node)
    graph.add_node("advisory", advisory_node)
    # Nodes for phases 6-8
    graph.add_node("storage_sell_timing", storage_sell_timing_node)
    graph.add_node("market_linkage", market_linkage_node)
    graph.add_node("feedback", feedback_node)
    graph.add_node("validation", validation_node)
    graph.add_node("harvest_ready_signal", harvest_ready_signal_node)
    graph.add_node("await_price_trigger", await_price_trigger_node)
    # Entry point
    graph.set_entry_point("onboarding")

    # Conditional branch from onboarding: if image attached, run disease detection flow
    graph.add_conditional_edges(
        "onboarding",
        has_image_attachment,
        {
            "has_image": "disease_detection",
            "no_image": "diagnostics_entry",  # fans out to soil, weather, market_intel
        },
    )

    # Normal diagnostic flow (when no image)
    graph.add_edge("diagnostics_entry", "crop_recommendation")   # fan-in from soil, weather, market_intel
    graph.add_edge("crop_recommendation", "resource_irrigation")
    graph.add_edge("resource_irrigation", "budget_estimator")
    graph.add_edge("budget_estimator", "input_verification")
    graph.add_edge("input_verification", "scheme_insurance")

    # Disease detection flow (when image attached)
    graph.add_edge("disease_detection", "disease_research")
    graph.add_edge("disease_research", "validation")
    graph.add_edge("validation", END)

    # Conditional: after scheme_insurance, go to credit if needed, else to monitoring handoff
    graph.add_conditional_edges(
        "scheme_insurance",
        needs_credit,
        {
            "credit_needed": "credit",
            "sufficient_budget": "monitoring_handoff",
        },
    )
    graph.add_edge("credit", "monitoring_handoff")

    # Phase 5: monitoring is event-driven, so we pause at monitoring_handoff (which will be interrupted)
    # In practice, we use interrupt_after or just end the graph run here and let workers resume.
    # For now, we'll just end the graph at monitoring_handoff and let the scheduler trigger a new run for monitoring.
    # However, to allow resuming the same thread, we'll connect monitoring_handoff to the monitoring subgraph and then back to harvest_ready_signal.
    graph.add_edge("monitoring_handoff", "crop_monitoring")
    graph.add_edge("crop_monitoring", "advisory")
    graph.add_edge("advisory", "harvest_ready_signal")   # after monitoring, check if harvest ready

    # Phase 6: harvest decision
    graph.add_edge("harvest_ready_signal", "storage_sell_timing")
    graph.add_conditional_edges(
        "storage_sell_timing",
        lambda s: s["sell_recommendation"]["action"],
        {
            "sell_now": "market_linkage",
            "hold": "await_price_trigger",   # re-entered by price_watcher when a threshold is crossed
        },
    )
    graph.add_edge("market_linkage", "feedback")
    graph.add_edge("feedback", "validation")
    # NOTE: validation→END edge already defined above (disease_research flow).
    # Both flows (disease and feedback) converge on the same validation node.

    # The await_price_trigger node is a placeholder; the price_watcher will trigger a new graph run
    # that resumes at this node (or we can have it trigger a rerun from storage_sell_timing again).
    # For simplicity, we'll just end at await_price_trigger and let the scheduler handle retriggering.
    graph.add_edge("await_price_trigger", END)

    return graph.compile(checkpointer=checkpointer)