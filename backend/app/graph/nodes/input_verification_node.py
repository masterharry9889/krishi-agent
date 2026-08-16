from ...agents.input_verification_agent import InputVerificationAgent

def input_verification_node(state):
    agent = InputVerificationAgent()
    return agent.run(state)