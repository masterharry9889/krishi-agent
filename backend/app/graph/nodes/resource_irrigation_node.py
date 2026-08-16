from ...agents.resource_irrigation_agent import ResourceIrrigationAgent

def resource_irrigation_node(state):
    agent = ResourceIrrigationAgent()
    return agent.run(state)