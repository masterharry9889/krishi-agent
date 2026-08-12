class FeedbackAgent:
    """Logs actual yield, price realized, and input costs to refine next season's recommendations."""
    def run(self, state):
        # Stub: replace with actual feedback collection.
        # In reality, we would collect data from the farmer (via voice/app) or from sensors.
        # For now, we return a fixed feedback record.
        feedback = {
            'actual_yield': 1.2,  # tons per acre
            'price_realized': 1500,  # per ton
            'input_costs': 6000,  # per acre
            'lessons': ['Used too much fertilizer', 'Irrigation timing was good']
        }
        return {"season_feedback": feedback}