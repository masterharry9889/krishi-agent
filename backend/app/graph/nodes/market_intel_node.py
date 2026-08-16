from ...agents.market_intelligence_agent import MarketIntelligenceAgent

def market_intel_node(state):
    agent = MarketIntelligenceAgent()
    return agent.run(state)