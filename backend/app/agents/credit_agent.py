class CreditAgent:
    """Surfaces formal loan options if needed."""
    def run(self, state):
        # Stub: loan offers.
        loans = [
            {'bank': 'Rural Bank', 'rate': '7.5%', 'max': 100000},
            {'bank': 'Co-op Bank', 'rate': '8.0%', 'max': 80000}
        ]
        return {"credit_offers": loans}