class CropRecommendationAgent:
    """Combines soil and weather suitability with market demand-supply gap."""
    def run(self, state):
        soil = state.get("soil_report", {})
        weather = state.get("weather_outlook", {})
        market_intel = state.get("market_intel", {})
        # Simplistic scoring: pretend each crop gets a score.
        # We'll consider a few crops and compute a score based on agronomic fit and market opportunity.
        # For stub, we'll hardcode some logic.
        crops = ['wheat', 'rice', 'cotton', 'sugarcane']
        scores = {}
        for c in crops:
            score = 0
            # agronomic fit (dummy: based on pH and weather)
            # Assume soil pH between 5.5 and 7.0 is good for all these crops (simplistic)
            if 5.5 <= soil.get('ph', 6) <= 7.0:
                score += 1
            # Assume good weather (enough rain) adds another point
            # We'll just check if the forecast has any rain day (simplistic)
            forecast = weather.get('forecast_7d', [])
            if any(day.get('rain_mm', 0) > 0 for day in forecast):
                score += 1
            # market opportunity (dummy: based on demand-supply gap)
            # market_intel is a dict: {crop: {demand, supply, gap}}
            gap = market_intel.get(c, {}).get('gap', '')
            if gap == '+':  # demand > supply
                score += 2
            elif gap == '-':  # demand < supply
                score -= 1
            # else neutral, no change
            scores[c] = score
        # Create shortlist of dicts with crop and score, sorted descending
        shortlist = [
            {"crop": crop, "score": score, "agronomic_fit": 0.8, "market_opportunity": 0.7}  # placeholder values
            for crop, score in sorted(scores.items(), key=lambda x: x[1], reverse=True)
        ]
        return {"crop_shortlist": shortlist}