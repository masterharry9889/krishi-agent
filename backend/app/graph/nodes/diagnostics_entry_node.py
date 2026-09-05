"""
Diagnostics Entry Node - fans out to soil, weather, market_intel in parallel.
Used when no image attachment is present.
"""
from ...agents.soil_agent import SoilAgent
from ...agents.weather_agent import WeatherAgent
from ...agents.market_intelligence_agent import MarketIntelligenceAgent

def diagnostics_entry_node(state):
    """Run soil, weather, and market_intel agents in parallel (sequential here, but could be parallelized)."""
    soil_agent = SoilAgent()
    weather_agent = WeatherAgent()
    market_agent = MarketIntelligenceAgent()
    
    soil_result = soil_agent.run(state)
    weather_result = weather_agent.run(state)
    market_result = market_agent.run(state)
    
    # Merge all results
    result = {}
    result.update(soil_result)
    result.update(weather_result)
    result.update(market_result)
    return result