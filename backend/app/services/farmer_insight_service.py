"""
FarmerInsightService — Unified Farmer Insight & Priority Scoring Engine.

Aggregates persisted outputs across all 14 agents into actionable, farmer-first decisions:
- Today's Priorities & Actionable Nudges
- Alert System (Weather, Pest, Market, Irrigation, Financial)
- Farming Season Timeline Phase
- Weather-to-Action Guidance
- Market & Selling Decision
- Financial Snapshot & Trust Badges
"""
import os
from datetime import datetime, timezone
from typing import Dict, Any, List

# Freshness Configuration (in hours)
AGENT_FRESHNESS_HOURS: Dict[str, float] = {
    "weather": 12.0,
    "market_intelligence": 24.0,
    "crop_monitoring": 24.0,
    "advisory": 24.0,
    "soil": 2160.0,  # 90 days
    "crop_recommendation": 168.0, # 7 days
    "resource_irrigation": 168.0,
    "budget_estimator": 168.0,
    "input_verification": 720.0,
    "scheme_insurance": 720.0,
    "credit": 720.0,
    "storage_sell_timing": 168.0,
    "market_linkage": 168.0,
    "feedback": 2160.0,
}


def is_agent_fresh(entry: Dict[str, Any]) -> bool:
    """Checks if a persisted agent output entry is still fresh according to AGENT_FRESHNESS_HOURS."""
    if not entry or "timestamp" not in entry:
        return False
    agent = entry.get("agent", "")
    max_hours = AGENT_FRESHNESS_HOURS.get(agent, 24.0)
    try:
        ts_str = entry["timestamp"]
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        ts = datetime.fromisoformat(ts_str)
        now = datetime.now(timezone.utc)
        age_hours = (now - ts).total_seconds() / 3600.0
        return age_hours <= max_hours
    except Exception:
        return False


class FarmerInsightService:
    """Combines outputs from all 14 agents into a unified, priority-scored farmer decision summary."""

    @staticmethod
    def generate_insight(state: Dict[str, Any]) -> Dict[str, Any]:
        profile = state.get("profile", {})
        farmer_id = state.get("farmer_id", "")
        season_id = state.get("season_id", "")
        district = profile.get("district") or profile.get("location") or "India"
        language = profile.get("language", "hi")
        now = datetime.now(timezone.utc).isoformat()

        soil = state.get("soil_report") or {}
        weather = state.get("weather_outlook") or {}
        market = state.get("market_intel") or {}
        crop_shortlist = state.get("crop_shortlist") or []
        crop_rec_summary = state.get("crop_recommendation_summary") or ""
        input_plan = state.get("input_plan") or {}
        budget = state.get("budget_estimate") or {}
        dealers = state.get("verified_dealers") or {}
        insurance = state.get("insurance_status") or {}
        credit = state.get("credit_offers") or {}
        monitoring = state.get("monitoring_alerts") or {}
        advisory = state.get("advisory_log") or {}
        storage = state.get("sell_recommendation") or {}
        linkage = state.get("sale_record") or {}
        feedback = state.get("season_feedback") or {}

        # ── 1. Calculate Season Timeline Phase ────────────────────────
        completed_steps: List[str] = ["REGISTERED"]
        current_phase = "SOIL CHECK"
        next_step = "Run Soil Analysis"

        if soil.get("status") == "success" or soil.get("ph"):
            completed_steps.append("SOIL CHECK")
            current_phase = "WEATHER CHECK"
            next_step = "Run Weather Forecast"

        if weather.get("status") == "success" or weather.get("forecast_7d"):
            completed_steps.append("WEATHER CHECK")
            current_phase = "CROP SELECTION"
            next_step = "Generate Crop Recommendation"

        if crop_shortlist:
            completed_steps.append("CROP SELECTION")
            current_phase = "INPUT PLANNING"
            next_step = "Build Input & Irrigation Plan"

        if input_plan.get("status") == "success" or input_plan.get("seed_requirement"):
            completed_steps.append("INPUT PLANNING")
            completed_steps.append("SOWING")
            current_phase = "MONITORING"
            next_step = "Monitor Crop Health & Advisory"

        if monitoring.get("status") == "success" or monitoring.get("ndvi_score"):
            completed_steps.append("GROWING")
            completed_steps.append("MONITORING")
            current_phase = "HARVEST & SELL"
            next_step = "Check Storage & Market Linkage"

        if storage.get("status") == "success" or linkage.get("status") == "success":
            completed_steps.append("HARVEST")
            completed_steps.append("SELL")
            current_phase = "SEASON FEEDBACK"
            next_step = "Submit Season Learnings"

        if feedback.get("status") == "success" or feedback.get("yield_satisfaction"):
            completed_steps.append("FEEDBACK")
            current_phase = "SEASON COMPLETED"
            next_step = "Ready for Next Season"

        timeline = {
            "current_phase": current_phase,
            "next_step": next_step,
            "completed_steps": list(dict.fromkeys(completed_steps)),
            "all_phases": [
                "REGISTERED", "SOIL CHECK", "WEATHER CHECK", "CROP SELECTION",
                "INPUT PLANNING", "SOWING", "GROWING", "MONITORING",
                "HARVEST", "SELL", "FEEDBACK"
            ],
        }

        # ── 2. Priority Scoring Engine ────────────────────────────────
        priorities: List[Dict[str, Any]] = []
        alerts: List[Dict[str, Any]] = []

        # Weather Priorities & Weather Actions
        weather_actions: List[Dict[str, str]] = []
        forecast = weather.get("forecast_7d", []) if isinstance(weather, dict) else []
        total_rain = weather.get("total_7d_rain_mm") or sum(d.get("rain_mm", 0) for d in forecast)
        avg_temp = weather.get("average_temp_c") or 30.0

        if total_rain >= 50:
            priorities.append({
                "title": "🌧 Heavy Rain Expected",
                "reason": f"Forecast predicts {total_rain}mm of rainfall in {district} over next 7 days.",
                "urgency": "high",
                "recommended_action": "Delay scheduled irrigation and inspect field drainage channels.",
                "source": weather.get("source", "Weather Forecast"),
                "agent": "weather",
            })
            weather_actions.append({
                "condition": f"Heavy Rain ({total_rain}mm forecast)",
                "action": "Delay irrigation and clear field drainage ditches.",
                "urgency": "high",
            })
            alerts.append({
                "type": "WEATHER",
                "severity": "high",
                "title": "Heavy Rain Alert",
                "message": f"Expected rainfall of {total_rain}mm in {district}.",
                "action": "Ensure field drainage is clear.",
                "source": weather.get("source", "Open-Meteo Weather API"),
                "created_at": now,
            })
        elif total_rain < 15:
            priorities.append({
                "title": "☀️ Dry Spell Forecast",
                "reason": f"Low rainfall expected ({total_rain}mm) over next 7 days in {district}.",
                "urgency": "medium",
                "recommended_action": "Apply evening drip or furrow irrigation to prevent moisture stress.",
                "source": weather.get("source", "Weather Forecast"),
                "agent": "weather",
            })
            weather_actions.append({
                "condition": "Dry Spell Forecast",
                "action": "Schedule light evening irrigation.",
                "urgency": "medium",
            })

        if avg_temp >= 36.0:
            weather_actions.append({
                "condition": f"High Temperature ({avg_temp}°C)",
                "action": "Monitor crop canopy for heat & moisture stress.",
                "urgency": "medium",
            })

        # Soil Deficiencies Priority
        if soil.get("nitrogen_status") == "low" or soil.get("primary_nutrients", {}).get("nitrogen") == "low":
            priorities.append({
                "title": "🌱 Soil Nitrogen Deficiency",
                "reason": f"Soil health report for {district} indicates low nitrogen levels.",
                "urgency": "high",
                "recommended_action": "Apply 40 kg/acre urea in split doses as recommended by agronomic plan.",
                "source": soil.get("source", "Soil Health Card"),
                "agent": "soil",
            })
            alerts.append({
                "type": "CROP",
                "severity": "medium",
                "title": "Soil Nitrogen Deficit",
                "message": "Nitrogen level is below optimal threshold for crop growth.",
                "action": "Apply split dose of nitrogenous fertilizer.",
                "source": soil.get("source", "Soil Health Card"),
                "created_at": now,
            })

        if "zinc" in soil.get("micronutrient_deficiencies", []) or soil.get("zinc_status") == "deficient":
            priorities.append({
                "title": "🧪 Micronutrient Deficiency (Zinc)",
                "reason": "Zinc deficiency detected in soil test.",
                "urgency": "medium",
                "recommended_action": "Apply 10 kg/acre Zinc Sulphate during basal fertilizer application.",
                "source": soil.get("source", "Soil Health Card"),
                "agent": "soil",
            })

        # Market Intelligence Opportunities & Selling Decision
        market_decision: Dict[str, Any] = {}
        commodities = market.get("commodities", [])
        if commodities:
            top_c = commodities[0]
            price = top_c.get("modal_price_inr") or top_c.get("modal_price") or 0
            trend = top_c.get("price_trend", "stable")
            crop_name = top_c.get("crop", "Crop")
            mandi = top_c.get("mandi") or top_c.get("best_mandi") or f"{district} APMC"

            if trend == "rising":
                priorities.append({
                    "title": f"📈 Favorable Market Trend for {crop_name}",
                    "reason": f"{crop_name} prices are trending upwards at ₹{price}/quintal in {mandi}.",
                    "urgency": "medium",
                    "recommended_action": "Monitor prices closely before finalizing post-harvest sale.",
                    "source": market.get("source", "Agmarknet Mandi Feed"),
                    "agent": "market_intelligence",
                })

            market_decision = {
                "crop": crop_name,
                "mandi": mandi,
                "modal_price_inr": price,
                "price_trend": trend,
                "recommendation_type": "WAIT & HOLD" if trend == "rising" else "SELL NOW" if trend == "falling" else "MONITOR MANDI",
                "reasoning": storage.get("sell_recommendation", {}).get("recommendation_summary") or f"{crop_name} is trading at ₹{price}/quintal ({trend} trend) in {mandi}.",
                "source": market.get("source", "Agmarknet Mandi Feed"),
                "confidence": market.get("confidence", 0.90),
                "is_estimated": bool(market.get("is_estimated", False)),
                "data_status": "estimated" if market.get("is_estimated") else "live",
                "generated_at": now,
            }

        # Pest / Monitoring Alerts
        mon_alerts = monitoring.get("monitoring_alerts", []) if isinstance(monitoring, dict) else []
        for a in mon_alerts:
            if isinstance(a, dict) and a.get("severity") in ("high", "medium"):
                alerts.append({
                    "type": "PEST",
                    "severity": a.get("severity", "medium"),
                    "title": "Crop Health Nudge",
                    "message": a.get("message", "Scout field for potential pest activity."),
                    "action": "Inspect crop canopy and leaves.",
                    "source": monitoring.get("source", "Satellite Crop Monitoring"),
                    "created_at": now,
                })

        # Default priorities if pipeline is just starting
        if not priorities:
            priorities.append({
                "title": "📋 Complete Farm Diagnostics",
                "reason": f"Initial onboarding complete for {district} farm.",
                "urgency": "medium",
                "recommended_action": "Run Soil, Weather, and Market Intelligence agents to generate personalized crop recommendations.",
                "source": "Krishi Agent System",
                "agent": "system",
            })

        # ── 3. Crop Decision Snapshot ─────────────────────────────────
        crop_decision: Dict[str, Any] = {}
        if crop_shortlist and len(crop_shortlist) > 0:
            top_crop = crop_shortlist[0] if isinstance(crop_shortlist[0], dict) else {"crop": str(crop_shortlist[0])}
            is_est_crop = bool(soil.get("is_estimated") or weather.get("is_estimated"))
            crop_decision = {
                "recommended_crop": top_crop.get("crop", "Cotton"),
                "varieties": top_crop.get("variety_suggestions", ["High-yielding hybrid"]),
                "suitability_score": top_crop.get("total_score") or top_crop.get("agronomic_fit_score") or 0.85,
                "expected_duration_days": top_crop.get("expected_duration_days", 120),
                "why_crop": top_crop.get("reasoning") or crop_rec_summary or f"Optimal fit for {soil.get('soil_type', 'regional')} soil and {district} climate.",
                "source": "ICAR Agronomic & Market Suitability Model",
                "confidence": 0.90 if not is_est_crop else 0.78,
                "is_estimated": is_est_crop,
                "data_status": "estimated" if is_est_crop else "measured",
                "generated_at": now,
                "factors": {
                    "soil": f"pH {soil.get('ph', 6.8)} ({soil.get('soil_type', 'clay loam')})",
                    "weather": f"Expected rainfall {total_rain}mm in 7 days",
                    "market": f"Price trend: {market_decision.get('price_trend', 'stable')}",
                }
            }

        # ── 4. Financial Snapshot ─────────────────────────────────────
        est_cost = budget.get("estimated_cost") or int(profile.get("land_size", 1.0) * 25000)
        est_margin = budget.get("expected_margin") or int(est_cost * 0.4)
        is_est_fin = bool(budget.get("is_estimated", True))
        financial_snapshot = {
            "estimated_input_cost_inr": est_cost,
            "cost_per_acre_inr": budget.get("cost_per_acre") or int(est_cost / max(1.0, profile.get("land_size", 1.0))),
            "expected_net_margin_inr": est_margin,
            "roi_pct": budget.get("roi_pct") or 40.0,
            "kcc_credit_available_inr": credit.get("credit_offers", [{}])[0].get("max_amount") if isinstance(credit.get("credit_offers"), list) and credit.get("credit_offers") else min(300000, int(profile.get("land_size", 1.0) * 50000)),
            "pmfby_eligible": insurance.get("eligibility", {}).get("pmfby_eligible", True),
            "trust_level": "Calculated Estimate" if is_est_fin else "Measured Budget Model",
            "is_estimated": is_est_fin,
            "data_status": "estimated" if is_est_fin else "measured",
            "generated_at": now,
        }

        # Executive Summary
        exec_summary = (
            f"Farm Intelligence active for {profile.get('name', 'Farmer')} in {district}. "
            f"Current phase is '{current_phase}'. "
            f"{'Top crop recommendation: ' + crop_decision['recommended_crop'] + '.' if crop_decision.get('recommended_crop') else 'Run diagnostics to receive tailored crop choices.'}"
        )

        source_agents = [
            k for k, v in {
                "soil": soil, "weather": weather, "market_intelligence": market,
                "crop_recommendation": crop_shortlist, "irrigation": input_plan,
                "budget_estimator": budget, "input_verification": dealers,
                "scheme_insurance": insurance, "credit": credit,
                "crop_monitoring": monitoring, "advisory": advisory,
                "storage_sell_timing": storage, "market_linkage": linkage,
                "feedback": feedback
            }.items() if v
        ]

        return {
            "summary": exec_summary,
            "farmer_id": farmer_id,
            "season_id": season_id,
            "district": district,
            "timeline": timeline,
            "priorities": priorities,
            "alerts": alerts,
            "weather_actions": weather_actions,
            "market_decision": market_decision,
            "crop_decision": crop_decision,
            "financial_snapshot": financial_snapshot,
            "source_agents": source_agents,
            "generated_at": now,
        }
