"""
Shared Pydantic schemas for all structured agent outputs.
This is the SINGLE SOURCE OF TRUTH for output validation across the pipeline.
Agents and the validation layer both import from here to catch schema drift at dev time.
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


# ─── Base Agent Output Schema ──────────────────────────────────────────
class BaseAgentOutput(BaseModel):
    """Fields every agent output MUST include."""
    agent: str = Field(description="Canonical agent key (e.g. 'crop_recommendation')")
    status: Literal["success", "error", "partial"] = Field(default="success")
    generated_at: str = Field(description="ISO8601 timestamp")
    timestamp: str = Field(description="ISO8601 timestamp (alias for generated_at)")
    source: str = Field(description="Data source citation")
    confidence: float = Field(ge=0.0, le=1.0, description="Agent's self-reported confidence")
    is_estimated: bool = Field(default=False, description="Whether output uses estimated/fallback data")
    data_status: str = Field(description="Human-readable status label")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations for farmer")
    warnings: List[str] = Field(default_factory=list, description="Cautions/limitations for farmer")


# ─── Structured Output Schemas ─────────────────────────────────────────

class RecommendedCrop(BaseModel):
    crop: str
    variety_suggestions: List[str] = Field(default_factory=list)
    agronomic_fit_score: float = Field(ge=0.0, le=1.0)
    market_opportunity_score: float = Field(ge=0.0, le=1.0)
    total_score: float = Field(ge=0.0, le=1.0)
    reasoning: str
    expected_duration_days: int = Field(gt=0)


class CropRecommendationOutput(BaseAgentOutput):
    agent: Literal["crop_recommendation"]
    crop_shortlist: List[RecommendedCrop]
    executive_summary: str


class SoilAgentOutput(BaseAgentOutput):
    agent: Literal["soil"]
    location: str
    ph: float
    organic_carbon: float
    nitrogen: float
    phosphorus: float
    potassium: float
    texture: Optional[str] = None
    salinity: Optional[str] = None


class WeatherAgentOutput(BaseAgentOutput):
    agent: Literal["weather"]
    location: str
    forecast_7d: List[Dict[str, Any]] = Field(default_factory=list)
    seasonal_outlook: Optional[str] = None


class MarketIntelOutput(BaseAgentOutput):
    agent: Literal["market_intelligence"]
    location: str
    demand_supply_gap: Dict[str, float] = Field(default_factory=dict)
    price_trend: Optional[str] = None


class ResourceIrrigationOutput(BaseAgentOutput):
    agent: Literal["irrigation"]
    irrigation_schedule: Dict[str, Any]
    fertilizer_recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    water_source: str
    labor_estimate_days: int = Field(default=0, ge=0)


class BudgetEstimatorOutput(BaseAgentOutput):
    agent: Literal["budget_estimator"]
    crop: str
    land_size_acres: float = Field(gt=0)
    cost_breakdown: Dict[str, float]
    estimated_cost: float = Field(ge=0)
    cost_per_acre: float = Field(ge=0)
    estimated_revenue: float = Field(ge=0)
    expected_margin: float
    roi_pct: float


class InputVerificationOutput(BaseAgentOutput):
    agent: Literal["input_verification"]
    location: str
    dealers_by_type: List[Dict[str, Any]]
    counterfeit_check: Dict[str, Any]


class SchemeInsuranceOutput(BaseAgentOutput):
    agent: Literal["scheme_insurance"]
    location: str
    selected_crop: str
    eligibility: Dict[str, Any]
    schemes: List[Dict[str, Any]]
    key_deadlines: Dict[str, str]


class CreditAgentOutput(BaseAgentOutput):
    agent: Literal["credit"]
    land_size_acres: float = Field(ge=0)
    budget_required: float = Field(ge=0)
    credit_offers: List[Dict[str, Any]]


class CropMonitoringOutput(BaseAgentOutput):
    agent: Literal["crop_monitoring"]
    crop: str
    district: str
    ndvi_score: float = Field(ge=0.0, le=1.0)
    vegetation_status: str
    monitoring_alerts: List[Dict[str, Any]]


class AdvisoryOutput(BaseAgentOutput):
    agent: Literal["advisory"]
    advisory_log: List[str]


class StorageSellTimingOutput(BaseAgentOutput):
    agent: Literal["storage_sell_timing"]
    sell_recommendation: Dict[str, Any]


class MarketLinkageOutput(BaseAgentOutput):
    agent: Literal["market_linkage"]
    market_options: List[Dict[str, Any]] = Field(default_factory=list)


class FeedbackAgentOutput(BaseAgentOutput):
    agent: Literal["feedback"]
    season_feedback: Dict[str, Any]


class DiseaseDetectionOutput(BaseAgentOutput):
    agent: Literal["disease_detection"]
    disease_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    affected_crop: str
    symptoms_observed: List[str]
    is_healthy: bool
    needs_human_review: bool


class DiseaseResearchOutput(BaseAgentOutput):
    agent: Literal["disease_research"]
    disease_name: str
    severity_note: str
    recommended_actions: List[str]
    prevention_tips: List[str]
    when_to_seek_expert_help: str
    sources: Optional[List[str]] = None


# ─── Union type for validation dispatch ────────────────────────────────
AgentOutputUnion = (
    CropRecommendationOutput | SoilAgentOutput | WeatherAgentOutput |
    MarketIntelOutput | ResourceIrrigationOutput | BudgetEstimatorOutput |
    InputVerificationOutput | SchemeInsuranceOutput | CreditAgentOutput |
    CropMonitoringOutput | AdvisoryOutput | StorageSellTimingOutput |
    MarketLinkageOutput | FeedbackAgentOutput | DiseaseDetectionOutput |
    DiseaseResearchOutput
)

# ─── Validation Result Schema ──────────────────────────────────────────
class ValidationResult(BaseModel):
    """Result of validation layer processing."""
    passed: bool
    validated_output: Optional[Dict[str, Any]] = None
    fallback_message: Optional[str] = None
    failure_reason: Optional[str] = None
    failure_category: Optional[Literal[
        "schema_validation",
        "confidence_threshold",
        "pesticide_caution_missing",
        "financial_certainty_overstated",
        "unsupported_claim",
        "language_mismatch",
        "off_topic_input",
        "prompt_injection",
        "invalid_image_upload"
    ]] = None


# ─── Language codes ────────────────────────────────────────────────────
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "pa": "Punjabi",
    "gu": "Gujarati",
    "bn": "Bengali",
}

# Confidence threshold for disease diagnosis (from crop_monitoring_agent alerts)
DISEASE_CONFIDENCE_THRESHOLD = 0.75