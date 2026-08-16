"""
Phase 8 Decision Platform Test Suite.
Validates FarmerInsightService, Priority Engine, Alert System, Smart Agent Orchestrator,
Farmer Feedback Loop, and API routes.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from backend.main import app
from backend.app.db import FarmerService, FarmerInDB
from backend.app.services.farmer_insight_service import FarmerInsightService, is_agent_fresh
from backend.app.services.agent_orchestrator import AgentOrchestrator

TEST_DB = "krishi_agent_phase8_test"


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
def farmer_p8(fs):
    f = FarmerInDB(
        name="Phase 8 Farmer",
        phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
        district="Ludhiana",
        language="pa",
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


class TestFarmerInsightService:
    def test_insight_generation_initial_state(self, farmer_p8):
        state = {
            "farmer_id": farmer_p8["farmer_id"],
            "season_id": farmer_p8["season_id"],
            "profile": {"district": "Ludhiana", "language": "pa", "land_size": 2.5},
        }
        insight = FarmerInsightService.generate_insight(state)
        assert insight["district"] == "Ludhiana"
        assert len(insight["priorities"]) > 0
        assert "timeline" in insight
        assert insight["timeline"]["current_phase"] == "SOIL CHECK"

    def test_insight_generation_with_outputs(self, farmer_p8):
        state = {
            "farmer_id": farmer_p8["farmer_id"],
            "season_id": farmer_p8["season_id"],
            "profile": {"district": "Ludhiana", "language": "pa", "land_size": 2.5},
            "soil_report": {
                "status": "success",
                "nitrogen_status": "low",
                "ph": 6.5,
                "soil_type": "alluvial",
                "source": "Soil Health Card",
            },
            "weather_outlook": {
                "status": "success",
                "total_7d_rain_mm": 65,
                "average_temp_c": 32,
                "source": "Open-Meteo Weather API",
            },
            "market_intel": {
                "status": "success",
                "commodities": [
                    {"crop": "Wheat", "mandi": "Ludhiana APMC", "modal_price_inr": 2350, "price_trend": "rising"}
                ],
                "source": "Agmarknet Mandi Feed",
            },
            "crop_shortlist": [
                {
                    "crop": "Wheat",
                    "variety_suggestions": ["PBW 550"],
                    "total_score": 0.92,
                    "reasoning": "High suitability for Ludhiana alluvial soil.",
                }
            ],
        }
        insight = FarmerInsightService.generate_insight(state)

        # Check priorities & weather actions
        prios = [p["title"] for p in insight["priorities"]]
        assert any("Heavy Rain" in p for p in prios)
        assert any("Nitrogen" in p for p in prios)

        assert insight["market_decision"]["crop"] == "Wheat"
        assert insight["crop_decision"]["recommended_crop"] == "Wheat"
        assert insight["timeline"]["current_phase"] == "INPUT PLANNING"


class TestAgentOrchestrator:
    def test_smart_orchestrator(self, client, farmer_p8):
        from backend.main import create_farmer_token
        fid = farmer_p8["farmer_id"]
        sid = farmer_p8["season_id"]
        token = create_farmer_token(fid, sid)
        headers = {"Authorization": f"Bearer {token}"}

        r = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/orchestrate", json={"force_refresh": True}, headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "success"
        assert "insight" in data
        assert len(data["insight"]["source_agents"]) >= 3

    def test_get_farmer_insight_endpoint(self, client, farmer_p8):
        from backend.main import create_farmer_token
        fid = farmer_p8["farmer_id"]
        sid = farmer_p8["season_id"]
        token = create_farmer_token(fid, sid)
        headers = {"Authorization": f"Bearer {token}"}

        r = client.get(f"/api/v1/farmers/{fid}/insight", headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["farmer_id"] == fid
        assert "insight" in data


class TestFarmerFeedback:
    def test_submit_feedback_endpoint(self, client, farmer_p8, fs):
        from backend.main import create_farmer_token
        fid = farmer_p8["farmer_id"]
        sid = farmer_p8["season_id"]
        token = create_farmer_token(fid, sid)
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "rating": 5,
            "used_recommendation": True,
            "actual_yield": 45.0,
            "actual_price": 2400.0,
            "notes": "Excellent Wheat crop yield this season!",
        }
        r = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/feedback", json=payload, headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "success"

        # Verify persisted in MongoDB
        doc = fs.get_by_farmer_id(fid)
        fbs = doc.get("farmer_feedback", [])
        assert len(fbs) == 1
        assert fbs[0]["rating"] == 5
        assert fbs[0]["actual_yield"] == 45.0

    def test_cross_farmer_feedback_rejected(self, client, farmer_p8):
        fid = farmer_p8["farmer_id"]
        wrong_sid = str(uuid.uuid4())

        payload = {"rating": 4, "used_recommendation": True}
        r = client.post(f"/api/v1/farmers/{fid}/seasons/{wrong_sid}/feedback", json=payload)
        assert r.status_code in (401, 403)
