from ...agents.crop_recommendation_agent import CropRecommendationAgent

def crop_recommendation_node(state):
    agent = CropRecommendationAgent()
    return agent.run(state)