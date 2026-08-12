class AdvisoryAgent:
    """Pushes irrigation, pest, and labor-timing nudges to the farmer as conditions change."""
    def run(self, state):
        # Stub: simple nudges based on weather and monitoring alerts.
        weather = state.get("weather_outlook", {})
        alerts = state.get("monitoring_alerts", [])
        nudges = []
        # Example nudge: if no rain in forecast, suggest irrigation.
        forecast = weather.get('forecast_7d', [])
        if any(day.get('rain_mm', 0) == 0 for day in forecast):
            nudges.append('Irrigate tomorrow - no rain forecast.')
        else:
            nudges.append('Delay irrigation - rain expected.')
        # Add more nudges based on alerts (pests, disease, etc.)
        for alert in alerts:
            if alert.get('type') == 'pest' and alert.get('severity') == 'high':
                nudges.append(f"High pest alert: {alert.get('message')} - consider pesticide application.")
        return {"advisory_log": nudges}