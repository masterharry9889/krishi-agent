class DirectMarketLinkageAgent:
    """Connects the farmer to e-NAM, local FPOs, or verified buyers."""
    def run(self, state):
        # Stub: replace with actual linkage logic.
        linkages = {
            'e_NAM': 'https://enam.gov.in/trade',
            'local_FPO': 'GreenFarmers FPO',
            'verified_buyers': ['OrganicMart', 'FreshDirect']
        }
        return {"market_linkage": linkages}