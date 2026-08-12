def needs_credit(state) -> str:
    """Return 'credit_needed' if budget shortfall detected, else 'sufficient_budget'."""
    budget = state.get("budget_estimate", {})
    # stub: assume credit needed if estimated cost > 100000 (placeholder)
    if budget.get("estimated_cost", 0) > 100000:
        return "credit_needed"
    return "sufficient_budget"


def insurance_deadline_soon(state) -> bool:
    """Placeholder for router that might be used elsewhere."""
    return False