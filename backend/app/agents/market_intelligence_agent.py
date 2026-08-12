class MarketIntelligenceAgent:
    """Scans demand-supply gap across nearby mandis."""
    def run(self, state):
        # Stub: replace with mandi price API.
        demand_supply = {
            'wheat': {'demand': 'high', 'supply': 'medium', 'gap': '+'},
            'rice': {'demand': 'medium', 'supply': 'high', 'gap': '-'},
            'cotton': {'demand': 'medium', 'supply': 'low', 'gap': '+'}
        }
        return {"market_intel": demand_supply}