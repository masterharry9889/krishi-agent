"""
Phase 7 Production Hardening & E2E Validation Test Suite.
Validates production readiness, real-world data handling, LLM error safety,
farmer context isolation, dependency engine, MongoDB upserts, and security.
"""
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from backend.main import app
from backend.app.db import FarmerService, FarmerInDB
from backend.app.agents.base_agent import BaseAgent
from backend.app.agents.registry import AGENT_REGISTRY

TEST_DB = "krishi_agent_phase7_test"


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
def farmer_a(fs):
    f = FarmerInDB(
        name="Farmer A (Hardening)",
        phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
        district="Nashik",
        language="mr",
        status="registered",
    )
    fs.create_farmer(f)
    return fs.get_by_farmer_id(f.farmer_id)


@pytest.fixture(scope="module")
def farmer_b(fs):
    f = FarmerInDB(
        name="Farmer B (Hardening)",
        phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
        district="Pune",
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


class TestFarmerIsolationAndSecurity:
    def test_farmer_a_cannot_use_farmer_b_season(self, client, farmer_a, farmer_b):
        """Farmer A using Farmer B's season_id MUST be rejected with 403 Forbidden."""
        from backend.main import create_farmer_token
        token_a = create_farmer_token(farmer_a["farmer_id"], farmer_a["season_id"])
        headers_a = {"Authorization": f"Bearer {token_a}"}
        r = client.post(
            f"/api/v1/farmers/{farmer_a['farmer_id']}/seasons/{farmer_b['season_id']}/agents/soil/run",
            headers=headers_a
        )
        assert r.status_code == 403, r.text

    def test_invalid_farmer_id_returns_404(self, client, farmer_a):
        from backend.main import create_farmer_token
        token_a = create_farmer_token(farmer_a["farmer_id"], farmer_a["season_id"])
        headers_a = {"Authorization": f"Bearer {token_a}"}
        r = client.post(
            f"/api/v1/farmers/invalid-farmer-uuid/seasons/{farmer_a['season_id']}/agents/soil/run",
            headers=headers_a
        )
        assert r.status_code in (403, 404), r.text

    def test_invalid_season_id_returns_404(self, client, farmer_a):
        from backend.main import create_farmer_token
        token_a = create_farmer_token(farmer_a["farmer_id"], farmer_a["season_id"])
        headers_a = {"Authorization": f"Bearer {token_a}"}
        r = client.post(
            f"/api/v1/farmers/{farmer_a['farmer_id']}/seasons/invalid-season-uuid/agents/soil/run",
            headers=headers_a
        )
        assert r.status_code in (403, 404), r.text

    def test_context_endpoint_isolation(self, client, farmer_a):
        from backend.main import create_farmer_token
        token_a = create_farmer_token(farmer_a["farmer_id"], farmer_a["season_id"])
        headers_a = {"Authorization": f"Bearer {token_a}"}
        r = client.get("/api/v1/farmers/invalid-farmer-uuid/context", headers=headers_a)
        assert r.status_code in (403, 404)


class TestMongoDBNoDuplicateOutputs:
    def test_rerunning_agent_replaces_output_without_duplicates(self, client, farmer_a, fs):
        """Re-running an agent should update the output in-place instead of creating duplicate entries."""
        from backend.main import create_farmer_token
        token_a = create_farmer_token(farmer_a["farmer_id"], farmer_a["season_id"])
        headers_a = {"Authorization": f"Bearer {token_a}"}
        # First run
        client.post(f"/api/v1/farmers/{farmer_a['farmer_id']}/seasons/{farmer_a['season_id']}/agents/soil/run", headers=headers_a)
        # Second run
        client.post(f"/api/v1/farmers/{farmer_a['farmer_id']}/seasons/{farmer_a['season_id']}/agents/soil/run", headers=headers_a)
        
        doc = fs.get_by_farmer_id(farmer_a["farmer_id"])
        soil_entries = [e for e in doc.get("agent_outputs", []) if e.get("agent") == "soil"]
        assert len(soil_entries) == 1, f"Expected 1 soil entry, got {len(soil_entries)}"


class TestFull14AgentExecutionPipeline:
    def test_complete_sequential_14_agent_pipeline(self, client, farmer_b, fs):
        from backend.main import create_farmer_token
        fid = farmer_b["farmer_id"]
        sid = farmer_b["season_id"]
        token_b = create_farmer_token(fid, sid)
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Run Phase 2 Diagnostics
        r_soil = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/soil/run", headers=headers_b)
        assert r_soil.status_code == 200
        assert r_soil.json()["status"] == "success"

        r_weather = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/weather/run", headers=headers_b)
        assert r_weather.status_code == 200

        r_intel = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/market_intelligence/run", headers=headers_b)
        assert r_intel.status_code == 200

        # Run Phase 3 Recommendation & Planning
        r_crop = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/crop_recommendation/run", headers=headers_b)
        assert r_crop.status_code == 200

        r_irr = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/irrigation/run", headers=headers_b)
        assert r_irr.status_code == 200

        r_bud = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/budget_estimator/run", headers=headers_b)
        assert r_bud.status_code == 200

        r_verify = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/input_verification/run", headers=headers_b)
        assert r_verify.status_code == 200

        # Run Phase 4 Risk & Credit
        r_ins = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/scheme_insurance/run", headers=headers_b)
        assert r_ins.status_code == 200

        r_cred = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/credit/run", headers=headers_b)
        assert r_cred.status_code == 200

        # Run Phase 5 Monitoring & Advisory
        r_mon = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/crop_monitoring/run", headers=headers_b)
        assert r_mon.status_code == 200

        r_adv = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/advisory/run", headers=headers_b)
        assert r_adv.status_code == 200

        # Run Phase 6 Harvest & Storage
        r_store = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/storage_sell_timing/run", headers=headers_b)
        assert r_store.status_code == 200

        # Run Phase 7 Market Linkage
        r_link = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/market_linkage/run", headers=headers_b)
        assert r_link.status_code == 200

        # Run Phase 8 Feedback
        r_fb = client.post(f"/api/v1/farmers/{fid}/seasons/{sid}/agents/feedback/run", headers=headers_b)
        assert r_fb.status_code == 200

        # Verify context load restores all 14 outputs
        r_ctx = client.get(f"/api/v1/farmers/{fid}/context", headers=headers_b)
        assert r_ctx.status_code == 200
        ctx_data = r_ctx.json()
        saved_agents = {e["agent"] for e in ctx_data.get("agent_outputs", [])}
        assert len(saved_agents) == 14, f"Expected 14 saved agents, found {len(saved_agents)}: {saved_agents}"


class TestLLMSafetyAndUnmockedFallback:
    def test_unmocked_mode_handles_api_failure_without_500(self, client, farmer_a):
        from backend.main import create_farmer_token
        token_a = create_farmer_token(farmer_a["farmer_id"], farmer_a["season_id"])
        headers_a = {"Authorization": f"Bearer {token_a}"}

        os.environ["USE_MOCK_TOOLS"] = "false"
        os.environ["GROQ_API_KEY"] = "invalid_test_key"

        # Soil Agent in unmocked mode with bad API key must return safe fallback output with status success or error
        r = client.post(f"/api/v1/farmers/{farmer_a['farmer_id']}/seasons/{farmer_a['season_id']}/agents/soil/run", headers=headers_a)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("success", "error")
        assert "ph" in data["output"] or data["status"] == "error"

        # Restore mock mode for remaining test suite
        os.environ["USE_MOCK_TOOLS"] = "true"
