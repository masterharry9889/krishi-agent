from typing import TypedDict, Optional, Literal
from langgraph.graph import add_messages
from typing_extensions import Annotated

class FarmerState(TypedDict):
    farmer_id: str
    season_id: str
    profile: dict          # location, land size, water source, past crops, budget, language
    soil_report: Optional[dict]
    weather_outlook: Optional[dict]
    crop_shortlist: Optional[list[dict]]     # ranked crops w/ agronomic + market score
    selected_crop: Optional[str]
    input_plan: Optional[dict]               # resource/irrigation plan
    budget_estimate: Optional[dict]
    verified_dealers: Optional[list[dict]]
    insurance_status: Optional[dict]
    credit_offers: Optional[list[dict]]
    monitoring_alerts: list[dict]            # append-only, filled by background worker
    advisory_log: list[dict]                 # append-only
    harvest_ready: bool
    sell_recommendation: Optional[dict]
    sale_record: Optional[dict]
    season_feedback: Optional[dict]          # phase 8
    phase: Literal[
        "onboarding", "diagnostics", "recommendation", "planning",
        "monitoring", "harvest_decision", "market_linkage", "feedback"
    ]
    needs_human_confirmation: bool
    pending_confirmation_type: Optional[str]  # e.g. "crop_selection", "sell_now_vs_hold"