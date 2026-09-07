from ...agents.government_schemes_agent import GovernmentSchemesAgent

def government_schemes_node(state):
    agent = GovernmentSchemesAgent()
    return agent.run(state)
