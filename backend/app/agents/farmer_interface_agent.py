from typing import List, Optional
from pydantic import BaseModel, Field
from .base_agent import BaseAgent

class FarmerProfile(BaseModel):
    name: str = Field(description="Full name of the farmer.")
    phone: str = Field(description="Mobile number of the farmer.")
    location: str = Field(description="District/State or village location of the farmer.")
    land_size: float = Field(default=1.0, description="Total land holding in acres.")
    water_source: str = Field(default="rainfed", description="Irrigation water source e.g. borewell, canal, rainfed.")
    past_crops: List[str] = Field(default_factory=list, description="Crops grown in past seasons.")
    budget: float = Field(default=0.0, description="Available working capital/budget in INR.")
    language: str = Field(default="en", description="Preferred interaction language code.")
    notes: str = Field(default="", description="Key farmer goals or constraints.")

class FarmerInterfaceAgent(BaseAgent):
    """Processes farmer voice/text input and validates profile details using LLM reasoning."""

    SYSTEM_PROMPT = (
        "You are an expert Indian Agricultural Onboarding Agent. Your goal is to review raw "
        "farmer input data (voice transcription or web registration form) and extract a verified, "
        "clean FarmerProfile schema with standardized agricultural terms suitable for crop planning. "
        "If land_size, water_source, past_crops, or budget are not provided, infer reasonable "
        "defaults based on the district and typical smallholder farming patterns in that region."
    )

    def run(self, state: dict) -> dict:
        # Map incoming API/onboarding fields to the profile schema.
        # The /onboard endpoint sends {name, phone, district, language}.
        # We normalize district -> location and merge with any existing profile in state.
        raw_profile = state.get("profile", {})
        # If the state already has a well-formed profile (from a prior run), use it
        if not raw_profile or "location" not in raw_profile:
            raw_profile = {
                "name": raw_profile.get("name", state.get("name", "Farmer")),
                "phone": raw_profile.get("phone", state.get("phone", "")),
                "location": raw_profile.get("location", state.get("district", "India")),
                "land_size": raw_profile.get("land_size", state.get("land_size", 1.0)),
                "water_source": raw_profile.get("water_source", state.get("water_source", "rainfed")),
                "past_crops": raw_profile.get("past_crops", state.get("past_crops", [])),
                "budget": raw_profile.get("budget", state.get("budget", 0.0)),
                "language": raw_profile.get("language", state.get("language", "en")),
                "notes": raw_profile.get("notes", ""),
            }

        if self.api_key:
            try:
                user_content = f"Standardize and validate the following farmer onboarding data:\n{raw_profile}"
                validated_profile = self.call_llm(
                    system_prompt=self.SYSTEM_PROMPT,
                    user_content=user_content,
                    response_schema=FarmerProfile
                )
                return {"profile": validated_profile.model_dump()}
            except Exception as e:
                logger.warning(f"[FARMER_INTERFACE] LLM validation failed: {e}. Using raw profile.")
                return {"profile": raw_profile}

        # Fallback if no API key provided
        return {"profile": raw_profile}
