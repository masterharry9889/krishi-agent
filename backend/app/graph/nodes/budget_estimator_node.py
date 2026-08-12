from ..agents.budget_estimator_agent import BudgetEstimatorAgent

def budget_estimator_node(state):
    agent = BudgetEstimatorAgent()
    return agent.run(state)