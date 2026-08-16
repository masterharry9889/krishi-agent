"""
Integration test for the onboarding -> soil -> weather -> crop recommendation path.

NOTE: This test requires a GROQ_API_KEY to run. If no key is present,
the test is skipped — the registration flow does NOT need this pipeline.
"""
import os
import sys
import json

from dotenv import load_dotenv

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))

from backend.app.graph.build_graph import build_graph
from backend.app.memory.checkpointer import memory_checkpointer

# Skip if no GROQ_API_KEY — the registration flow does NOT require LLM
import pytest

skip_if_no_key = pytest.mark.skipif(
    not os.environ.get("GROQ_API_KEY"),
    reason="GROQ_API_KEY not set — LLM pipeline test skipped (not required for registration)",
)


@skip_if_no_key
def test_pipeline():
    print("=" * 70)
    print("RUNNING PIPELINE TEST: ONBOARDING -> SOIL -> WEATHER -> CROP RECOMMENDATION")
    print(f"USE_MOCK_TOOLS: {os.environ.get('USE_MOCK_TOOLS', 'false')}")
    print("=" * 70)

    graph = build_graph(checkpointer=memory_checkpointer)

    initial_state = {
        "farmer_id": "FARMER_1029",
        "season_id": "KHARIF_2026",
        "profile": {
            "location": "Nashik, Maharashtra",
            "land_size": 4.5,
            "water_source": "Borewell + Rainfed",
            "past_crops": ["Onion", "Cotton"],
            "budget": 120000,
            "language": "hi",
        },
        "monitoring_alerts": [],
        "advisory_log": [],
        "harvest_ready": False,
        "needs_human_confirmation": False,
        "phase": "onboarding",
    }

    config = {"configurable": {"thread_id": "test_thread_001"}}

    print("\nExecuting graph workflow...")
    output_state = graph.invoke(initial_state, config=config)

    print("\n" + "=" * 70)
    print("PIPELINE EXECUTION STAGE OUTPUTS:")
    print("=" * 70)

    print("\n--- 1. VERIFIED FARMER PROFILE ---")
    print(json.dumps(output_state.get("profile"), indent=2, ensure_ascii=False))

    print("\n--- 2. SOIL ANALYSIS REPORT ---")
    print(json.dumps(output_state.get("soil_report"), indent=2, ensure_ascii=False))

    print("\n--- 3. WEATHER ANALYSIS OUTLOOK ---")
    print(json.dumps(output_state.get("weather_outlook"), indent=2, ensure_ascii=False))

    print("\n--- 4. CROP RECOMMENDATION SHORTLIST ---")
    shortlist = output_state.get("crop_shortlist")
    summary = output_state.get("crop_recommendation_summary")

    if summary:
        print(f"\nExecutive Strategy Summary:\n{summary}\n")

    print(json.dumps(shortlist, indent=2, ensure_ascii=False))
    assert output_state.get("profile") is not None, "Profile missing in output state"
    assert output_state.get("soil_report") is not None, "Soil report missing in output state"
    assert output_state.get("weather_outlook") is not None, "Weather outlook missing in output state"
    assert shortlist is not None and len(shortlist) > 0, "Crop shortlist is empty or missing"

    print("\n" + "=" * 70)
    print("TEST PASSED: Onboarding -> Soil -> Weather -> Crop Recommendation path executed successfully!")
    print("=" * 70)
