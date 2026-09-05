from ...agents.disease_detection_agent import DiseaseDetectionAgent

def disease_detection_node(state):
    agent = DiseaseDetectionAgent()
    return agent.run(state)