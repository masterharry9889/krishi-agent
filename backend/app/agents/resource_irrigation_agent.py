class ResourceIrrigationAgent:
    """Builds the input plan (seed, fertilizer, irrigation)."""
    def run(self, state):
        # Stub: replace with actual logic based on crop, soil, weather.
        # For now, we return a fixed plan.
        plan = {
            'seed_kg_per_acre': 2,
            'fertilizer_kg_per_acre': 50,
            'irrigation_liters_per_week': 1000
        }
        return {"input_plan": plan}