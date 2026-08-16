"""
Comprehensive test suite for the Krishi Agent backend.
Tests the MongoDB-based registration flow and admin management.

Run with: cd ~/krishi-agent && source venv/bin/activate && python3 -m pytest backend/tests/ -v
"""
import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app, farmer_service, ADMIN_USERNAME, ADMIN_PASSWORD
from backend.app.models import OnboardRequest, OnboardResponse


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(autouse=True, scope="module")
def clean_db():
    farmer_service.collection.delete_many({})
    yield
    farmer_service.collection.delete_many({})


# ─── Pydantic Model Tests ─────────────────────────────────────────
class TestOnboardRequest:
    def test_valid_payload(self):
        req = OnboardRequest(name="Ramesh Patil", phone="9876543210", district="Nashik", password="Password123!")
        assert req.name == "Ramesh Patil"
        assert req.phone == "9876543210"
        assert req.district == "Nashik"

    def test_missing_name(self):
        with pytest.raises(Exception):
            OnboardRequest(phone="9876543210", district="Nashik", password="Password123!")

    def test_short_phone(self):
        with pytest.raises(Exception):
            OnboardRequest(name="Test", phone="123", district="Nashik", password="Password123!")

    def test_short_district(self):
        with pytest.raises(Exception):
            OnboardRequest(name="Test", phone="9876543210", district="N", password="Password123!")

    def test_custom_language(self):
        req = OnboardRequest(name="Test", phone="9876543210", district="Nashik", language="mr", password="Password123!")
        assert req.language == "mr"


class TestOnboardResponse:
    def test_valid_response(self):
        resp = OnboardResponse(farmer_id="abc", season_id="xyz", status="registered")
        assert resp.farmer_id == "abc"
        assert resp.season_id == "xyz"
        assert resp.status == "registered"


# ─── API: Registration Flow ───────────────────────────────────────
class TestOnboardAPI:
    def test_valid_registration(self, client):
        resp = client.post("/api/v1/onboard", json={
            "name": "Test Farmer",
            "phone": "9876543210",
            "district": "Nashik",
            "language": "hi",
            "password": "Password123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["farmer_id"]
        assert data["season_id"]
        assert data["status"] == "registered"
        uuid.UUID(data["farmer_id"])
        uuid.UUID(data["season_id"])

    def test_missing_name(self, client):
        resp = client.post("/api/v1/onboard", json={"phone": "9876543210", "district": "Nashik", "password": "Password123!"})
        assert resp.status_code == 422

    def test_missing_phone(self, client):
        resp = client.post("/api/v1/onboard", json={"name": "Test", "district": "Nashik", "password": "Password123!"})
        assert resp.status_code == 422

    def test_short_phone(self, client):
        resp = client.post("/api/v1/onboard", json={"name": "Test", "phone": "123", "district": "Nashik", "password": "Password123!"})
        assert resp.status_code == 422

    def test_short_district(self, client):
        resp = client.post("/api/v1/onboard", json={"name": "Test", "phone": "9876543210", "district": "N", "password": "Password123!"})
        assert resp.status_code == 422

    def test_short_name(self, client):
        resp = client.post("/api/v1/onboard", json={"name": "R", "phone": "9876543210", "district": "Nashik", "password": "Password123!"})
        assert resp.status_code == 422

    def test_duplicate_phone(self, client):
        payload = {"name": "Dup", "phone": "9876599999", "district": "Nashik", "password": "Password123!"}
        resp1 = client.post("/api/v1/onboard", json=payload)
        assert resp1.status_code == 200
        resp2 = client.post("/api/v1/onboard", json=payload)
        assert resp2.status_code == 409
        assert "already exists" in resp2.json()["detail"]


# ─── API: Health Check ────────────────────────────────────────────
class TestHealthEndpoint:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ok", "degraded")
        assert data["version"] == "0.1.0"


# ─── API: OpenAPI Schema ─────────────────────────────────────────
class TestOpenAPISchema:
    def test_openapi_has_proper_schemas(self, client):
        resp = client.get("/openapi.json")
        assert resp.status_code == 200
        schemas = resp.json()["components"]["schemas"]

        assert "OnboardRequest" in schemas
        onboard_req = schemas["OnboardRequest"]
        props = onboard_req["properties"]
        assert props["name"]["type"] == "string"
        assert props["name"]["minLength"] == 2
        assert props["phone"]["minLength"] == 10
        assert "required" in onboard_req
        assert "name" in onboard_req["required"]
        assert "phone" in onboard_req["required"]
        assert "district" in onboard_req["required"]

        assert "OnboardResponse" in schemas
        assert "required" in schemas["OnboardResponse"]
        assert "farmer_id" in schemas["OnboardResponse"]["required"]
        assert "season_id" in schemas["OnboardResponse"]["required"]
        assert "status" in schemas["OnboardResponse"]["required"]


# ─── Admin Auth Tests ───────────────────────────────────────────
class TestAdminAuth:
    def test_admin_login_success(self, client):
        resp = client.post("/api/v1/admin/login", auth=(ADMIN_USERNAME, ADMIN_PASSWORD))
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    def test_admin_login_invalid(self, client):
        resp = client.post("/api/v1/admin/login", auth=(ADMIN_USERNAME, "wrongpassword"))
        assert resp.status_code == 401

    def test_admin_farmers_no_token(self, client):
        resp = client.get("/api/v1/admin/farmers")
        assert resp.status_code == 403

    def test_admin_farmers_bad_token(self, client):
        resp = client.get("/api/v1/admin/farmers", headers={"Authorization": "Bearer invalid-token"})
        assert resp.status_code == 403


# ─── Admin Farmer Management Tests ──────────────────────────────
class TestAdminFarmers:
    def get_token(self):
        resp = TestClient(app).post("/api/v1/admin/login", auth=(ADMIN_USERNAME, ADMIN_PASSWORD))
        return resp.json()["access_token"]

    def test_list_farmers(self, client):
        token = self.get_token()
        resp = client.get("/api/v1/admin/farmers", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "farmers" in data
        assert "total" in data

    def test_get_farmer_details(self, client):
        token = self.get_token()
        headers = {"Authorization": f"Bearer {token}"}

        onboarding = client.post("/api/v1/onboard", json={
            "name": "Details Test",
            "phone": "9876548888",
            "district": "Delhi",
            "password": "Password123!",
        })
        fid = onboarding.json()["farmer_id"]

        resp = client.get(f"/api/v1/admin/farmers/{fid}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["farmer_id"] == fid
        assert data["name"] == "Details Test"

    def test_update_farmer(self, client):
        token = self.get_token()
        headers = {"Authorization": f"Bearer {token}"}

        onboarding = client.post("/api/v1/onboard", json={
            "name": "Update Test",
            "phone": "9876545555",
            "district": "Kolkata",
            "password": "Password123!",
        })
        fid = onboarding.json()["farmer_id"]

        resp = client.patch(
            f"/api/v1/admin/farmers/{fid}",
            headers=headers,
            json={"district": "Mumbai", "name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["district"] == "Mumbai"

    def test_delete_farmer(self, client):
        token = self.get_token()
        headers = {"Authorization": f"Bearer {token}"}

        onboarding = client.post("/api/v1/onboard", json={
            "name": "Delete Test",
            "phone": "9876546666",
            "district": "Chennai",
            "password": "Password123!",
        })
        fid = onboarding.json()["farmer_id"]

        resp = client.delete(f"/api/v1/admin/farmers/{fid}", headers=headers)
        assert resp.status_code == 200
        assert "deactivated" in resp.json()["detail"]

        verify = client.get(f"/api/v1/admin/farmers/{fid}", headers=headers)
        assert verify.json()["status"] == "deactivated"

    def test_farmer_not_found(self, client):
        token = self.get_token()
        resp = client.get(
            f"/api/v1/admin/farmers/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404


# ─── MongoDB Persistence Test ───────────────────────────────────
class TestMongoPersistence:
    def test_data_persists_in_mongodb(self, client):
        payload = {
            "name": "Persistence Test",
            "phone": "9876547777",
            "district": "Hyderabad",
            "language": "te",
            "password": "Password123!",
        }
        resp = client.post("/api/v1/onboard", json=payload)
        assert resp.status_code == 200
        fid = resp.json()["farmer_id"]

        doc = farmer_service.get_by_farmer_id(fid)
        assert doc is not None
        assert doc["name"] == "Persistence Test"
        assert doc["phone"] == "9876547777"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
