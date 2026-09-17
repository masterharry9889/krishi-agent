"""
Pydantic models for the Krishi Agent API.
These models define the request and response schemas for the FastAPI endpoints,
ensuring proper validation and documentation in OpenAPI/Swagger.
"""
import re
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator

SUPPORTED_LANGUAGES = {"hi", "mr", "ta", "pa", "te", "kn", "gu", "bn", "en"}
PHONE_REGEX = re.compile(r"^\+?[0-9]{10,15}$")


def _sanitize_string(val: str, field_name: str) -> str:
    cleaned = val.strip()
    if "<" in cleaned or ">" in cleaned:
        raise ValueError(f"{field_name} must not contain HTML or angle brackets.")
    return cleaned


class OnboardRequest(BaseModel):
    """Request payload for POST /api/v1/onboard."""
    name: str = Field(..., min_length=2, max_length=100, description="Full name of the farmer.")
    phone: str = Field(..., min_length=10, max_length=15, description="Mobile number (digits, optional +91 prefix).")
    district: str = Field(..., min_length=2, max_length=100, description="District name, e.g. Nashik.")
    language: str = Field(default="hi", description="Preferred language code, e.g. hi, mr, ta.")
    password: str = Field(..., min_length=8, max_length=128, description="Password (minimum 8 characters).")
    confirm_password: Optional[str] = Field(default=None, description="Password confirmation.")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return _sanitize_string(v, "Name")

    @field_validator("district")
    @classmethod
    def validate_district(cls, v: str) -> str:
        return _sanitize_string(v, "District")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v_stripped = v.strip()
        if not PHONE_REGEX.match(v_stripped):
            raise ValueError("Phone number must contain 10-15 digits with optional leading +.")
        return v_stripped

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        lang = v.strip().lower()
        if lang not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language '{v}'. Supported: {sorted(SUPPORTED_LANGUAGES)}")
        return lang


class OnboardResponse(BaseModel):
    """Response payload for POST /api/v1/onboard."""
    farmer_id: str = Field(..., description="Unique farmer identifier (UUID).")
    season_id: str = Field(..., description="Unique season identifier (UUID).")
    status: str = Field(..., description="Registration status, e.g. 'registered'.")
    access_token: Optional[str] = Field(default=None, description="Farmer JWT session token.")
    token_type: str = Field(default="bearer", description="Token type.")


class FarmerLoginRequest(BaseModel):
    """Request payload for POST /api/v1/farmer/login."""
    phone: str = Field(..., min_length=10, max_length=15, description="Registered mobile number.")
    password: str = Field(..., max_length=128, description="Account password.")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v_stripped = v.strip()
        if not PHONE_REGEX.match(v_stripped):
            raise ValueError("Invalid phone number format.")
        return v_stripped


class FarmerSetupPasswordRequest(BaseModel):
    """Request payload for POST /api/v1/farmer/setup-password."""
    phone: str = Field(..., min_length=10, max_length=15, description="Registered mobile number.")
    password: str = Field(..., min_length=8, max_length=128, description="New password (minimum 8 characters).")
    confirm_password: Optional[str] = Field(default=None, description="Password confirmation.")
    old_password: Optional[str] = Field(default=None, max_length=128, description="Current password (required if password already set).")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v_stripped = v.strip()
        if not PHONE_REGEX.match(v_stripped):
            raise ValueError("Invalid phone number format.")
        return v_stripped


class FarmerLoginResponse(BaseModel):
    """Response payload for POST /api/v1/farmer/login."""
    access_token: str
    token_type: str = "bearer"
    farmer_id: str
    season_id: str
    name: str
    district: str
    language: str


class OrchestrateRequest(BaseModel):
    """Request payload for POST /api/v1/farmers/{farmer_id}/seasons/{season_id}/orchestrate."""
    force_refresh: bool = Field(default=False, description="Whether to re-run agents even if output is fresh.")
    agents_to_run: Optional[List[str]] = Field(default=None, description="Optional specific list of agent keys to run.")


class FarmerFeedbackRequest(BaseModel):
    """Request payload for POST /api/v1/farmers/{farmer_id}/seasons/{season_id}/feedback."""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 (poor) to 5 (excellent).")
    used_recommendation: bool = Field(default=True, description="Whether the farmer followed the AI recommendations.")
    actual_yield: Optional[float] = Field(default=None, description="Actual harvest yield realized (quintals/acre).")
    actual_price: Optional[float] = Field(default=None, description="Actual price realized (INR/quintal).")
    actual_cost: Optional[float] = Field(default=None, description="Actual total input cost incurred (INR/acre).")
    notes: Optional[str] = Field(default=None, description="Farmer notes or qualitative feedback.")


class FarmerFeedbackResponse(BaseModel):
    """Response payload for farmer feedback submission."""
    farmer_id: str
    season_id: str
    status: str = "success"
    message: str = "Feedback saved successfully."
    timestamp: str


class FarmerProfileUpdateRequest(BaseModel):
    """Request payload for PATCH /api/v1/farmers/{farmer_id}/profile."""
    name: Optional[str] = Field(default=None, min_length=2, max_length=100, description="Full name of the farmer.")
    district: Optional[str] = Field(default=None, min_length=2, max_length=100, description="District / Place name.")
    state: Optional[str] = Field(default=None, max_length=100, description="State name.")
    village: Optional[str] = Field(default=None, max_length=100, description="Village or Tehsil.")
    pincode: Optional[str] = Field(default=None, max_length=10, description="Postal pincode.")
    language: Optional[str] = Field(default=None, description="Preferred language code (e.g. hi, mr, ta, en).")
    land_size: Optional[float] = Field(default=None, ge=0.05, le=100000.0, description="Farm land size in acres.")
    ownership: Optional[str] = Field(default=None, max_length=50, description="Land ownership (owned, leased, etc.).")
    soil_type: Optional[str] = Field(default=None, max_length=100, description="Soil classification.")
    soil_ph: Optional[str] = Field(default=None, max_length=50, description="Soil pH or reaction.")
    water_source: Optional[str] = Field(default=None, max_length=100, description="Primary water source.")
    irrigation_type: Optional[str] = Field(default=None, max_length=100, description="Irrigation method.")
    past_crops: Optional[List[str]] = Field(default=None, description="List of previous crops grown.")
    current_crops: Optional[List[str]] = Field(default=None, description="Target/current season crops.")
    farming_type: Optional[str] = Field(default=None, max_length=100, description="Farming methodology (conventional, organic, etc.).")
    experience_years: Optional[int] = Field(default=None, ge=0, le=100, description="Years of farming experience.")
    cattle_count: Optional[int] = Field(default=None, ge=0, le=1000, description="Number of livestock / cattle.")
    equipment: Optional[str] = Field(default=None, max_length=100, description="Farm equipment & mechanization.")
    has_storage: Optional[bool] = Field(default=None, description="Whether on-farm or warehouse storage is available.")
    budget: Optional[float] = Field(default=None, ge=0.0, description="Working capital budget in INR.")
    notes: Optional[str] = Field(default=None, max_length=2000, description="General farm observations and agronomic notes.")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _sanitize_string(v, "Name")
        return v

    @field_validator("district")
    @classmethod
    def validate_district(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _sanitize_string(v, "District")
        return v

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            lang = v.strip().lower()
            if lang not in SUPPORTED_LANGUAGES:
                raise ValueError(f"Unsupported language '{v}'. Supported: {sorted(SUPPORTED_LANGUAGES)}")
            return lang
        return v
