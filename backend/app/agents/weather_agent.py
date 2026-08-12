class WeatherAgent:
    """Pulls forecast and seasonal outlook."""
    def run(self, state):
        # Stub: replace with weather API.
        weather_data = {
            'forecast_7d': [{'day': 'Mon', 'rain_mm': 5, 'temp_c': 28},
                            {'day': 'Tue', 'rain_mm': 0, 'temp_c': 30}],
            'seasonal_outlook': 'normal monsoon'
        }
        return {"weather_outlook": weather_data}