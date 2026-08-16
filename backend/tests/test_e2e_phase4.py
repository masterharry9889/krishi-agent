"""Phase 4 E2E test — kept for backward compatibility.

Superseded by test_e2e_phase5.py but maintained to ensure no regression
in the core registration → agent execution flow. This test focuses on the
20 original Phase 4 checks, with the coming-soon agents updated to reflect
the Phase 5 reality where irrigation, market_intelligence, etc. are now
implemented.
"""
import uuid
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_full_e2e_flow():
    phone = f"+9198{uuid.uuid4().int % 100000000:08d}"

    # 1. Register farmer
    onboard_res = client.post("/api/v1/onboard", json={
        "name": "Ramesh Patil",
        "phone": phone,
        "district": "Nashik",
        "language": "mr",
        "password": "Password123!",
    })
    assert onboard_res.status_code == 200, onboard_res.text
    data = onboard_res.json()
    farmer_id = data["farmer_id"]
    season_id = data["season_id"]
    assert farmer_id
    assert season_id
    token = data.get("access_token")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    print(f"✓ Step 1-3: Farmer registered with farmer_id={farmer_id}, season_id={season_id}")

    # 4-5. Open Farmer Dashboard / Load Context
    ctx_res = client.get(f"/api/v1/farmers/{farmer_id}/context", headers=headers)
    assert ctx_res.status_code == 200, ctx_res.text
    ctx = ctx_res.json()
    assert ctx["farmer_id"] == farmer_id
    assert ctx["season_id"] == season_id
    assert ctx["profile"]["name"] == "Ramesh Patil"
    assert ctx["profile"]["district"] == "Nashik"
    print("✓ Step 4-5: Farmer context loaded cleanly")

    # 6. Run Soil Agent
    soil_res = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/soil/run", headers=headers)
    assert soil_res.status_code == 200, soil_res.text
    soil_data = soil_res.json()
    assert soil_data["status"] == "success"
    assert "ph" in soil_data["output"] or "soil_type" in soil_data["output"]
    print("✓ Step 6-7: Soil Agent executed successfully")

    # 8. Verify Soil stored in MongoDB & context refresh
    ctx_res2 = client.get(f"/api/v1/farmers/{farmer_id}/context", headers=headers)
    saved_agents = [e["agent"] for e in ctx_res2.json()["agent_outputs"]]
    assert "soil" in saved_agents
    print("✓ Step 8-10: Soil result stored in MongoDB and retained on refresh")

    # 11-12. Run Weather Agent
    weather_res = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/weather/run", headers=headers)
    assert weather_res.status_code == 200, weather_res.text
    weather_data = weather_res.json()
    assert weather_data["status"] == "success"
    assert "forecast_7d" in weather_data["output"] or "seasonal_outlook" in weather_data["output"]
    print("✓ Step 11-12: Weather Agent executed & output verified")

    # 13-14. Run Crop Recommendation (receives Soil + Weather context)
    crop_res = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/crop_recommendation/run", headers=headers)
    assert crop_res.status_code == 200, crop_res.text
    crop_data = crop_res.json()
    assert crop_data["status"] == "success"
    assert "crop_shortlist" in crop_data["output"]
    print("✓ Step 13-14: Crop Recommendation executed with Soil+Weather context")

    # 15. Test invalid farmer_id
    bad_farmer = client.post(f"/api/v1/farmers/invalid-id/seasons/{season_id}/agents/soil/run", headers=headers)
    assert bad_farmer.status_code in (403, 404)
    print("✓ Step 15: Invalid farmer_id returned error")

    # 16. Test invalid season_id
    bad_season = client.post(f"/api/v1/farmers/{farmer_id}/seasons/invalid-season/agents/soil/run", headers=headers)
    assert bad_season.status_code in (403, 404)
    print("✓ Step 16: Invalid season_id returned error")

    # 17. Test mismatched farmer + season
    other_reg = client.post("/api/v1/onboard", json={
        "name": "Suresh Kumar",
        "phone": f"+9198{uuid.uuid4().int % 100000000:08d}",
        "district": "Pune",
        "language": "hi",
        "password": "Password123!",
    }).json()
    mismatch = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{other_reg['season_id']}/agents/soil/run", headers=headers)
    assert mismatch.status_code == 403
    print("✓ Step 17: Mismatched farmer + season returned 403")

    # 18-19. Test stub agents & error handling
    stub_res = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/nonexistent_agent/run", headers=headers)
    assert stub_res.status_code == 404
    print("✓ Step 18-19: Unknown agent handled cleanly with 404")

    # 20. Prerequisite enforcement for Crop Recommendation
    fresh_reg = client.post("/api/v1/onboard", json={
        "name": "New Farmer",
        "phone": f"+9198{uuid.uuid4().int % 100000000:08d}",
        "district": "Satara",
        "language": "mr",
        "password": "Password123!",
    }).json()
    fresh_headers = {"Authorization": f"Bearer {fresh_reg['access_token']}"}
    prereq_res = client.post(f"/api/v1/farmers/{fresh_reg['farmer_id']}/seasons/{fresh_reg['season_id']}/agents/crop_recommendation/run", headers=fresh_headers)
    assert prereq_res.status_code == 422
    assert "Soil" in prereq_res.json()["detail"] and "Weather" in prereq_res.json()["detail"]
    print("✓ Step 20: Missing prerequisites blocked cleanly with 422")

    print("\nALL 20 E2E VERIFICATION CHECKS PASSED SUCCESSFULLY!")
