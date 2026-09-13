"""
Q&A Agent — Answers open-ended farmer questions using LLM-powered agronomic knowledge.
"""

from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from .base_agent import BaseAgent


# ── Pydantic Response Schema ─────────────────────────────────────────────────

class QAResponse(BaseModel):
    """Structured response from the Q&A agent."""
    answer: str = Field(
        ...,
        description="Clear, actionable answer to the farmer's question in their preferred language. 3-5 paragraphs max.",
    )
    topic: str = Field(
        default="general",
        description="Detected topic category: pest_management, sowing, irrigation, fertilizer, harvest, market, schemes, livestock, general, or off_topic.",
    )
    confidence: float = Field(
        default=0.85,
        description="Model confidence in the answer, 0.0 to 1.0.",
    )
    follow_up_suggestions: List[str] = Field(
        default_factory=list,
        description="2-3 suggested follow-up questions the farmer might want to ask next.",
    )
    sources: List[str] = Field(
        default_factory=list,
        description="Knowledge sources referenced (e.g. ICAR guidelines, KVK advisories).",
    )
    is_agriculture_related: bool = Field(
        default=True,
        description="Whether the question is related to agriculture/farming.",
    )


# ── System Prompt ─────────────────────────────────────────────────────────────

QA_SYSTEM_PROMPT = """You are **Krishi Mitra** — a senior agronomist and Krishi Vigyan Kendra (KVK) scientist 
serving Indian smallholder farmers. You have deep expertise in:

- Crop agronomy (cereals, pulses, oilseeds, vegetables, fruits, spices, cash crops)
- Integrated Pest Management (IPM) and disease identification
- Soil health, nutrient management, and fertilizer recommendations
- Irrigation methods (drip, sprinkler, flood, rainfed strategies)
- Post-harvest handling, storage, and grading
- Indian government schemes (PM-KISAN, PMFBY, KCC, PM-KUSUM, SHC, e-NAM)
- Market intelligence (APMC mandis, MSP, Agmarknet)
- Climate-smart and organic farming practices
- Livestock and allied activities (dairy, poultry, fisheries, beekeeping)

INSTRUCTIONS:
1. Answer in the farmer's preferred language. If context says language is "mr" use Marathi, 
   "hi" use Hindi, "te" use Telugu, etc. Default to English if unsure.
2. Give practical, actionable advice suitable for smallholder farmers (1-10 acre holdings).
3. Reference ICAR, KVK, SAU, or state agriculture department guidelines where relevant.
4. Use local measurement units farmers understand (quintal, bigha, acre, kg/acre).
5. Include safety warnings for any pesticide or chemical recommendations.
6. Guardrail: Set `is_agriculture_related` to true if the question is about farming, crops, livestock, or rural livelihood. ONLY set it to false if the question is completely unrelated (e.g., coding, baking, movies, politics).
7. Keep responses concise — 3 to 5 short paragraphs maximum.
8. Always suggest 2-3 natural follow-up questions the farmer might want to ask next.
9. Cite your knowledge sources in the sources field.

FARMER CONTEXT (use to personalize advice):
- Name: {farmer_name}
- District: {district}
- Land Size: {land_size} acres
- Water Source: {water_source}
- Past Crops: {past_crops}
- Language: {language}
"""


# ── Agent Class ───────────────────────────────────────────────────────────────

class QAAgent(BaseAgent):
    """Answers open-ended farmer questions using LLM-powered agronomic knowledge."""

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        question = state.get("user_question", state.get("message", ""))
        language = profile.get("language", "en")
        now = datetime.now(timezone.utc).isoformat()

        # Build personalized system prompt
        farmer_name = profile.get("name", "Farmer")
        district = profile.get("district", "Unknown")
        land_size = profile.get("land_size", "N/A")
        water_source = profile.get("water_source", "N/A")
        past_crops = ", ".join(profile.get("past_crops", [])) or "Not specified"

        system_prompt = QA_SYSTEM_PROMPT.format(
            farmer_name=farmer_name,
            district=district,
            land_size=land_size,
            water_source=water_source,
            past_crops=past_crops,
            language=language,
        )

        user_content = f"Farmer's question: {question}"

        # Default fallback response
        fallback = {
            "answer": (
                f"Namaste {farmer_name}! Based on your farm profile "
                f"({land_size} acres in {district}, water source: {water_source}):\n\n"
                f"1. **Crop Health & Sowing**: Current conditions are favorable for seasonal planting. "
                f"Ensure certified seed treatment with bio-fungicides.\n"
                f"2. **Soil & Nutrients**: Apply well-decomposed FYM or compost to improve soil health.\n"
                f"3. **Pest Monitoring**: Check undersides of leaves weekly. Upload any leaf photo for instant diagnosis.\n"
                f"4. **Mandi & Subsidies**: Track Agmarknet rates and register for PMFBY crop insurance."
            ),
            "topic": "general",
            "confidence": 0.5,
            "follow_up_suggestions": [
                "What crops should I grow this season?",
                "How do I apply for PM-KISAN?",
                "Show me today's mandi prices",
            ],
            "sources": ["ICAR General Advisory", "KVK District Recommendations"],
            "is_agriculture_related": True,
        }

        # Call LLM (safe_call_llm returns fallback if mock mode / no API key / error)
        result = self.safe_call_llm(
            system_prompt=system_prompt,
            user_content=user_content,
            response_schema=QAResponse,
            fallback_data=fallback,
            language=language,
        )

        # Ensure result is a dict
        if isinstance(result, QAResponse):
            result = result.model_dump()

        # Note: Non-agriculture guardrail removed — the endpoint-level
        # input validation (validate_user_input) already catches off-topic
        # and prompt injection queries before the Q&A agent runs.
        # Smaller LLMs frequently false-positive on is_agriculture_related.

        # Ensure we always have follow-up suggestions
        if not result.get("follow_up_suggestions"):
            result["follow_up_suggestions"] = [
                "What crops should I grow this season?",
                "How do I improve my soil health?",
                "Tell me about PMFBY crop insurance",
            ]

        return {
            "qa": {
                "agent": "qa",
                "status": "success",
                "answer": result.get("answer", fallback["answer"]),
                "topic": result.get("topic", "general"),
                "confidence": result.get("confidence", 0.5),
                "follow_up_suggestions": result.get("follow_up_suggestions", []),
                "sources": result.get("sources", []),
                "is_agriculture_related": result.get("is_agriculture_related", True),
                "generated_at": now,
                "timestamp": now,
            }
        }
