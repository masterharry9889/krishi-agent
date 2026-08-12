class FarmerInterfaceAgent:
    """Collects farmer profile via voice or app (stub)."""
    def run(self, state):
        # In reality: voice/app UI in local language.
        # For now, we return the profile from the state if it exists, else a default.
        profile = state.get("profile", {
            "location": "unknown",
            "land_size": 0,
            "water_source": "unknown",
            "past_crops": [],
            "budget": 0,
            "language": "en"
        })
        # We could also simulate collection by returning a fixed profile, but we'll just pass through.
        return {"profile": profile}