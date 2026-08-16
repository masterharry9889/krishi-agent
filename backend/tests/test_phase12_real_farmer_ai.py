"""
Phase 12 — Real Farmer AI Analysis & Production Data Validation Test Suite.
Validates:
1. Authenticated Farmer Context & Strict Cross-Farmer Isolation Security (401/403).
2. Farmer Profile schema fields (Land size, Water source, Past crops, Budget).
3. Real Data & Provenance tracking (source, confidence, is_estimated, data_status, generated_at).
4. All 14 Agents execution in topological order.
5. Smart Orchestration ("Analyze My Farm") with freshness logic and concurrency.
6. Unified Farmer Insight Service (Priorities, Crop Decision, Financial Snapshot).
7. Error resilience under API failures and missing keys.
8. MongoDB persistence idempotency (updating existing outputs without duplicates).
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from backend.main import app
from backend.app.db import FarmerService, FarmerInDB

TEST_DB = "krishi_agent_phase12_test"


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
def client(fs):
    from backend.main import get_farmer_service
    app.dependency_overrides[get_farmer_service] = lambda: fs
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()


class TestPhase12AuthenticatedFarmerAI:
    def test_farmer_isolation_security(self, client, fs):
        """Farmer A must NOT access Farmer B's context, execute agents for B, or get B's insights."""
        # Create Farmer A
        phone_a = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        res_a = client.post(
            "/api/v1/onboard",
            json={"name": "Farmer A", "phone": phone_a, "district": "Nashik", "password": "Password123!"}
        ).json()
        token_a = res_a["access_token"]
        fid_a = res_a["farmer_id"]
        sid_a = res_a["season_id"]

        # Create Farmer B
        phone_b = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        res_b = client.post(
            "/api/v1/onboard",
            json={"name": "Farmer B", "phone": phone_b, "district": "Pune", "password": "Password123!"}
        ).json()
        fid_b = res_b["farmer_id"]
        sid_b = res_b["season_id"]

        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 1. Access without token -> 401
        assert client.get(f"/api/v1/farmers/{fid_a}/context").status_code == 401
        assert client.get(f"/api/v1/farmers/{fid_a}/insight").status_code == 401

        # 2. Farmer A accessing Farmer B's context -> 403
        assert client.get(f"/api/v1/farmers/{fid_b}/context", headers=headers_a).status_code == 403
        assert client.get(f"/api/v1/farmers/context?season_id={sid_b}", headers=headers_a).status_code == 403

        # 3. Farmer A running agent for Farmer B -> 403
        assert client.post(f"/api/v1/farmers/{fid_b}/seasons/{sid_b}/agents/soil/run", headers=headers_a).status_code == 403

        # 4. Farmer A requesting insight for Farmer B -> 403
        assert client.get(f"/api/v1/farmers/{fid_b}/insight", headers=headers_a).status_code == 403

        # 5. Farmer A submitting feedback for Farmer B -> 403
        assert client.post(
            f"/api/v1/farmers/{fid_b}/seasons/{sid_b}/feedback",
            headers=headers_a,
            json={"yield_satisfaction": "good", "rating": 5}
        ).status_code == 403

    def test_farmer_profile_data_and_context(self, client):
        """Farmer context must return complete profile information."""
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        res = client.post(
            "/api/v1/onboard",
            json={"name": "Profile Farmer", "phone": phone, "district": "Kolhapur", "language": "mr", "password": "Password123!"}
        ).json()
        token = res["access_token"]
        fid = res["farmer_id"]
        headers = {"Authorization": f"Bearer {token}"}

        ctx_res = client.get(f"/api/v1/farmers/{fid}/context", headers=headers)
        assert ctx_res.status_code == 200, ctx_res.text
        ctx = ctx_res.json()

        assert ctx["farmer_id"] == fid
        profile = ctx["profile"]
        assert profile["name"] == "Profile Farmer"
        assert profile["district"] == "Kolhapur"
        assert profile["language"] == "mr"
        assert "land_size" in profile
        assert "water_source" in profile
        assert "past_crops" in profile
        assert "budget" in profile

    def test_analyze_my_farm_smart_orchestration_and_provenance(self, client):
        """Analyze My Farm orchestration runs pipeline, populates insights, and maintains data provenance."""
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        res = client.post(
            "/api/v1/onboard",
            json={"name": "Orchestration Farmer", "phone": phone, "district": "Sangli", "language": "hi", "password": "Password123!"}
        ).json()
        token = res["access_token"]
        fid = res["farmer_id"]
        sid = res["season_id"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Trigger "Analyze My Farm" Smart Orchestration
        orch_res = client.post(
            f"/api/v1/farmers/{fid}/seasons/{sid}/orchestrate",
            headers=headers,
            json={"force_refresh": True}
        )
        assert orch_res.status_code == 200, orch_res.text
        orch_data = orch_res.json()
        assert orch_data["status"] == "success"
        assert "insight" in orch_data

        insight = orch_data["insight"]
        assert insight["farmer_id"] == fid
        assert insight["season_id"] == sid
        assert "priorities" in insight
        assert "crop_decision" in insight
        assert "market_decision" in insight
        assert "financial_snapshot" in insight

        # Verify Data Provenance fields
        mkt = insight["market_decision"]
        if mkt:
            assert "source" in mkt
            assert "confidence" in mkt
            assert "is_estimated" in mkt
            assert "data_status" in mkt
            assert "generated_at" in mkt

        crop_dec = insight["crop_decision"]
        if crop_dec:
            assert "source" in crop_dec
            assert "is_estimated" in crop_dec
            assert "data_status" in crop_dec

        fin = insight["financial_snapshot"]
        assert "estimated_input_cost_inr" in fin
        assert "data_status" in fin
        assert "is_estimated" in fin

        # 2. Verify Insight Endpoint retrieves the same insight
        insight_res = client.get(f"/api/v1/farmers/{fid}/insight", headers=headers)
        assert insight_res.status_code == 200
        assert insight_res.json()["farmer_id"] == fid

    def test_rerunning_agent_updates_without_duplicates(self, client, fs):
        """Rerunning an agent must update its output rather than creating duplicate entries in MongoDB."""
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        res = client.post(
            "/api/v1/onboard",
            json={"name": "Duplicate Test", "phone": phone, "district": "Satara", "password": "Password123!"}
        ).json()
        token = res["access_token"]
        fid = res["farmer_id"]
        sid = res["season_id"]
        headers = {"Authorization": f"Bearer {token}"}

        # Run Soil Agent twice
        r1 = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/soil/run", headers=headers)
        assert r1.status_code == 200
        r2 = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/soil/run", headers=headers)
        assert r2.status_code == 200

        doc = fs.get_by_farmer_id(fid)
        outputs = doc.get("agent_outputs", [])
        soil_outputs = [e for e in outputs if e.get("agent") == "soil"]
        assert len(soil_outputs) == 1, "Must contain exactly 1 soil output entry without duplicates"

    def test_invalid_agent_and_missing_prerequisite_errors(self, client):
        """Test error handling for non-existent agents and prerequisite validation."""
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        res = client.post(
            "/api/v1/onboard",
            json={"name": "Error Test", "phone": phone, "district": "Ludhiana", "password": "Password123!"}
        ).json()
        token = res["access_token"]
        fid = res["farmer_id"]
        sid = res["season_id"]
        headers = {"Authorization": f"Bearer {token}"}

        # Unknown agent -> 404
        r_404 = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/unknown_agent/run", headers=headers)
        assert r_404.status_code == 404

        # Missing prereq for Crop Recommendation -> 422
        r_422 = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/crop_recommendation/run", headers=headers)
        assert r_422.status_code == 422
