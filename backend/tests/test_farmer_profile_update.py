"""
Tests for Farmer Profile Update endpoint:
- PATCH /api/v1/farmers/{farmer_id}/profile
- PATCH /api/v1/farmer/profile
Validates personal and all agricultural/farming attributes.
"""
import pytest
from starlette.testclient import TestClient
from backend.main import app, create_farmer_token, farmer_service
from backend.app.db import FarmerInDB


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_farmer():
    farmer = FarmerInDB(
        name="Ramesh Patil",
        phone="9876543210",
        district="Nashik",
        language="mr",
        status="registered",
    )
    farmer_service.collection.delete_many({"phone": "9876543210"})
    farmer_service.create_farmer(farmer)
    token = create_farmer_token(farmer.farmer_id, farmer.season_id)
    return {
        "farmer_id": farmer.farmer_id,
        "season_id": farmer.season_id,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture
def other_farmer():
    farmer = FarmerInDB(
        name="Suresh Kumar",
        phone="9876543211",
        district="Pune",
        language="hi",
        status="registered",
    )
    farmer_service.collection.delete_many({"phone": "9876543211"})
    farmer_service.create_farmer(farmer)
    token = create_farmer_token(farmer.farmer_id, farmer.season_id)
    return {
        "farmer_id": farmer.farmer_id,
        "season_id": farmer.season_id,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


def test_update_profile_unauthenticated(client, test_farmer):
    res = client.patch(
        f"/api/v1/farmers/{test_farmer['farmer_id']}/profile",
        json={"name": "New Name"},
    )
    assert res.status_code == 401


def test_update_profile_cross_farmer_forbidden(client, test_farmer, other_farmer):
    res = client.patch(
        f"/api/v1/farmers/{other_farmer['farmer_id']}/profile",
        json={"name": "Hacked Name"},
        headers=test_farmer["headers"],
    )
    assert res.status_code == 403


def test_update_personal_and_agricultural_details(client, test_farmer):
    payload = {
        "name": "Ramesh V. Patil",
        "district": "Ahmednagar",
        "state": "Maharashtra",
        "village": "Sangamner",
        "pincode": "422605",
        "language": "mr",
        "land_size": 6.5,
        "ownership": "owned",
        "soil_type": "Black Cotton (Regur)",
        "soil_ph": "Neutral (6.8)",
        "water_source": "Drip Irrigation & Borewell",
        "irrigation_type": "Drip Irrigation",
        "past_crops": ["Soybean", "Gram", "Wheat"],
        "current_crops": ["Pomegranate", "Soybean"],
        "farming_type": "Integrated Pest Management (IPM)",
        "experience_years": 14,
        "cattle_count": 4,
        "equipment": "Tractor with rotavator",
        "has_storage": True,
        "budget": 75000.0,
        "notes": "Transitioned 2 acres to micro-sprinklers; black soil rich in potash.",
    }

    res = client.patch(
        f"/api/v1/farmers/{test_farmer['farmer_id']}/profile",
        json=payload,
        headers=test_farmer["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    profile = data["profile"]

    assert profile["name"] == "Ramesh V. Patil"
    assert profile["district"] == "Ahmednagar"
    assert profile["state"] == "Maharashtra"
    assert profile["village"] == "Sangamner"
    assert profile["pincode"] == "422605"
    assert profile["language"] == "mr"
    assert profile["land_size"] == 6.5
    assert profile["soil_type"] == "Black Cotton (Regur)"
    assert profile["soil_ph"] == "Neutral (6.8)"
    assert profile["water_source"] == "Drip Irrigation & Borewell"
    assert profile["irrigation_type"] == "Drip Irrigation"
    assert profile["past_crops"] == ["Soybean", "Gram", "Wheat"]
    assert profile["current_crops"] == ["Pomegranate", "Soybean"]
    assert profile["farming_type"] == "Integrated Pest Management (IPM)"
    assert profile["experience_years"] == 14
    assert profile["cattle_count"] == 4
    assert profile["has_storage"] is True
    assert profile["budget"] == 75000.0
    assert "potash" in profile["notes"]

    # Verify context retrieval returns the same updated fields
    ctx_res = client.get(
        f"/api/v1/farmers/{test_farmer['farmer_id']}/context",
        headers=test_farmer["headers"],
    )
    assert ctx_res.status_code == 200
    ctx_profile = ctx_res.json()["profile"]
    assert ctx_profile["name"] == "Ramesh V. Patil"
    assert ctx_profile["land_size"] == 6.5
    assert ctx_profile["soil_type"] == "Black Cotton (Regur)"
    assert ctx_profile["current_crops"] == ["Pomegranate", "Soybean"]


def test_update_current_farmer_profile_alias(client, test_farmer):
    res = client.patch(
        "/api/v1/farmer/profile",
        json={"notes": "Updated via alias endpoint", "cattle_count": 2},
        headers=test_farmer["headers"],
    )
    assert res.status_code == 200
    assert res.json()["profile"]["cattle_count"] == 2
    assert res.json()["profile"]["notes"] == "Updated via alias endpoint"


def test_invalid_language_validation(client, test_farmer):
    res = client.patch(
        f"/api/v1/farmers/{test_farmer['farmer_id']}/profile",
        json={"language": "invalid_lang_code"},
        headers=test_farmer["headers"],
    )
    assert res.status_code == 422
