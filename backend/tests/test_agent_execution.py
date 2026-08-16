"""Phase 5 tests — agent execution endpoint with full pipeline.

Tests the complete agent execution flow:
  - All implemented agents execute successfully
  - Dependency enforcement works (prerequisites must be met)
  - Results persist to MongoDB and restore on context reload
  - Invalid farmer_id / season_id / mismatch are rejected
  - Agent status endpoint works
  - Registry endpoint works

Run with: cd ~/krishi-agent && source venv/bin/activate && USE_MOCK_TOOLS=true python3 -m pytest backend/tests/test_agent_execution.py -v
"""
import pytest
import uuid
from fastapi.testclient import TestClient
from pymongo import MongoClient

from backend.main import app, create_farmer_token
from backend.app.db import FarmerService, FarmerInDB
from backend.app.agents.registry import AGENT_REGISTRY, resolve_agent_key


TEST_DB = "krishi_agent_phase5_test"


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
        name="Phase5 Tester",
        phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
        district="Nashik",
        language="mr",
        status="registered",
    )
    fs.create_farmer(f)
    return fs.get_by_farmer_id(f.farmer_id)


@pytest.fixture(scope="module")
def farmer_headers(farmer):
    token = create_farmer_token(farmer["farmer_id"], farmer["season_id"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def client(fs):
    from backend.main import get_farmer_service
    app.dependency_overrides[get_farmer_service] = lambda: fs
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()


def run_agent(client, farmer_id, season_id, agent_name, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        try:
            tok = create_farmer_token(farmer_id, season_id)
            headers["Authorization"] = f"Bearer {tok}"
        except Exception:
            pass
    return client.post(
        f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/{agent_name}/run",
        headers=headers,
    )


# ─── Validation Tests ──────────────────────────────────────────────
class TestFarmerValidation:
    def test_invalid_farmer_id_returns_404(self, client, farmer):
        r = run_agent(client, "bad-farmer-id", farmer["season_id"], "soil")
        assert r.status_code == 404, r.text

    def test_invalid_season_id_returns_404(self, client, farmer):
        r = run_agent(client, farmer["farmer_id"], "bad-season-id", "soil")
        assert r.status_code == 404, r.text

    def test_mismatched_season_returns_403(self, client, farmer, fs):
        other = FarmerInDB(
            name="Other Farmer",
            phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
            district="Pune",
            language="hi",
            status="registered",
        )
        fs.create_farmer(other)
        other_doc = fs.get_by_farmer_id(other.farmer_id)
        r = run_agent(client, farmer["farmer_id"], other_doc["season_id"], "soil")
        assert r.status_code == 403, r.text
        assert "does not belong" in r.json()["detail"].lower()

    def test_unknown_agent_returns_404(self, client, farmer):
        r = run_agent(client, farmer["farmer_id"], farmer["season_id"], "nonexistent_agent")
        assert r.status_code == 404, r.text


# ─── Registry Endpoint Tests ──────────────────────────────────────
class TestRegistryEndpoint:
    def test_list_agents(self, client):
        r = client.get("/api/v1/agents")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "soil" in data
        assert "weather" in data
        assert "crop_recommendation" in data
        assert data["soil"]["display_name"] == "Soil Analysis"
        assert data["soil"]["implemented"] is True
        assert data["crop_recommendation"]["dependencies"] == ["soil", "weather"]

    def test_agent_aliases(self):
        # Old alias names should resolve to canonical keys
        assert resolve_agent_key("insurance") == "scheme_insurance"
        assert resolve_agent_key("storage") == "storage_sell_timing"
        assert resolve_agent_key("monitoring") == "crop_monitoring"
        # Canonical keys resolve to themselves
        assert resolve_agent_key("soil") == "soil"


def get_context(client, farmer_id, season_id=None):
    tok = create_farmer_token(farmer_id, season_id or str(uuid.uuid4()))
    return client.get(f"/api/v1/farmers/{farmer_id}/context", headers={"Authorization": f"Bearer {tok}"})


def get_status(client, farmer_id, season_id):
    tok = create_farmer_token(farmer_id, season_id)
    return client.get(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/status", headers={"Authorization": f"Bearer {tok}"})


# ─── Agent Status Endpoint Tests ─────────────────────────────────
class TestAgentStatusEndpoint:
    def test_status_invalid_farmer_404(self, client):
        r = get_status(client, "nonexistent", "xyz")
        assert r.status_code == 404, r.text

    def test_status_farmer_no_outputs(self, client, fs):
        f = FarmerInDB(
            name="Status Test",
            phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
            district="Delhi",
            language="hi",
            status="registered",
        )
        fs.create_farmer(f)
        r = get_status(client, f.farmer_id, f.season_id)
        assert r.status_code == 200, r.text
        data = r.json()
        # soil and weather should be idle (no deps, no output)
        assert data["soil"]["status"] == "idle"
        assert data["weather"]["status"] == "idle"
        # crop_recommendation should be blocked (needs soil + weather)
        assert data["crop_recommendation"]["status"] == "blocked"

    def test_status_after_soil_run(self, client, farmer, fs):
        run_agent(client, farmer["farmer_id"], farmer["season_id"], "soil")
        r = get_status(client, farmer["farmer_id"], farmer["season_id"])
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["soil"]["status"] == "success"


# ─── Soil Agent Tests ─────────────────────────────────────────────
class TestSoilAgent:
    def test_soil_runs_successfully(self, client, farmer):
        r = run_agent(client, farmer["farmer_id"], farmer["season_id"], "soil")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["agent"] == "soil"
        assert data["status"] == "success"
        assert isinstance(data["output"], dict)
        assert len(data["output"]) > 0

    def test_soil_output_has_expected_fields(self, client, farmer):
        r = run_agent(client, farmer["farmer_id"], farmer["season_id"], "soil")
        output = r.json()["output"]
        assert "ph" in output or "soil_type" in output

    def test_soil_saved_to_mongodb(self, client, farmer, fs):
        run_agent(client, farmer["farmer_id"], farmer["season_id"], "soil")
        doc = fs.get_by_farmer_id(farmer["farmer_id"])
        agents = [e["agent"] for e in doc.get("agent_outputs", [])]
        assert "soil" in agents


# ─── Weather Agent Tests ──────────────────────────────────────────
class TestWeatherAgent:
    def test_weather_runs_successfully(self, client, farmer):
        r = run_agent(client, farmer["farmer_id"], farmer["season_id"], "weather")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["agent"] == "weather"
        assert data["status"] == "success"

    def test_weather_output_has_forecast(self, client, farmer):
        r = run_agent(client, farmer["farmer_id"], farmer["season_id"], "weather")
        output = r.json()["output"]
        assert "forecast_7d" in output

    def test_weather_saved_to_mongodb(self, client, farmer, fs):
        run_agent(client, farmer["farmer_id"], farmer["season_id"], "weather")
        doc = fs.get_by_farmer_id(farmer["farmer_id"])
        agents = [e["agent"] for e in doc.get("agent_outputs", [])]
        assert "weather" in agents


# ─── Crop Recommendation Tests ────────────────────────────────────
class TestCropRecommendationAgent:
    def test_no_prereqs_returns_422(self, client, fs):
        fresh = FarmerInDB(
            name="Fresh Farmer",
            phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
            district="Nagpur",
            language="hi",
            status="registered",
        )
        fs.create_farmer(fresh)
        doc = fs.get_by_farmer_id(fresh.farmer_id)
        r = run_agent(client, doc["farmer_id"], doc["season_id"], "crop_recommendation")
        assert r.status_code == 422, r.text
        assert "Soil" in r.json()["detail"] and "Weather" in r.json()["detail"]

    def test_after_soil_and_weather(self, client, farmer):
        r = run_agent(client, farmer["farmer_id"], farmer["season_id"], "crop_recommendation")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "success"
        assert "crop_shortlist" in data["output"]

    def test_saved_to_mongodb(self, client, farmer, fs):
        doc = fs.get_by_farmer_id(farmer["farmer_id"])
        agents = [e["agent"] for e in doc.get("agent_outputs", [])]
        assert "crop_recommendation" in agents


# ─── Full Pipeline Tests ──────────────────────────────────────────
class TestFullPipeline:
    def test_complete_pipeline(self, client, fs):
        """Run soil → weather → crop_recommendation → irrigation → market_intel
        → budget → input_verification → scheme_insurance → credit
        → crop_monitoring → advisory → storage_sell_timing → market_linkage → feedback"""
        # Register a fresh farmer
        f = FarmerInDB(
            name="Pipeline Farmer",
            phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
            district="Pune",
            language="hi",
            status="registered",
        )
        fs.create_farmer(f)
        doc = fs.get_by_farmer_id(f.farmer_id)
        fid = doc["farmer_id"]
        sid = doc["season_id"]

        # Phase 2: Diagnostics (soil, weather, market_intelligence — all independent)
        for agent in ["soil", "weather", "market_intelligence"]:
            r = run_agent(client, fid, sid, agent)
            assert r.status_code == 200, f"{agent}: {r.text}"
            assert r.json()["status"] == "success", f"{agent}: {r.text}"

        # Phase 3: crop_recommendation (needs soil + weather)
        r = run_agent(client, fid, sid, "crop_recommendation")
        assert r.status_code == 200, f"crop_recommendation: {r.text}"
        assert "crop_shortlist" in r.json()["output"]

        # irrigation (needs soil + weather + crop_recommendation)
        r = run_agent(client, fid, sid, "irrigation")
        assert r.status_code == 200, f"irrigation: {r.text}"
        assert r.json()["status"] == "success"

        # Phase 4: budget (needs irrigation + crop_recommendation)
        r = run_agent(client, fid, sid, "budget_estimator")
        assert r.status_code == 200, f"budget_estimator: {r.text}"

        # input_verification (needs budget_estimator)
        r = run_agent(client, fid, sid, "input_verification")
        assert r.status_code == 200, f"input_verification: {r.text}"

        # scheme_insurance (needs input_verification + crop_recommendation)
        r = run_agent(client, fid, sid, "insurance")
        assert r.status_code == 200, f"insurance: {r.text}"

        # credit (needs budget_estimator + scheme_insurance)
        r = run_agent(client, fid, sid, "credit")
        assert r.status_code == 200, f"credit: {r.text}"

        # Phase 5: monitoring (needs crop_recommendation)
        r = run_agent(client, fid, sid, "crop_monitoring")
        assert r.status_code == 200, f"crop_monitoring: {r.text}"

        # advisory (needs crop_monitoring + weather)
        r = run_agent(client, fid, sid, "advisory")
        assert r.status_code == 200, f"advisory: {r.text}"

        # Phase 6: storage_sell_timing (needs crop_monitoring + market_intelligence)
        r = run_agent(client, fid, sid, "storage")
        assert r.status_code == 200, f"storage: {r.text}"

        # Phase 7: market_linkage (needs storage_sell_timing + crop_recommendation)
        r = run_agent(client, fid, sid, "market_linkage")
        assert r.status_code == 200, f"market_linkage: {r.text}"

        # Phase 8: feedback (needs market_linkage)
        r = run_agent(client, fid, sid, "feedback")
        assert r.status_code == 200, f"feedback: {r.text}"

        # Verify all 14 agents persisted in MongoDB
        doc = fs.get_by_farmer_id(fid)
        agents_run = [e["agent"] for e in doc.get("agent_outputs", [])]
        expected = {
            "soil", "weather", "market_intelligence", "crop_recommendation",
            "irrigation", "budget_estimator", "input_verification",
            "scheme_insurance", "credit", "crop_monitoring", "advisory",
            "storage_sell_timing", "market_linkage", "feedback",
        }
        assert expected.issubset(set(agents_run)), f"Missing: {expected - set(agents_run)}"


# ─── Persistence / Recovery Tests ─────────────────────────────────
class TestContextPersistence:
    def test_context_returns_saved_agent_outputs(self, client, farmer, fs):
        run_agent(client, farmer["farmer_id"], farmer["season_id"], "soil")
        run_agent(client, farmer["farmer_id"], farmer["season_id"], "weather")
        r = get_context(client, farmer["farmer_id"], farmer["season_id"])
        assert r.status_code == 200, r.text
        data = r.json()
        agents = [e["agent"] for e in data.get("agent_outputs", [])]
        assert "soil" in agents
        assert "weather" in agents

    def test_context_invalid_farmer_returns_404(self, client):
        r = get_context(client, "nonexistent-farmer-id")
        assert r.status_code == 404

    def test_refresh_restores_results(self, client, fs):
        """Simulate refresh: register, run agents, fetch context — all results present."""
        f = FarmerInDB(
            name="Refresh Test",
            phone=f"+91{uuid.uuid4().int % 10_000_000_000:010d}",
            district="Hyderabad",
            language="te",
            status="registered",
        )
        fs.create_farmer(f)
        doc = fs.get_by_farmer_id(f.farmer_id)

        run_agent(client, doc["farmer_id"], doc["season_id"], "soil")
        run_agent(client, doc["farmer_id"], doc["season_id"], "weather")
        run_agent(client, doc["farmer_id"], doc["season_id"], "crop_recommendation")

        # Simulate "refresh" — load context from MongoDB (fresh query)
        r = get_context(client, doc["farmer_id"], doc["season_id"])
        assert r.status_code == 200, r.text
        data = r.json()
        agents = [e["agent"] for e in data.get("agent_outputs", [])]
        assert "soil" in agents
        assert "weather" in agents
        assert "crop_recommendation" in agents
        # Verify soil output contains pH data
        soil_output = next(e["output"] for e in data["agent_outputs"] if e["agent"] == "soil")
        assert "ph" in soil_output
        # Verify crop shortlist present
        crop_output = next(e["output"] for e in data["agent_outputs"] if e["agent"] == "crop_recommendation")
        assert "crop_shortlist" in crop_output


# ─── Alias Compatibility Tests ────────────────────────────────────
class TestAgentAliases:
    def test_insurance_alias_works(self, client, farmer, fs):
        """The old alias 'insurance' should resolve to 'scheme_insurance'."""
        # Need prerequisites: soil, weather, crop_recommendation, irrigation,
        # budget_estimator, input_verification
        for agent in ["soil", "weather", "crop_recommendation", "irrigation", "budget_estimator", "input_verification"]:
            run_agent(client, farmer["farmer_id"], farmer["season_id"], agent)
        r = run_agent(client, farmer["farmer_id"], farmer["season_id"], "insurance")
        assert r.status_code == 200, r.text
        assert r.json()["agent"] == "scheme_insurance"
        assert r.json()["status"] == "success"

    def test_storage_alias_works(self, client, farmer, fs):
        """The old alias 'storage' should resolve to 'storage_sell_timing'."""
        # Need prerequisites: crop_monitoring, market_intelligence
        for agent in ["crop_monitoring", "market_intelligence"]:
            run_agent(client, farmer["farmer_id"], farmer["season_id"], agent)
        r = run_agent(client, farmer["farmer_id"], farmer["season_id"], "storage_sell_timing")
        assert r.status_code == 200, r.text
        assert r.json()["agent"] == "storage_sell_timing"

        r2 = run_agent(client, farmer["farmer_id"], farmer["season_id"], "storage")
        assert r2.status_code == 200, r2.text
        assert r2.json()["agent"] == "storage_sell_timing"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
