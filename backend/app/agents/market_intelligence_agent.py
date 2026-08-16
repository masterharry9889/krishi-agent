from typing import List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from .base_agent import BaseAgent
from ..tools.agmarknet_market_api import fetch_market_intelligence

class MarketCommodityItem(BaseModel):
    crop: str = Field(description="Name of the crop e.g. Cotton, Soyabean, Maize.")
    demand: str = Field(description="Demand level: high, medium, low.")
    supply: str = Field(description="Supply level: high, medium, low.")
    price_trend: str = Field(description="Price trend: rising, falling, stable.")
    best_mandi: str = Field(description="Best APMC market for selling.")
    modal_price_inr: float = Field(description="Current modal price in INR per quintal.")

class MarketIntelReport(BaseModel):
    commodities: List[MarketCommodityItem] = Field(description="Commodity demand-supply and pricing analysis.")
    summary: str = Field(description="Market intelligence executive summary for the district.")

class MarketIntelligenceAgent(BaseAgent):
    """Scans demand-supply gap across nearby mandis using Agmarknet tool & Groq LLM reasoning."""

    SYSTEM_PROMPT = (
        "You are an expert Agricultural Commodity Market Analyst for Indian farming. "
        "Analyze regional mandi prices, demand-supply dynamics, and market price trends to advise farmers on "
        "crop market prospects and selling strategies."
    )

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        district = profile.get("district") or profile.get("location") or "India"
        language = profile.get("language", "hi")
        now = datetime.now(timezone.utc).isoformat()

        raw_market = fetch_market_intelligence(district=district)

        fallback_commodities = [
            {
                "crop": c.get("crop", "Crop"),
                "mandi": c.get("mandi", f"{district} APMC"),
                "best_mandi": c.get("mandi", f"{district} APMC"),
                "demand": c.get("demand_level", "high"),
                "supply": c.get("supply_level", "medium"),
                "price_trend": c.get("price_trend", "rising"),
                "modal_price_inr": c.get("modal_price", 4500.0),
            }
            for c in raw_market.get("commodities", [])
        ]
        fallback_summary = raw_market.get("summary") or f"Regional demand shows favorable price trends in {district} mandis."

        fallback_analysis = {
            "commodities": fallback_commodities,
            "summary": fallback_summary,
        }

        user_content = (
            f"Analyze the following market mandi price data for {district} district:\n"
            f"{raw_market}"
        )

        analysis = self.safe_call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_content=user_content,
            response_schema=MarketIntelReport,
            fallback_data=fallback_analysis,
            language=language,
        )

        result = raw_market.copy()
        result.update(analysis)
        result["agent"] = "market_intelligence"
        result["status"] = "success"
        result["generated_at"] = now
        result["timestamp"] = now
        result["source"] = raw_market.get("source", "Agmarknet / e-NAM Mandi Portal")
        result["confidence"] = raw_market.get("confidence", 0.90)
        result["is_estimated"] = raw_market.get("is_estimated", False)
        result["data_status"] = raw_market.get("data_status", "Live Mandi Data")
        result["warnings"] = raw_market.get("warnings", [])
        result["recommendations"] = [
            f"Monitor price trends in {district} APMC prior to harvesting.",
            "Consider e-NAM electronic trading for competitive buyer discovery.",
        ]

        return {"market_intel": result}
