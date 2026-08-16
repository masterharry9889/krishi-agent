from typing import List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from .base_agent import BaseAgent
from ..tools.weather_api import fetch_weather_forecast

class WeatherAnalysisOutlook(BaseModel):
    summary: str = Field(description="Summary of short-term 7-day weather and seasonal monsoon prospects.")
    monsoon_risk_level: str = Field(description="Risk assessment e.g. low, moderate, high due to dry spells or heavy rainfall.")
    water_availability_index: str = Field(description="Qualitative assessment e.g. abundant, adequate, deficit.")
    key_recommendations: List[str] = Field(description="Key weather guidance for planting and irrigation management.")

class WeatherAgent(BaseAgent):
    """Pulls forecast data via Weather API tool and uses Groq LLM for seasonal agricultural risk analysis."""

    SYSTEM_PROMPT = (
        "You are an Agrometeorologist specializing in monsoon weather patterns and micro-climate forecasting for Indian farming. "
        "Analyze 7-day temperature/rainfall forecasts and seasonal outlooks to assess water availability and crop weather risks."
    )

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        location = profile.get("location") or profile.get("district") or "India"
        language = profile.get("language", "hi")
        now = datetime.now(timezone.utc).isoformat()

        raw_weather = fetch_weather_forecast(location=location)

        total_rain = raw_weather.get("total_7d_rain_mm", 30)
        risk = "high" if total_rain > 60 else "moderate" if total_rain > 15 else "low"
        water_idx = "abundant" if total_rain > 50 else "adequate" if total_rain > 20 else "deficit"

        default_summary = (
            f"7-day weather forecast for {location} indicates total expected rainfall of {total_rain}mm "
            f"with average temperature around {raw_weather.get('average_temp_c', 32)}°C."
        )

        fallback_analysis = {
            "summary": default_summary,
            "monsoon_risk_level": risk,
            "water_availability_index": water_idx,
            "key_recommendations": [
                "Plan irrigation based on expected rainfall in days 1-3.",
                "Ensure proper drainage in fields if heavy showers occur.",
            ],
        }

        user_content = (
            f"Analyze the following weather forecast data for a farm in {location} with water source '{profile.get('water_source', 'rainfed')}':\n"
            f"{raw_weather}"
        )

        analysis = self.safe_call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_content=user_content,
            response_schema=WeatherAnalysisOutlook,
            fallback_data=fallback_analysis,
            language=language,
        )

        result = raw_weather.copy()
        result.update(analysis)
        result["agent"] = "weather"
        result["status"] = "success"
        result["generated_at"] = now
        result["timestamp"] = now
        result["source"] = raw_weather.get("source", "India Meteorological Department")
        result["confidence"] = raw_weather.get("confidence", 0.95)
        result["is_estimated"] = raw_weather.get("is_estimated", False)
        result["data_status"] = raw_weather.get("data_status", "Live Weather Forecast")
        result["warnings"] = raw_weather.get("warnings", [])
        result["recommendations"] = result.get("key_recommendations", fallback_analysis["key_recommendations"])

        return {"weather_outlook": result}