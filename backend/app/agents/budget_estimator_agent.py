class BudgetEstimatorAgent:
    """Totals costs and expected margin."""
    def run(self, state):
        # Stub cost numbers.
        land_size = state.get("profile", {}).get("land_size", 1)  # default 1 acre
        cost_per_acre = 5000  # placeholder
        revenue_per_acre = 8000  # placeholder
        cost = land_size * cost_per_acre
        revenue_est = land_size * revenue_per_acre
        margin = revenue_est - cost
        budget = {
            "estimated_cost": cost,
            "estimated_revenue": revenue_est,
            "expected_margin": margin
        }
        return {"budget_estimate": budget}