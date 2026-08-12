class SoilAgent:
    """Pulls soil-health data (lab, sensors, govt soil-health card)."""
    def run(self, state):
        # Stub: replace with actual data source call.
        soil_data = {
            'ph': 6.5,
            'nitrogen': 'medium',
            'phosphorus': 'low',
            'potassium': 'adequate',
            'organic_matter': '1.2%'
        }
        return {"soil_report": soil_data}