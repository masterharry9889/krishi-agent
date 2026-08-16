from typing import List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from .base_agent import BaseAgent
from ..tools.govt_soil_health_card import fetch_soil_health_card

class SoilAnalysisReport(BaseModel):
    ph: float = Field(description="Soil pH level.")
    soil_type: str = Field(description="Texture/type e.g. clay_loam, sandy_loam, alluvial.")
    primary_nutrients: Dict[str, str] = Field(description="Status of N, P, K e.g. {'nitrogen': 'low', 'phosphorus': 'medium', 'potassium': 'adequate'}")
    micronutrient_deficiencies: List[str] = Field(description="List of deficient micronutrients e.g. ['zinc', 'boron']")
    agronomic_summary: str = Field(description="Agronomist summary of soil strengths and corrective measures needed.")
    recommendations: List[str] = Field(default_factory=list, description="Key corrective agronomic recommendations.")

class SoilAgent(BaseAgent):
    """Pulls soil data via Soil Health Card tool and uses Groq LLM for expert agronomic analysis."""

    SYSTEM_PROMPT = (
        "You are an expert Agronomy Soil Scientist analyzing Soil Health Card test results for Indian farms. "
        "Your task is to interpret soil NPK levels, pH balance, and micronutrient deficiencies, and synthesize "
        "a clear agronomic soil assessment outlining soil fertility status and corrective conditioning requirements."
    )

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        location = profile.get("location") or profile.get("district") or "India"
        farmer_id = state.get("farmer_id", "DEFAULT")
        language = profile.get("language", "hi")
        now = datetime.now(timezone.utc).isoformat()

        # Fetch soil data using tool
        raw_soil_data = fetch_soil_health_card(location=location, farmer_id=farmer_id)

        default_summary = (
            f"Soil in {location} shows pH {raw_soil_data.get('ph', 6.8)} ({raw_soil_data.get('soil_type', 'clay_loam')}). "
            f"Nitrogen is {raw_soil_data.get('nitrogen_status', 'low')}, phosphorus is {raw_soil_data.get('phosphorus_status', 'medium')}, "
            f"and potassium is {raw_soil_data.get('potassium_status', 'adequate')}."
        )

        fallback_analysis = {
            "ph": raw_soil_data.get("ph", 6.8),
            "soil_type": raw_soil_data.get("soil_type", "clay_loam"),
            "primary_nutrients": {
                "nitrogen": raw_soil_data.get("nitrogen_status", "low"),
                "phosphorus": raw_soil_data.get("phosphorus_status", "medium"),
                "potassium": raw_soil_data.get("potassium_status", "adequate"),
            },
            "micronutrient_deficiencies": [
                k for k in ["zinc", "boron"] if raw_soil_data.get(f"{k}_status") == "deficient"
            ] or (raw_soil_data.get("micronutrient_deficiencies") or ["zinc"]),
            "agronomic_summary": default_summary,
            "recommendations": [
                "Apply 40 kg/acre urea to boost nitrogen level.",
                "Apply zinc sulphate 10 kg/acre for zinc deficiency.",
            ],
        }

        user_content = (
            f"Analyze the following Soil Health Card data for a farm located in {location}:\n"
            f"{raw_soil_data}"
        )

        analysis = self.safe_call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_content=user_content,
            response_schema=SoilAnalysisReport,
            fallback_data=fallback_analysis,
            language=language,
        )

        # Merge raw readings, metadata, contract fields, and analysis
        result = raw_soil_data.copy()
        result.update(analysis)
        result["agent"] = "soil"
        result["status"] = "success"
        result["generated_at"] = now
        result["timestamp"] = now
        result["source"] = raw_soil_data.get("source", "Soil Health Card (Government of India)")
        result["confidence"] = raw_soil_data.get("confidence", 0.95)
        result["is_estimated"] = raw_soil_data.get("is_estimated", False)
        result["data_status"] = raw_soil_data.get("data_status", "Measured Soil Data")
        result["warnings"] = raw_soil_data.get("warnings", [])

        if "recommendations" not in result or not result["recommendations"]:
            result["recommendations"] = [
                "Apply recommended organic manure (FYM) @ 5 tonnes/acre.",
                "Maintain balanced NPK ratio as per crop requirement.",
            ]

        return {"soil_report": result}