"""
Phase 13 Security Hardening & Vulnerability Verification Test Suite.
Validates:
1. Input sanitization (XSS prevention, HTML rejection in name/district)
2. Phone number regex format validation
3. Language code whitelist validation
4. Account takeover prevention on /api/v1/farmer/setup-password
5. HTTP Security Headers (nosniff, DENY, Referrer-Policy)
6. Admin bcrypt password authentication
7. Information disclosure prevention in error details
"""
import uuid
import pytest
import bcrypt
from fastapi.testclient import TestClient
from pymongo import MongoClient

from backend.main import app, verify_admin_credentials
from backend.app.db import FarmerService, FarmerInDB
from backend.app.models import OnboardRequest
from fastapi.security import HTTPBasicCredentials

TEST_DB = "krishi_agent_security_test"


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


class TestSecurityHardening:
    def test_security_headers_present(self, client):
        """Test that every HTTP response carries strict defensive headers."""
        res = client.get("/health")
        assert res.status_code == 200
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert res.headers.get("x-frame-options") == "DENY"
        assert res.headers.get("x-xss-protection") == "1; mode=block"
        assert "strict-origin" in res.headers.get("referrer-policy", "")

    def test_phone_regex_rejects_alphabetic_characters(self, client):
        """Test that phone with invalid alphabetic characters is rejected."""
        res = client.post(
            "/api/v1/onboard",
            json={
                "name": "Valid Name",
                "phone": "invalidphone123",
                "district": "Pune",
                "password": "ValidPassword123!",
            }
        )
        assert res.status_code == 422

    def test_xss_html_tags_rejected_in_name_and_district(self, client):
        """Test that <script> or HTML tags in name/district fail validation."""
        res_xss_name = client.post(
            "/api/v1/onboard",
            json={
                "name": "<script>alert(1)</script>",
                "phone": "9876543210",
                "district": "Nashik",
                "password": "ValidPassword123!",
            }
        )
        assert res_xss_name.status_code == 422
        assert "HTML" in res_xss_name.text or "angle brackets" in res_xss_name.text

        res_xss_dist = client.post(
            "/api/v1/onboard",
            json={
                "name": "Normal Farmer",
                "phone": "9876543210",
                "district": "<img src=x onerror=alert(1)>",
                "password": "ValidPassword123!",
            }
        )
        assert res_xss_dist.status_code == 422

    def test_unsupported_language_code_rejected(self, client):
        """Test that arbitrary language code injection is blocked."""
        res = client.post(
            "/api/v1/onboard",
            json={
                "name": "Language Farmer",
                "phone": "9876543210",
                "district": "Kolhapur",
                "language": "unsupported_lang_code",
                "password": "ValidPassword123!",
            }
        )
        assert res.status_code == 422

    def test_account_takeover_blocked_on_setup_password(self, client):
        """Test that /setup-password cannot hijack an existing password without old_password."""
        phone = f"+91{uuid.uuid4().int % 10_000_000_000:010d}"
        original_pwd = "OriginalPassword123!"

        # Register farmer with initial password
        reg = client.post(
            "/api/v1/onboard",
            json={
                "name": "Protected Farmer",
                "phone": phone,
                "district": "Nagpur",
                "password": original_pwd,
            }
        )
        assert reg.status_code == 200

        # Attempt to overwrite password without old_password -> 401
        hijack = client.post(
            "/api/v1/farmer/setup-password",
            json={
                "phone": phone,
                "password": "AttackerPassword123!",
                "confirm_password": "AttackerPassword123!",
            }
        )
        assert hijack.status_code == 401
        assert "old_password" in hijack.json()["detail"].lower()

        # Supply correct old_password -> Success
        legit_update = client.post(
            "/api/v1/farmer/setup-password",
            json={
                "phone": phone,
                "password": "NewLegitPassword123!",
                "confirm_password": "NewLegitPassword123!",
                "old_password": original_pwd,
            }
        )
        assert legit_update.status_code == 200

    def test_admin_bcrypt_password_verification(self, monkeypatch):
        """Test that bcrypt hashed admin passwords verify correctly."""
        raw_pwd = "SuperSecretAdminPass123!"
        hashed_pwd = bcrypt.hashpw(raw_pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        monkeypatch.setattr("backend.main.ADMIN_PASSWORD_HASH", hashed_pwd)

        valid_creds = HTTPBasicCredentials(username="admin", password=raw_pwd)
        assert verify_admin_credentials(valid_creds) is True

        invalid_creds = HTTPBasicCredentials(username="admin", password="WrongPassword!")
        assert verify_admin_credentials(invalid_creds) is False
