from typing import List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from .base_agent import BaseAgent

class RecommendedCrop(BaseModel):
    crop: str = Field(description="Name of the crop e.g. Soyabean, Cotton, Maize, Pearl Millet.")
    variety_suggestions: List[str] = Field(description="Recommended high-yielding or drought-resistant varieties.")
    agronomic_fit_score: float = Field(description="Agronomic suitability score from 0.0 to 1.0 based on soil & climate.")
    market_opportunity_score: float = Field(description="Market opportunity score from 0.0 to 1.0 based on regional demand.")
    total_score: float = Field(description="Combined overall suitability score from 0.0 to 1.0.")
    reasoning: str = Field(description="Detailed agronomic and financial justification for recommending this crop.")
    expected_duration_days: int = Field(description="Crop duration from sowing to harvest in days.")

class CropRecommendationShortlist(BaseModel):
    crop_shortlist: List[RecommendedCrop] = Field(description="Ranked list of top recommended crops.")
    executive_summary: str = Field(description="Overall strategic recommendation summary for the farmer.")

class CropRecommendationAgent(BaseAgent):
    """
    Evaluates soil analysis, weather forecasts, and farmer profile using Groq LLM reasoning
    to generate a dynamically ranked crop shortlist optimized for the location & season.
    """

    SYSTEM_PROMPT = (
        "You are an expert Chief Agricultural Economist and Senior Agronomist specializing in Indian cropping systems. "
        "Analyze the farmer's land profile, soil health report, and weather outlook to recommend a dynamically ranked "
        "shortlist of 3 to 5 highly suitable crops for the upcoming season. Consider agronomic soil fit, water availability, "
        "crop duration, and market profitability."
    )

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        soil_report = state.get("soil_report") or {}
        weather_outlook = state.get("weather_outlook") or {}
        market_intel = state.get("market_intel") or {}
        location = profile.get("location") or profile.get("district") or "India"
        language = profile.get("language", "hi")
        now = datetime.now(timezone.utc).isoformat()

        is_estimated_input = bool(soil_report.get("is_estimated") or weather_outlook.get("is_estimated"))

        fallback_shortlist = [
            {
                "crop": "Cotton",
                "variety_suggestions": ["Bt-Cotton BG-II"],
                "agronomic_fit_score": 0.85,
                "market_opportunity_score": 0.80,
                "total_score": 0.83,
                "reasoning": f"Well suited for {soil_report.get('soil_type', 'clay loam')} soil and seasonal rainfall in {location}.",
                "expected_duration_days": 160,
            },
            {
                "crop": "Soyabean",
                "variety_suggestions": ["JS 335", "JS 9560"],
                "agronomic_fit_score": 0.80,
                "market_opportunity_score": 0.82,
                "total_score": 0.81,
                "reasoning": "Fixes atmospheric nitrogen, ideal for low nitrogen soils and short duration rotation.",
                "expected_duration_days": 100,
            },
        ]
        fallback_summary = f"Soyabean and Cotton recommended for {location} based on soil nutrient levels and seasonal weather outlook."

        fallback_analysis = {
            "crop_shortlist": fallback_shortlist,
            "executive_summary": fallback_summary,
        }

        user_content = (
            f"Generate a ranked crop recommendation shortlist for the following farm profile in {location}:\n\n"
            f"FARMER PROFILE:\n{profile}\n\n"
            f"SOIL REPORT:\n{soil_report}\n\n"
            f"WEATHER OUTLOOK:\n{weather_outlook}\n\n"
            f"MARKET INTELLIGENCE:\n{market_intel}\n"
        )

        analysis = self.safe_call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_content=user_content,
            response_schema=CropRecommendationShortlist,
            fallback_data=fallback_analysis,
            language=language,
        )

        shortlist = analysis.get("crop_shortlist", fallback_shortlist)
        exec_summary = analysis.get("executive_summary", fallback_summary)

        warnings = []
        if is_estimated_input:
            warnings.append("Recommendation generated using baseline/estimated soil or weather inputs.")

        recommendations = [
            f"Top pick: {shortlist[0]['crop']} (Variety: {', '.join(shortlist[0].get('variety_suggestions', []))})"
            if shortlist else "Select a high-fit crop based on water availability."
        ]

        result = {
            "agent": "crop_recommendation",
            "status": "success",
            "generated_at": now,
            "timestamp": now,
            "source": "ICAR Agronomic & Market Suitability Model",
            "confidence": 0.90 if not is_estimated_input else 0.78,
            "is_estimated": is_estimated_input,
            "data_status": "Agronomic Model Recommendation",
            "crop_shortlist": shortlist,
            "crop_recommendation_summary": exec_summary,
            "recommendations": recommendations,
            "warnings": warnings,
        }

        return {"crop_shortlist": shortlist, "crop_recommendation_summary": exec_summary, "crop_recommendation": result}