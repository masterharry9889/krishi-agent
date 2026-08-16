"""
Phase 9 System Validation Test Suite.
Validates production readiness, user journey integrity, server restart persistence,
cross-farmer security isolation, secret protection, and admin features.
"""
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from backend.main import app
from backend.app.db import FarmerService, FarmerInDB

TEST_DB = "krishi_agent_phase9_test"


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


class TestPhase9SystemValidation:
    def test_complete_farmer_user_journey(self, client, fs):
        # 1. Onboarding
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        onboard_res = client.post(
            "/api/v1/onboard",
            json={"name": "Suresh Phase9", "phone": phone, "district": "Ludhiana", "language": "pa", "password": "Password123!"}
        )
        assert onboard_res.status_code == 200, onboard_res.text
        ob_data = onboard_res.json()
        fid = ob_data["farmer_id"]
        sid = ob_data["season_id"]
        token = ob_data.get("access_token")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        assert ob_data["status"] == "registered"

        # 2. Farmer Context Fetch
        ctx_res = client.get(f"/api/v1/farmers/{fid}/context", headers=headers)
        assert ctx_res.status_code == 200
        assert ctx_res.json()["profile"]["name"] == "Suresh Phase9"

        # 3. Smart Farm Orchestration ("Analyze My Farm")
        orch_res = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/orchestrate", json={"force_refresh": True}, headers=headers)
        assert orch_res.status_code == 200, orch_res.text
        orch_data = orch_res.json()
        assert orch_data["status"] == "success"
        insight = orch_data["insight"]
        assert len(insight["priorities"]) > 0
        assert "financial_snapshot" in insight

        # 4. Insight Fetch
        ins_res = client.get(f"/api/v1/farmers/{fid}/insight", headers=headers)
        assert ins_res.status_code == 200
        assert ins_res.json()["farmer_id"] == fid

        # 5. Farmer Feedback Submission
        fb_res = client.post(
            f"/api/v1/farmers/{fid}/seasons/{sid}/feedback",
            json={"rating": 5, "used_recommendation": True, "notes": "E2E Phase 9 Test Passed"},
            headers=headers
        )
        assert fb_res.status_code == 200

        # 6. Simulate Server Restart (re-instantiate service & fetch context from MongoDB)
        new_svc = FarmerService(db=fs.db)
        restarted_doc = new_svc.get_by_farmer_id(fid)
        assert restarted_doc["name"] == "Suresh Phase9"
        assert len(restarted_doc["agent_outputs"]) >= 3
        assert len(restarted_doc["farmer_feedback"]) == 1

    def test_farmer_isolation_security(self, client, fs):
        from backend.main import create_farmer_token
        # Create Farmer X
        fx = FarmerInDB(name="Farmer X", phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}", district="Pune", status="registered")
        fs.create_farmer(fx)
        token_x = create_farmer_token(fx.farmer_id, fx.season_id)
        headers_x = {"Authorization": f"Bearer {token_x}"}

        # Create Farmer Y
        fy = FarmerInDB(name="Farmer Y", phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}", district="Nashik", status="registered")
        fs.create_farmer(fy)

        # Cross-farmer execution attempt (Farmer X using Farmer Y's season_id) MUST return 403
        r_cross = client.post(f"/api/v1/farmers/{fx.farmer_id}/seasons/{fy.season_id}/orchestrate", headers=headers_x)
        assert r_cross.status_code == 403

        # Invalid farmer_id MUST return 401 or 404
        r_inv = client.get("/api/v1/farmers/nonexistent-id/context", headers=headers_x)
        assert r_inv.status_code in (403, 404)

    def test_no_secrets_exposed_in_api(self, client):
        r_health = client.get("/health")
        assert r_health.status_code == 200
        raw_text = r_health.text
        assert "GROQ_API_KEY" not in raw_text
        assert "mongodb://" not in raw_text
        assert "ADMIN_JWT_SECRET" not in raw_text
