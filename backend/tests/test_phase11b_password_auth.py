"""
Phase 11B Farmer Phone + Password Authentication & Password Hashing Test Suite.
Validates registration with password, bcrypt hashing, API payload sanitization, login security,
password setup for existing accounts, JWT validation, and cross-farmer isolation.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient

from backend.main import app
from backend.app.db import FarmerService, FarmerInDB, verify_password

TEST_DB = "krishi_agent_phase11b_test"


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


class TestPhase11BPasswordAuth:
    def test_registration_with_password_and_hashing(self, client, fs):
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        password = "SecurePassword123!"

        res = client.post(
            "/api/v1/onboard",
            json={
                "name": "Password Farmer",
                "phone": phone,
                "district": "Kolhapur",
                "language": "mr",
                "password": password,
                "confirm_password": password,
            }
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # Password or hash must NEVER be in response
        assert "password" not in data
        assert "password_hash" not in data

        # Verify stored in MongoDB as bcrypt hash
        doc = fs.get_by_phone(phone, sanitize=False)
        assert doc is not None
        assert "password_hash" in doc
        assert doc["password_hash"] != password
        assert doc["password_hash"].startswith("$2b$") or doc["password_hash"].startswith("$2a$")
        assert verify_password(password, doc["password_hash"]) is True

    def test_password_validation_errors(self, client):
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"

        # 1. Short password (< 8 chars) -> 422
        res_short = client.post(
            "/api/v1/onboard",
            json={
                "name": "Short Pwd",
                "phone": phone,
                "district": "Pune",
                "password": "short",
                "confirm_password": "short",
            }
        )
        assert res_short.status_code == 422

        # 2. Password mismatch -> 422
        res_mismatch = client.post(
            "/api/v1/onboard",
            json={
                "name": "Mismatch Pwd",
                "phone": phone,
                "district": "Pune",
                "password": "ValidPassword123",
                "confirm_password": "DifferentPassword123",
            }
        )
        assert res_mismatch.status_code == 422

    def test_phone_and_password_login_flow(self, client):
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        password = "FarmerSecretPassword99"

        # Register
        client.post(
            "/api/v1/onboard",
            json={
                "name": "Login Test Farmer",
                "phone": phone,
                "district": "Satara",
                "password": password,
            }
        )

        # 1. Correct phone + correct password -> 200 Success
        res_ok = client.post(
            "/api/v1/farmer/login",
            json={"phone": phone, "password": password}
        )
        assert res_ok.status_code == 200, res_ok.text
        data = res_ok.json()
        assert "access_token" in data
        assert "password" not in data
        assert "password_hash" not in data

        # 2. Correct phone + wrong password -> 401 Unauthorized
        res_wrong_pwd = client.post(
            "/api/v1/farmer/login",
            json={"phone": phone, "password": "WrongPassword99"}
        )
        assert res_wrong_pwd.status_code == 401

        # 3. Wrong phone + password -> 401 Unauthorized
        res_wrong_phone = client.post(
            "/api/v1/farmer/login",
            json={"phone": "+910000000000", "password": password}
        )
        assert res_wrong_phone.status_code == 401

        # 4. Phone-only login attempt without password -> 422 Unprocessable Entity
        res_no_pwd = client.post(
            "/api/v1/farmer/login",
            json={"phone": phone}
        )
        assert res_no_pwd.status_code == 422

    def test_existing_farmer_without_password_and_setup_flow(self, client, fs):
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        f = FarmerInDB(
            name="Legacy Unpassworded Farmer",
            phone=phone,
            district="Sangli",
            status="registered",
            password_hash=None,
        )
        fs.create_farmer(f)

        # Attempting login without password set -> 401 requiring setup
        res_login = client.post(
            "/api/v1/farmer/login",
            json={"phone": phone, "password": "SomePassword123"}
        )
        assert res_login.status_code == 401
        assert "password setup required" in res_login.json()["detail"].lower()

        # Execute safe password setup
        res_setup = client.post(
            "/api/v1/farmer/setup-password",
            json={
                "phone": phone,
                "password": "NewSecurePassword123",
                "confirm_password": "NewSecurePassword123",
            }
        )
        assert res_setup.status_code == 200, res_setup.text
        assert "access_token" in res_setup.json()

        # Now login works with the new password
        res_login_after = client.post(
            "/api/v1/farmer/login",
            json={"phone": phone, "password": "NewSecurePassword123"}
        )
        assert res_login_after.status_code == 200

    def test_protected_routes_and_isolation(self, client, fs):
        # Create Farmer A
        p_a = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        res_a = client.post(
            "/api/v1/onboard",
            json={"name": "Farmer A", "phone": p_a, "district": "Ludhiana", "password": "PasswordA123!"}
        ).json()
        token_a = res_a["access_token"]
        fid_a = res_a["farmer_id"]

        # Create Farmer B
        p_b = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        res_b = client.post(
            "/api/v1/onboard",
            json={"name": "Farmer B", "phone": p_b, "district": "Amritsar", "password": "PasswordB123!"}
        ).json()
        fid_b = res_b["farmer_id"]

        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 1. Access without token -> 401
        assert client.get(f"/api/v1/farmers/{fid_a}/context").status_code == 401

        # 2. Access with invalid token -> 401
        assert client.get(f"/api/v1/farmers/{fid_a}/context", headers={"Authorization": "Bearer invalid.token.value"}).status_code == 401

        # 3. Farmer A accessing Farmer B's data -> 403 Forbidden
        assert client.get(f"/api/v1/farmers/{fid_b}/context", headers=headers_a).status_code == 403

        # 4. Context API response never leaks password_hash
        ctx_a = client.get(f"/api/v1/farmers/{fid_a}/context", headers=headers_a).json()
        assert "password_hash" not in ctx_a.get("profile", {})
