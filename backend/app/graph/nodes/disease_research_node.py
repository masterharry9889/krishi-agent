from ...agents.disease_research_agent import DiseaseResearchAgent

def disease_research_node(state):
    agent = DiseaseResearchAgent()
    return agent.run(state)