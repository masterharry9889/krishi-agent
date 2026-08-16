from typing import Dict, Any
from datetime import datetime, timezone
from .base_agent import BaseAgent

class BudgetEstimatorAgent(BaseAgent):
    """Calculates estimated costs, expected revenue, and margin for the season."""

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        input_plan = state.get("input_plan") or {}
        crop_shortlist = state.get("crop_shortlist", [])
        selected_crop = state.get("selected_crop", "")
        now = datetime.now(timezone.utc).isoformat()

        land_size = profile.get("land_size", 1.0)

        crop = selected_crop
        if not crop and crop_shortlist:
            crop = crop_shortlist[0].get("crop", "Unknown") if isinstance(crop_shortlist[0], dict) else str(crop_shortlist[0])
        if not crop:
            crop = "Not yet selected"

        seed_cost = self._seed_cost(crop, land_size)
        fertilizer_cost = self._fertilizer_cost(input_plan, land_size)
        irrigation_cost = int(input_plan.get("irrigation_schedule", {}).get("volume_liters_per_acre", 2500) * 0.05 * land_size)
        labor_cost = int(input_plan.get("labor_estimate_days", int(land_size * 3)) * 300)
        machinery_cost = int(land_size * 2000)

        total_cost = seed_cost + fertilizer_cost + irrigation_cost + labor_cost + machinery_cost
        cost_per_acre = round(total_cost / land_size, 2) if land_size > 0 else 0

        expected_price_map = {
            "Cotton": 120.0, "Soyabean": 4200.0, "Maize": 25.0,
            "Wheat": 22.0, "Rice": 20.0, "Pearl Millet": 18.0,
            "Sugarcane": 4.0, "Groundnut": 55.0,
        }
        price_per_unit = expected_price_map.get(crop, 25.0)
        yield_per_acre_map = {
            "Cotton": 500, "Soyabean": 1.0, "Maize": 30,
            "Wheat": 35, "Rice": 40, "Pearl Millet": 15,
            "Sugarcane": 700, "Groundnut": 1500,
        }
        yield_per_acre = yield_per_acre_map.get(crop, 20)
        revenue = round(land_size * yield_per_acre * price_per_unit, 2)

        margin = round(revenue - total_cost, 2)
        roi_pct = round((margin / total_cost * 100), 1) if total_cost > 0 else 0

        is_estimated = bool(input_plan.get("is_estimated"))

        result = {
            "agent": "budget_estimator",
            "status": "success",
            "generated_at": now,
            "timestamp": now,
            "source": "Krishi Agricultural Cost & Revenue Estimator",
            "confidence": 0.88 if not is_estimated else 0.75,
            "is_estimated": is_estimated,
            "data_status": "Estimated Cost & Margin Projection",
            "crop": crop,
            "land_size_acres": land_size,
            "cost_breakdown": {
                "seeds": seed_cost,
                "fertilizers": fertilizer_cost,
                "irrigation": irrigation_cost,
                "labor": labor_cost,
                "machinery": machinery_cost,
            },
            "estimated_cost": total_cost,
            "cost_per_acre": cost_per_acre,
            "estimated_revenue": revenue,
            "expected_margin": margin,
            "roi_pct": roi_pct,
            "recommendations": [
                f"Estimated total budget requirement: ₹{total_cost:,} for {land_size} acre(s).",
                f"Expected net margin: ₹{margin:,} (ROI: {roi_pct}%).",
            ],
            "warnings": [w for w in input_plan.get("warnings", [])],
        }
        return {"budget_estimate": result}

    def _seed_cost(self, crop: str, land_size: float) -> int:
        costs = {
            "Cotton": 1200, "Soyabean": 1500, "Maize": 800,
            "Wheat": 600, "Rice": 1200, "Pearl Millet": 500,
            "Sugarcane": 8000, "Groundnut": 2000,
        }
        return int(costs.get(crop, 1000) * land_size)

    def _fertilizer_cost(self, input_plan: dict, land_size: float) -> int:
        recs = input_plan.get("fertilizer_recommendations", [])
        if recs:
            return int(len(recs) * 3000 * land_size)
        return int(5000 * land_size)
