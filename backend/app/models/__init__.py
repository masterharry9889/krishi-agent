"""
Pydantic models for the Krishi Agent API.
These models define the request and response schemas for the FastAPI endpoints,
ensuring proper validation and documentation in OpenAPI/Swagger.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class OnboardRequest(BaseModel):
    """Request payload for POST /api/v1/onboard."""
    name: str = Field(..., min_length=2, max_length=100, description="Full name of the farmer.")
    phone: str = Field(..., min_length=10, max_length=15, description="Mobile number (digits, optional +91 prefix).")
    district: str = Field(..., min_length=2, max_length=100, description="District name, e.g. Nashik.")
    language: str = Field(default="hi", description="Preferred language code, e.g. hi, mr, ta.")
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters).")
    confirm_password: Optional[str] = Field(default=None, description="Password confirmation.")


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
    password: str = Field(..., description="Account password.")


class FarmerSetupPasswordRequest(BaseModel):
    """Request payload for POST /api/v1/farmer/setup-password."""
    phone: str = Field(..., min_length=10, max_length=15, description="Registered mobile number.")
    password: str = Field(..., min_length=8, description="New password (minimum 8 characters).")
    confirm_password: Optional[str] = Field(default=None, description="Password confirmation.")


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
