# Test script to verify that agents can be imported and instantiated without errors.
# We'll also test the graph building (without running it) to ensure no syntax errors.

import sys
import os

# Add the root directory (krishi-agent) to the path so we can import from backend.app
sys.path.insert(0, os.path.dirname(__file__))

def test_agents():
    print("Testing agent imports...")
    try:
        from backend.app.agents.farmer_interface_agent import FarmerInterfaceAgent
        from backend.app.agents.soil_agent import SoilAgent
        from backend.app.agents.weather_agent import WeatherAgent
        from backend.app.agents.market_intelligence_agent import MarketIntelligenceAgent
        from backend.app.agents.crop_recommendation_agent import CropRecommendationAgent
        from backend.app.agents.resource_irrigation_agent import ResourceIrrigationAgent
        from backend.app.agents.budget_estimator_agent import BudgetEstimatorAgent
        from backend.app.agents.input_verification_agent import InputVerificationAgent
        from backend.app.agents.scheme_insurance_agent import SchemeInsuranceAgent
        from backend.app.agents.credit_agent import CreditAgent
        from backend.app.agents.crop_monitoring_agent import CropMonitoringAgent
        from backend.app.agents.advisory_agent import AdvisoryAgent
        from backend.app.agents.storage_selltiming_agent import StorageSellTimingAgent
        from backend.app.agents.direct_market_linkage_agent import DirectMarketLinkageAgent
        from backend.app.agents.feedback_agent import FeedbackAgent
        print("All agents imported successfully.")
    except Exception as e:
        print(f"Error importing agents: {e}")
        return False

    print("\nTesting agent instantiation...")
    try:
        FarmerInterfaceAgent()
        SoilAgent()
        WeatherAgent()
        MarketIntelligenceAgent()
        CropRecommendationAgent()
        ResourceIrrigationAgent()
        BudgetEstimatorAgent()
        InputVerificationAgent()
        SchemeInsuranceAgent()
        CreditAgent()
        CropMonitoringAgent()
        AdvisoryAgent()
        StorageSellTimingAgent()
        DirectMarketLinkageAgent()
        FeedbackAgent()
        print("All agents instantiated successfully.")
    except Exception as e:
        print(f"Error instantiating agents: {e}")
        return False

    print("\nTesting graph build (import only)...")
    try:
        from backend.app.graph.build_graph import build_graph
        # We don't actually build the graph because we don't have a checkpointer set up.
        # But we can import the function to see if there are any syntax errors.
        print("Graph build function imported successfully.")
    except Exception as e:
        print(f"Error importing graph build: {e}")
        return False

    print("\nTesting state import...")
    try:
        from backend.app.graph.state import FarmerState
        print("FarmerState imported successfully.")
    except Exception as e:
        print(f"Error importing FarmerState: {e}")
        return False

    return True

if __name__ == "__main__":
    if test_agents():
        print("\nAll tests passed!")
        sys.exit(0)
    else:
        print("\nSome tests failed.")
        sys.exit(1)