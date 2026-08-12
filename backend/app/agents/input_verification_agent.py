class InputVerificationAgent:
    """Flags licensed dealers to avoid counterfeit seed or fertilizer."""
    def run(self, state):
        # Stub: list of verified dealers.
        dealers = {
            'seed': ['AgroSeed Co.', 'GreenGenetics'],
            'fertilizer': ['FertiMax', 'SoilBoost']
        }
        return {"verified_dealers": dealers}