class StorageSellTimingAgent:
    """Evaluates shelf life, nearest cold storage or warehouse options, and current price trend to recommend sell-now versus hold."""
    def run(self, state):
        # Stub: replace with actual logic based on crop, price trends, storage availability.
        # For now, we return a fixed recommendation.
        recommendation = {
            'action': 'hold',  # or 'sell_now'
            'reason': 'Price expected to rise 10% in 2 weeks',
            'storage_nearby': ['ColdStore A', 'Warehouse B'],
            'price_trend': 'increasing'
        }
        return {"sell_recommendation": recommendation}