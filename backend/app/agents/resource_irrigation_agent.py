from typing import Dict, Any, List
from datetime import datetime, timezone
from .base_agent import BaseAgent

class ResourceIrrigationAgent(BaseAgent):
    """Builds a resource allocation and irrigation plan based on agent context."""

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        soil_report = state.get("soil_report") or {}
        weather_outlook = state.get("weather_outlook") or {}
        crop_shortlist = state.get("crop_shortlist", [])
        selected_crop = state.get("selected_crop", "")
        now = datetime.now(timezone.utc).isoformat()

        land_size = profile.get("land_size", 1.0)
        water_source = profile.get("water_source", "rainfed")
        district = profile.get("district") or profile.get("location") or "India"

        crop = selected_crop
        if not crop and crop_shortlist:
            crop = crop_shortlist[0].get("crop", "Unknown") if isinstance(crop_shortlist[0], dict) else str(crop_shortlist[0])
        if not crop:
            crop = "Not yet selected"

        soil_n_status = soil_report.get("nitrogen_status", "unknown")
        soil_p_status = soil_report.get("phosphorus_status", "unknown")
        soil_k_status = soil_report.get("potassium_status", "unknown")

        fertilizer_recommendations: List[Dict[str, Any]] = []
        if soil_p_status in ("low", "deficient"):
            fertilizer_recommendations.append({"nutrient": "Phosphorus", "recommendation": "Apply 30-40 kg/acre of DAP or SSP", "reason": "Soil test shows low phosphorus"})
        if soil_n_status in ("low", "deficient"):
            fertilizer_recommendations.append({"nutrient": "Nitrogen", "recommendation": "Apply 40-50 kg/acre of urea in split doses", "reason": "Soil test shows low nitrogen"})
        if soil_k_status in ("low", "medium"):
            fertilizer_recommendations.append({"nutrient": "Potassium", "recommendation": "Apply 20-30 kg/acre of MOP/potash", "reason": f"Soil test shows {soil_k_status} potassium"})
        if not fertilizer_recommendations:
            fertilizer_recommendations.append({"nutrient": "Balanced NPK", "recommendation": "Apply 20-20-20 NPK at 50 kg/acre", "reason": "Soil nutrients are within adequate range"})

        forecast = weather_outlook.get("forecast_7d", []) if isinstance(weather_outlook, dict) else []
        total_rain = sum(d.get("rain_mm", 0) for d in forecast) if forecast else 0
        if total_rain < 25:
            irrigation_schedule = {"frequency": "Every 2-3 days", "volume_liters_per_acre": 4000, "method": "Drip / Furrow irrigation recommended"}
            water_note = "Low rainfall forecast — supplemental irrigation needed."
        elif total_rain < 75:
            irrigation_schedule = {"frequency": "Every 4-5 days", "volume_liters_per_acre": 2500, "method": "Rainfed with supplemental watering"}
            water_note = "Moderate rainfall expected — monitor soil moisture."
        else:
            irrigation_schedule = {"frequency": "Monitor only — no scheduled irrigation", "volume_liters_per_acre": 0, "method": water_source}
            water_note = "Adequate rainfall expected."

        seed_req = {
            "seed_type": crop,
            "quantity_per_acre": self._seed_quantity(crop),
            "variety": self._variety(crop, district),
        }

        is_estimated = bool(soil_report.get("is_estimated") or weather_outlook.get("is_estimated"))

        plan = {
            "agent": "irrigation",
            "status": "success",
            "generated_at": now,
            "timestamp": now,
            "source": "Krishi Input & Irrigation Planning Engine",
            "confidence": 0.90 if not is_estimated else 0.78,
            "is_estimated": is_estimated,
            "data_status": "Derived Input & Water Plan",
            "location": district,
            "crop": crop,
            "land_size_acres": land_size,
            "water_source": water_source,
            "seed_requirement": seed_req,
            "fertilizer_recommendations": fertilizer_recommendations,
            "irrigation_schedule": irrigation_schedule,
            "water_note": water_note,
            "labor_estimate_days": int(land_size * 3),
            "recommendations": [
                f"Use micro-irrigation ({irrigation_schedule.get('method')}) for water conservation.",
                f"Apply split dosage for nitrogen to maximize uptake efficiency.",
            ],
            "warnings": [w for w in (soil_report.get("warnings", []) + weather_outlook.get("warnings", []))],
        }
        return {"input_plan": plan}

    def _seed_quantity(self, crop: str) -> str:
        quantities = {
            "Cotton": "8-10 kg/acre (Bt Cotton)", "Soyabean": "3-4 kg/acre",
            "Maize": "20-25 kg/acre", "Wheat": "18-20 kg/acre",
            "Rice": "25-30 kg/acre", "Pearl Millet": "5-6 kg/acre",
            "Sugarcane": "30,000-40,000 setts/acre", "Groundnut": "8-10 kg/acre",
        }
        return quantities.get(crop, "10-15 kg/acre")

    def _variety(self, crop: str, district: str) -> str:
        varieties = {
            "Cotton": "Bt-Cotton BG-II (regional)", "Soyabean": "JS 335 / JS 9560",
            "Maize": "Hybrid P129", "Wheat": "HD 2967 / DBW 17",
            "Rice": "IR 64 / Sahbhagi Dhan", "Pearl Millet": "HHB 111",
            "Sugarcane": "Co 015 Cubone", "Groundnut": "TAG 22 / Narayana",
        }
        return varieties.get(crop, "Recommended regional variety")
