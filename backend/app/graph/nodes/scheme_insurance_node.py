from ...agents.scheme_insurance_agent import SchemeInsuranceAgent

def scheme_insurance_node(state):
    agent = SchemeInsuranceAgent()
    return agent.run(state)