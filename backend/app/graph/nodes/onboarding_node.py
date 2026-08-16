# Node: onboarding
from ...agents.farmer_interface_agent import FarmerInterfaceAgent

def onboarding_node(state: dict) -> dict:
    """Executes the FarmerInterfaceAgent to validate and standardize farmer profile data."""
    agent = FarmerInterfaceAgent()
    return agent.run(state)