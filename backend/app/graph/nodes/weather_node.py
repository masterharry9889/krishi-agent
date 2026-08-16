from ...agents.weather_agent import WeatherAgent

def weather_node(state):
    agent = WeatherAgent()
    return agent.run(state)