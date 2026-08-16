from ...agents.soil_agent import SoilAgent

def soil_node(state):
    agent = SoilAgent()
    return agent.run(state)