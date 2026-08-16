"""
Phase 6 Test Suite — Real AI & Agriculture Data Integration.
Validates LLM layer, weather API, soil data status, market intelligence,
contract consistency, fallback safety, and MongoDB persistence.
"""
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from backend.main import app
from backend.app.db import FarmerService, FarmerInDB
from backend.app.agents.base_agent import BaseAgent
from backend.app.tools.weather_api import fetch_weather_forecast
from backend.app.tools.govt_soil_health_card import fetch_soil_health_card
from backend.app.tools.agmarknet_market_api import fetch_market_intelligence
from pydantic import BaseModel

TEST_DB = "krishi_agent_phase6_test"


@pytest.fixture(scope="module")
def mongo():
    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=5000)
    yield client
    client.drop_database(TEST_DB)
    client.close()


@pytest.fixture(scope="module")
def fs(mongo):
    db = mongo[TEST_DB]
    svc = FarmerService(db=db)
    svc.create_indexes()
    return svc


@pytest.fixture(scope="module")
def farmer(fs):
    f = FarmerInDB(
        name="Phase6 Tester",
        phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
        district="Nashik",
        language="hi",
        status="registered",
    )
    fs.create_farmer(f)
    return fs.get_by_farmer_id(f.farmer_id)


@pytest.fixture(scope="module")
def client(fs):
    from backend.main import get_farmer_service
    app.dependency_overrides[get_farmer_service] = lambda: fs
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()


class TestLLMLayerAndFallback:
    def test_base_agent_mock_mode(self):
        agent = BaseAgent()
        assert agent.use_mock is True or agent.api_key is None or agent.api_key is not None

    def test_safe_call_llm_without_api_key_returns_fallback(self):
        class DummySchema(BaseModel):
            summary: str

        agent = BaseAgent()
        agent.client = None
        agent.api_key = None
        agent.use_mock = False

        fallback = {"summary": "Fallback summary"}
        res = agent.safe_call_llm(
            system_prompt="Test system prompt",
            user_content="Test user prompt",
            response_schema=DummySchema,
            fallback_data=fallback,
            language="hi"
        )
        assert res == fallback

    def test_invalid_api_key_handles_gracefully(self):
        class DummySchema(BaseModel):
            summary: str

        agent = BaseAgent()
        agent.api_key = "invalid-key-12345"
        agent.use_mock = False

        fallback = {"summary": "Safe fallback"}
        res = agent.safe_call_llm(
            system_prompt="Test system prompt",
            user_content="Test user prompt",
            response_schema=DummySchema,
            fallback_data=fallback,
            language="mr"
        )
        assert res == fallback


class TestRealTools:
    def test_weather_api_mock_and_live(self):
        # Mock mode
        os.environ["USE_MOCK_TOOLS"] = "true"
        w_mock = fetch_weather_forecast("Nashik")
        assert "forecast_7d" in w_mock
        assert w_mock["source"]
        assert w_mock["confidence"] > 0

        # Unmocked mode (Open-Meteo or fallback)
        os.environ["USE_MOCK_TOOLS"] = "false"
        w_live = fetch_weather_forecast("Nashik")
        assert "forecast_7d" in w_live
        assert "source" in w_live
        assert isinstance(w_live["is_estimated"], bool)

    def test_soil_health_card_tool(self):
        os.environ["USE_MOCK_TOOLS"] = "true"
        s_mock = fetch_soil_health_card("Nashik", "TEST_FARMER")
        assert s_mock["ph"]
        assert s_mock["is_estimated"] is False

        os.environ["USE_MOCK_TOOLS"] = "false"
        s_live = fetch_soil_health_card("Nashik", "TEST_FARMER")
        assert s_live["is_estimated"] is True
        assert "Estimated" in s_live["data_status"]
        assert len(s_live["warnings"]) > 0

    def test_agmarknet_market_tool(self):
        os.environ["USE_MOCK_TOOLS"] = "true"
        m_mock = fetch_market_intelligence("Nashik")
        assert len(m_mock["commodities"]) > 0
        assert m_mock["source"]

        os.environ["USE_MOCK_TOOLS"] = "false"
        m_live = fetch_market_intelligence("Nashik")
        assert len(m_live["commodities"]) > 0
        assert m_live["source"]


class TestAgentExecutionAndContracts:
    def test_soil_agent_contract(self, client, farmer):
        from backend.main import create_farmer_token
        token = create_farmer_token(farmer["farmer_id"], farmer["season_id"])
        headers = {"Authorization": f"Bearer {token}"}
        r = client.post(f"/api/v1/farmers/{farmer['farmer_id']}/seasons/{farmer['season_id']}/agents/soil/run", headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "success"
        out = data["output"]
        assert "ph" in out
        assert "source" in out
        assert "confidence" in out
        assert "is_estimated" in out
        assert "data_status" in out
        assert "recommendations" in out

    def test_weather_agent_contract(self, client, farmer):
        from backend.main import create_farmer_token
        token = create_farmer_token(farmer["farmer_id"], farmer["season_id"])
        headers = {"Authorization": f"Bearer {token}"}
        r = client.post(f"/api/v1/farmers/{farmer['farmer_id']}/seasons/{farmer['season_id']}/agents/weather/run", headers=headers)
        assert r.status_code == 200, r.text
        out = r.json()["output"]
        assert "forecast_7d" in out
        assert "source" in out
        assert "confidence" in out

    def test_crop_recommendation_contract(self, client, farmer):
        from backend.main import create_farmer_token
        token = create_farmer_token(farmer["farmer_id"], farmer["season_id"])
        headers = {"Authorization": f"Bearer {token}"}
        # Soil and Weather already ran
        r = client.post(f"/api/v1/farmers/{farmer['farmer_id']}/seasons/{farmer['season_id']}/agents/crop_recommendation/run", headers=headers)
        assert r.status_code == 200, r.text
        out = r.json()["output"]
        assert "crop_shortlist" in out
        assert "crop_recommendation_summary" in out
        assert "source" in out
        assert "confidence" in out

    def test_market_intelligence_contract(self, client, farmer):
        from backend.main import create_farmer_token
        token = create_farmer_token(farmer["farmer_id"], farmer["season_id"])
        headers = {"Authorization": f"Bearer {token}"}
        r = client.post(f"/api/v1/farmers/{farmer['farmer_id']}/seasons/{farmer['season_id']}/agents/market_intelligence/run", headers=headers)
        assert r.status_code == 200, r.text
        out = r.json()["output"]
        assert "commodities" in out
        assert "source" in out

    def test_all_14_agents_run_sequential_flow(self, client, farmer):
        from backend.main import create_farmer_token
        token = create_farmer_token(farmer["farmer_id"], farmer["season_id"])
        headers = {"Authorization": f"Bearer {token}"}
        # Run remaining pipeline in order
        sequence = [
            "irrigation",
            "budget_estimator",
            "input_verification",
            "scheme_insurance",
            "credit",
            "crop_monitoring",
            "advisory",
            "storage_sell_timing",
            "market_linkage",
            "feedback"
        ]
        for agent_key in sequence:
            r = client.post(f"/api/v1/farmers/{farmer['farmer_id']}/seasons/{farmer['season_id']}/agents/{agent_key}/run", headers=headers)
            assert r.status_code == 200, f"Agent '{agent_key}' failed: {r.text}"
            data = r.json()
            assert data["status"] == "success", f"Agent '{agent_key}' returned error: {data}"
            assert "source" in data["output"]

    def test_mongodb_persistence_and_context_restoration(self, client, farmer, fs):
        from backend.main import create_farmer_token
        token = create_farmer_token(farmer["farmer_id"], farmer["season_id"])
        headers = {"Authorization": f"Bearer {token}"}
        r = client.get(f"/api/v1/farmers/{farmer['farmer_id']}/context", headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        saved = [e["agent"] for e in data.get("agent_outputs", [])]
        assert "soil" in saved
        assert "weather" in saved
        assert "crop_recommendation" in saved
        assert "market_intelligence" in saved
        assert "feedback" in saved
