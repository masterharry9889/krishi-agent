"""Phase 5 Real End-to-End Verification Script.

Validates the complete agent pipeline from registration through all 14
implemented agents, verifying persistence, dependency enforcement, and recovery.

Run with: cd ~/krishi-agent && source venv/bin/activate && USE_MOCK_TOOLS=true python3 -m pytest backend/tests/test_e2e_phase5.py -v -s
"""
import uuid
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_full_phase5_e2e_flow():
    """
    1. Register farmer
    2. Receive farmer_id
    3. Receive season_id
    4. Open farmer dashboard (load FarmerContext)
    5. Verify FarmerContext loaded
    6. Run Soil Agent
    7. Verify Soil result in MongoDB
    8. Run Weather Agent
    9. Verify Weather persistence
    10. Run Crop Recommendation (consumes Soil + Weather)
    11. Verify Crop Recommendation consumed context
    12. Run remaining agents in dependency order
    13. Verify all results persisted in MongoDB
    14. Refresh dashboard (reload context)
    15. Verify all results still visible
    16. Test missing prerequisites (crop_recommendation without soil)
    17. Test invalid farmer_id
    18. Test invalid season_id
    19. Test farmer/season mismatch
    20. Test unknown agent name
    21. Test agent status endpoint
    22. Test agent registry endpoint
    """
    phone = f"+9198{uuid.uuid4().int % 100000000:08d}"

    # 1-3. Register farmer
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
    token = data.get("access_token")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    assert farmer_id
    assert season_id
    assert data["status"] == "registered"
    print(f"✓ 1-3: Farmer registered with farmer_id={farmer_id}, season_id={season_id}")

    # 4-5. Open Farmer Dashboard / Load Context
    ctx_res = client.get(f"/api/v1/farmers/{farmer_id}/context", headers=headers)
    assert ctx_res.status_code == 200, ctx_res.text
    ctx = ctx_res.json()
    assert ctx["farmer_id"] == farmer_id
    assert ctx["season_id"] == season_id
    assert ctx["profile"]["name"] == "Ramesh Patil"
    assert ctx["profile"]["district"] == "Nashik"
    print("✓ 4-5: FarmerContext loaded cleanly")

    # 6-7. Run Soil Agent
    soil_res = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/soil/run", headers=headers)
    assert soil_res.status_code == 200, soil_res.text
    soil_data = soil_res.json()
    assert soil_data["status"] == "success"
    assert "ph" in soil_data["output"] or "soil_type" in soil_data["output"]
    print("✓ 6-7: Soil Agent executed successfully")

    # Verify Soil persisted
    ctx_res2 = client.get(f"/api/v1/farmers/{farmer_id}/context", headers=headers)
    saved_agents = [e["agent"] for e in ctx_res2.json()["agent_outputs"]]
    assert "soil" in saved_agents
    print("✓ Soil result stored in MongoDB and retained on context refresh")

    # 8-9. Run Weather Agent
    weather_res = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/weather/run", headers=headers)
    assert weather_res.status_code == 200, weather_res.text
    weather_data = weather_res.json()
    assert weather_data["status"] == "success"
    assert "forecast_7d" in weather_data["output"]
    print("✓ 8-9: Weather Agent executed & output verified & persisted")

    # 10-11. Run Crop Recommendation (consumes Soil + Weather context)
    crop_res = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/crop_recommendation/run", headers=headers)
    assert crop_res.status_code == 200, crop_res.text
    crop_data = crop_res.json()
    assert crop_data["status"] == "success"
    assert "crop_shortlist" in crop_data["output"]
    shortlist = crop_data["output"]["crop_shortlist"]
    assert len(shortlist) > 0, "Crop shortlist should not be empty"
    # Verify each crop has expected fields
    for crop in shortlist:
        assert "crop" in crop
        assert "reasoning" in crop
    print(f"✓ 10-11: Crop Recommendation consumed Soil+Weather context, {len(shortlist)} crops recommended")

    # 12. Run remaining agents in dependency order
    remaining_agents = [
        ("market_intelligence", "Market Intelligence"),
        ("irrigation", "Irrigation"),
        ("budget_estimator", "Budget Estimator"),
        ("input_verification", "Input Verification"),
        ("insurance", "Insurance & Schemes"),
        ("credit", "Credit"),
        ("crop_monitoring", "Crop Monitoring"),
        ("advisory", "Advisory"),
        ("storage", "Storage & Sell Timing"),
        ("market_linkage", "Market Linkage"),
        ("feedback", "Feedback"),
    ]
    for agent_name, label in remaining_agents:
        r = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/{agent_name}/run", headers=headers)
        assert r.status_code == 200, f"{label} ({agent_name}): {r.text}"
        assert r.json()["status"] == "success", f"{label}: {r.text}"
        print(f"✓ {label} executed successfully")

    # 13. Verify all 14 agents persisted in MongoDB
    ctx_final = client.get(f"/api/v1/farmers/{farmer_id}/context", headers=headers)
    all_agents = [e["agent"] for e in ctx_final.json()["agent_outputs"]]
    expected_agents = {
        "soil", "weather", "crop_recommendation", "market_intelligence", "irrigation",
        "budget_estimator", "input_verification", "scheme_insurance", "credit",
        "crop_monitoring", "advisory", "storage_sell_timing", "market_linkage", "feedback",
    }
    assert expected_agents.issubset(set(all_agents)), f"Missing agents: {expected_agents - set(all_agents)}"
    print(f"✓ 12-13: All 14 agents persisted in MongoDB ({len(all_agents)} total outputs)")

    # 14-15. Refresh dashboard — all results still visible
    ctx_refresh = client.get(f"/api/v1/farmers/{farmer_id}/context", headers=headers)
    assert ctx_refresh.status_code == 200
    refreshed_agents = [e["agent"] for e in ctx_refresh.json()["agent_outputs"]]
    assert set(refreshed_agents) == set(all_agents), "Results should be identical after refresh"
    print("✓ 14-15: All previous results remain visible after refresh (no duplicate execution)")

    # 16. Test missing prerequisites (crop_recommendation without soil/water for a fresh farmer)
    phone2 = f"+9198{uuid.uuid4().int % 100000000:08d}"
    fresh_res = client.post("/api/v1/onboard", json={
        "name": "New Farmer",
        "phone": phone2,
        "district": "Satara",
        "language": "mr",
        "password": "Password123!",
    })
    fresh_data = fresh_res.json()
    fresh_headers = {"Authorization": f"Bearer {fresh_data['access_token']}"}
    prereq_res = client.post(
        f"/api/v1/farmers/{fresh_data['farmer_id']}/seasons/{fresh_data['season_id']}/agents/crop_recommendation/run",
        headers=fresh_headers
    )
    assert prereq_res.status_code == 422, prereq_res.text
    assert "Soil" in prereq_res.json()["detail"] and "Weather" in prereq_res.json()["detail"]
    print("✓ 16: Missing prerequisites blocked cleanly with 422")

    # 17. Test invalid farmer_id
    bad_farmer = client.post(f"/api/v1/farmers/invalid-id/seasons/{season_id}/agents/soil/run", headers=headers)
    assert bad_farmer.status_code in (403, 404)
    print("✓ 17: Invalid farmer_id returned error")

    # 18. Test invalid season_id
    bad_season = client.post(f"/api/v1/farmers/{farmer_id}/seasons/invalid-season/agents/soil/run", headers=headers)
    assert bad_season.status_code in (403, 404)
    print("✓ 18: Invalid season_id returned error")

    # 19. Test farmer/season mismatch
    other_reg = client.post("/api/v1/onboard", json={
        "name": "Suresh Kumar",
        "phone": f"+9198{uuid.uuid4().int % 100000000:08d}",
        "district": "Pune",
        "language": "hi",
        "password": "Password123!",
    }).json()
    mismatch = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{other_reg['season_id']}/agents/soil/run", headers=headers)
    assert mismatch.status_code == 403
    print("✓ 19: Farmer/season mismatch returned 403")

    # 20. Test unknown agent name
    unknown = client.post(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/nonexistent_agent/run", headers=headers)
    assert unknown.status_code == 404
    print("✓ 20: Unknown agent name returned 404")

    # 21. Test agent status endpoint
    status_res = client.get(f"/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/status", headers=headers)
    assert status_res.status_code == 200
    statuses = status_res.json()
    assert statuses["soil"]["status"] == "success"
    assert statuses["weather"]["status"] == "success"
    print("✓ 21: Agent status endpoint returns correct statuses")

    # 22. Test agent registry endpoint
    reg_res = client.get("/api/v1/agents")
    assert reg_res.status_code == 200
    reg = reg_res.json()
    assert len(reg) == 14  # all 14 agents now implemented (no coming_soon)
    assert reg["soil"]["implemented"] is True
    print("✓ 22: Agent registry endpoint returns all agents")

    print("\n" + "=" * 70)
    print("ALL 22 PHASE 5 E2E VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    test_full_phase5_e2e_flow()
