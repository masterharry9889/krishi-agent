"""
Phase 11A Farmer Session Authentication & Isolation Test Suite.
Validates mobile phone login, session JWT tokens, authorization checks, and cross-farmer isolation.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from backend.main import app
from backend.app.db import FarmerService, FarmerInDB

TEST_DB = "krishi_agent_phase11a_test"


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


class TestPhase11AFarmerAuth:
    def test_onboard_generates_session_token(self, client):
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        res = client.post(
            "/api/v1/onboard",
            json={"name": "Auth Farmer 1", "phone": phone, "district": "Nashik", "language": "mr", "password": "Password123!"}
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert "access_token" in data
        assert data["access_token"] is not None
        assert data["token_type"] == "bearer"

    def test_returning_farmer_phone_login(self, client, fs):
        from backend.app.db import hash_password
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        f = FarmerInDB(name="Returning Farmer", phone=phone, district="Pune", status="registered", password_hash=hash_password("Pass12345"))
        fs.create_farmer(f)

        # Login with valid phone and password
        res_login = client.post("/api/v1/farmer/login", json={"phone": phone, "password": "Pass12345"})
        assert res_login.status_code == 200, res_login.text
        data = res_login.json()
        assert data["farmer_id"] == f.farmer_id
        assert data["season_id"] == f.season_id
        assert "access_token" in data

        # Login with unregistered phone -> 401
        res_fail = client.post("/api/v1/farmer/login", json={"phone": "+910000000000", "password": "Pass12345"})
        assert res_fail.status_code == 401

    def test_authenticated_endpoint_access(self, client, fs):
        from backend.app.db import hash_password
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        f = FarmerInDB(name="Farmer Auth Test", phone=phone, district="Nagpur", status="registered", password_hash=hash_password("Pass12345"))
        fs.create_farmer(f)

        # Login to get token
        login_res = client.post("/api/v1/farmer/login", json={"phone": phone, "password": "Pass12345"}).json()
        token = login_res["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Unauthenticated request -> 401
        res_unauth = client.get(f"/api/v1/farmers/{f.farmer_id}/context")
        assert res_unauth.status_code == 401

        # 2. Authenticated request with matching token -> 200
        res_auth = client.get(f"/api/v1/farmers/{f.farmer_id}/context", headers=headers)
        assert res_auth.status_code == 200
        assert res_auth.json()["profile"]["name"] == "Farmer Auth Test"

    def test_cross_farmer_token_isolation(self, client, fs):
        from backend.app.db import hash_password
        # Create Farmer A
        p_a = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        fa = FarmerInDB(name="Farmer A", phone=p_a, district="Ludhiana", status="registered", password_hash=hash_password("Pass12345"))
        fs.create_farmer(fa)
        token_a = client.post("/api/v1/farmer/login", json={"phone": p_a, "password": "Pass12345"}).json()["access_token"]

        # Create Farmer B
        p_b = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        fb = FarmerInDB(name="Farmer B", phone=p_b, district="Amritsar", status="registered")
        fs.create_farmer(fb)

        # Farmer A using token_a trying to access Farmer B's context -> MUST return 403
        headers_a = {"Authorization": f"Bearer {token_a}"}
        res_cross = client.get(f"/api/v1/farmers/{fb.farmer_id}/context", headers=headers_a)
        assert res_cross.status_code == 403

        # Farmer A trying to orchestrate Farmer B's season -> MUST return 403
        res_orch_cross = client.post(f"/api/v1/farmers/{fb.farmer_id}/seasons/{fb.season_id}/orchestrate", headers=headers_a)
        assert res_orch_cross.status_code == 403
