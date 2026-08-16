# Node: monitoring handoff and phase 5-8 execution wrappers
from ...agents.crop_monitoring_agent import CropMonitoringAgent
from ...agents.advisory_agent import AdvisoryAgent
from ...agents.storage_selltiming_agent import StorageSellTimingAgent
from ...agents.direct_market_linkage_agent import DirectMarketLinkageAgent
from ...agents.feedback_agent import FeedbackAgent
from ...agents.credit_agent import CreditAgent


def monitoring_handoff_node(state):
    """Sets the phase to monitoring and signals that background workers take over."""
    return {"phase": "monitoring"}


def crop_monitoring_node(state):
    """Executes CropMonitoringAgent to check growth stage, pests, and disease."""
    agent = CropMonitoringAgent()
    result = agent.run(state)
    # CropMonitoringAgent returns {"monitoring_alert": {...}}
    # Append the alert dict to the monitoring_alerts list in state
    alerts = list(state.get("monitoring_alerts", []))
    if "monitoring_alert" in result:
        alerts.append(result["monitoring_alert"])
    return {"monitoring_alerts": alerts}


def advisory_node(state):
    """Executes AdvisoryAgent to push irrigation, pest, and labor-timing nudges."""
    agent = AdvisoryAgent()
    result = agent.run(state)
    # AdvisoryAgent returns {"advisory_log": [dict, dict]}
    existing = list(state.get("advisory_log", []))
    for nudge in result.get("advisory_log", []):
        existing.append(nudge)
    return {"advisory_log": existing}


def harvest_ready_signal_node(state):
    """Checks whether the crop has reached harvest readiness."""
    alerts = state.get("monitoring_alerts", [])
    # If any monitoring alert indicates harvest readiness, set the flag
    for alert in alerts:
        alert_dict = alert.get("monitoring_alert", alert) if isinstance(alert, dict) else {}
        stage = alert_dict.get("stage", "")
        message = alert_dict.get("message", "")
        if stage == "mature" or "ready" in str(message).lower():
            return {"harvest_ready": True}
    # Default: not ready yet (in production, this would use NDVI + crop duration)
    return {"harvest_ready": False}


def storage_sell_timing_node(state):
    """Evaluates shelf life, cold storage, and price trends for hold-vs-sell."""
    agent = StorageSellTimingAgent()
    return agent.run(state)


def market_linkage_node(state):
    """Connects the farmer to e-NAM, FPOs, or verified buyers."""
    agent = DirectMarketLinkageAgent()
    return agent.run(state)


def feedback_node(state):
    """Logs actual yield, price realized, and input costs for next season."""
    agent = FeedbackAgent()
    return agent.run(state)


def await_price_trigger_node(state):
    """Placeholder: the price_watcher worker will resume the graph here
    when a price threshold is crossed. For now, ends the graph."""
    return {}


def credit_node(state):
    """Surfaces formal loan options when budget shortfall is detected."""
    agent = CreditAgent()
    return agent.run(state)
