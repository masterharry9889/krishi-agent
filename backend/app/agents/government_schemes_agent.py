"""
Government Schemes Agent — Research agent for Indian central-government
farming schemes, subsidies, and policies.

Distinct from scheme_insurance_agent (which only auto-attaches PMFBY +
a couple of subsidy schemes as a fixed step in the season-planning pipeline):
this agent is conversational — a farmer can ask a free-text question
("what schemes help with drip irrigation", "am I eligible for PM-KISAN",
"what's the loan interest subsidy for KCC") and get a personalized,
grounded answer, matched against the farmer's profile (state/district,
land size, category) where that's available.

Combines a curated knowledge base of major, long-running central schemes
(so the farmer always gets a useful, correct baseline even in mock mode
or if the LLM call fails) with an LLM call for personalization and
free-text Q&A when a real GROQ_API_KEY is configured.

IMPORTANT: Scheme names, eligibility rules, subsidy amounts, and deadlines
change over time and vary by state. This agent always frames its output
as a starting point to verify at the official portal, never as a final
determination of eligibility or entitlement — this is required for the
validation layer's financial-certainty guardrail to pass, and because it's
simply true: only the scheme's own portal or the local agriculture/bank
office can confirm current eligibility.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from .base_agent import BaseAgent

logger = logging.getLogger("krishi_agent.government_schemes")


# ─── Response Schema (for LLM-personalized answers) ────────────────────

class SchemeMatch(BaseModel):
    """A single scheme matched to the farmer's question/profile."""
    name: str = Field(description="Official scheme name")
    category: str = Field(description="One of: income_support, insurance, credit, subsidy, irrigation, market_access")
    why_relevant: str = Field(description="Why this scheme matches the farmer's question or profile")
    how_to_apply: str = Field(description="Practical next step: portal, office, or document to start with")


class GovernmentSchemesResult(BaseModel):
    """Structured result for a scheme/policy research query."""
    matched_schemes: List[SchemeMatch] = Field(default_factory=list)
    summary: str = Field(description="A short, farmer-facing answer to their question")
    needs_local_verification: bool = Field(
        default=True,
        description="Always true unless the query was purely informational with no eligibility claim"
    )


# ─── Agent ──────────────────────────────────────────────────────────────

class GovernmentSchemesAgent(BaseAgent):
    """
    Answers farmer questions about Indian government farming schemes,
    subsidies, and policies, and proactively suggests relevant ones based
    on the farmer's profile (state, land size, crop, category).

    Input (from state):
        - message: the farmer's free-text question (may be empty — in that
          case this returns a general profile-matched shortlist)
        - profile: district/state, land_size_acres, category (general/SC/ST/OBC/women)
        - selected_crop / crop_shortlist: for irrigation/input-subsidy matching

    Output:
        - government_schemes: structured result with matched schemes,
          a plain-language summary, and a verification reminder
    """

    SYSTEM_PROMPT = (
        "You are a Government Schemes Officer helping Indian smallholder farmers "
        "understand which central and state farming schemes, subsidies, and policies "
        "may apply to them. Given the farmer's question and profile, identify the most "
        "relevant schemes from the reference list provided, explain briefly why each is "
        "relevant, and give one concrete next step to apply or check eligibility for each. "
        "Only draw from the reference schemes provided — do not invent scheme names, "
        "amounts, or deadlines. Always frame eligibility as something to confirm at the "
        "official portal or local agriculture office, never as guaranteed. "
        "If the farmer's question isn't about a government scheme or policy, say so briefly "
        "and redirect to what you can help with."
    )

    # Curated baseline of major, long-running central government schemes for
    # Indian farmers. Names/portals are stable; amounts/deadlines can change —
    # hence the standing "verify at official portal" framing throughout.
    SCHEME_DATABASE: List[Dict[str, Any]] = [
        {
            "name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
            "category": "income_support",
            "description": "Direct income support paid to eligible landholding farmer families in installments.",
            "eligibility_notes": "Landholding farmer families; some categories (e.g. institutional landholders, income-tax payers) are excluded.",
            "how_to_apply": "Register via the PM-KISAN portal or your local Common Service Centre (CSC) with Aadhaar and land records.",
            "portal": "pmkisan.gov.in",
        },
        {
            "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "category": "insurance",
            "description": "Crop insurance covering yield loss from natural calamities, pests, and disease, at a low farmer-paid premium.",
            "eligibility_notes": "Farmers growing notified crops in notified areas; enrollment window tied to the sowing season.",
            "how_to_apply": "Enroll through your bank (if you have a crop loan, enrollment may be automatic) or the PMFBY portal within the notified window.",
            "portal": "pmfby.gov.in",
        },
        {
            "name": "Kisan Credit Card (KCC)",
            "category": "credit",
            "description": "Short-term credit for crop production and allied needs at a subsidized/interest-subvention rate.",
            "eligibility_notes": "Farmers, tenant farmers, and sharecroppers; specific limits depend on landholding and crop.",
            "how_to_apply": "Apply at any nationalized bank, regional rural bank, or cooperative bank branch with land/tenancy documents.",
            "portal": "Apply at your nearest bank branch",
        },
        {
            "name": "Soil Health Card Scheme",
            "category": "subsidy",
            "description": "Free soil testing every cycle with crop-wise nutrient and fertilizer recommendations.",
            "eligibility_notes": "All farmers; no landholding restriction.",
            "how_to_apply": "Contact your local agriculture department or Krishi Vigyan Kendra (KVK) for a soil sample collection.",
            "portal": "soilhealth.dac.gov.in",
        },
        {
            "name": "PM-KUSUM (solar pumps & grid-connected solar for farmers)",
            "category": "irrigation",
            "description": "Subsidy for installing solar-powered irrigation pumps and setting up small solar power plants on farmland.",
            "eligibility_notes": "Individual farmers, cooperatives, and farmer groups; subsidy percentage varies by state and component.",
            "how_to_apply": "Apply through your state renewable energy development agency (state nodal agency) or state PM-KUSUM portal.",
            "portal": "pmkusum.mnre.gov.in",
        },
        {
            "name": "National Food Security Mission (NFSM)",
            "category": "subsidy",
            "description": "Subsidized seeds, micro-nutrients, and farm implements to boost productivity of notified cereal, pulse, and oilseed crops.",
            "eligibility_notes": "Farmers growing NFSM-notified crops in notified districts.",
            "how_to_apply": "Apply through your district agriculture office; distribution is usually seasonal and district-quota based.",
            "portal": "nfsm.gov.in",
        },
        {
            "name": "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
            "category": "irrigation",
            "description": "Subsidy for micro-irrigation (drip/sprinkler) and watershed development to improve water-use efficiency.",
            "eligibility_notes": "Farmers investing in drip/sprinkler systems; subsidy percentage varies by state, category, and landholding size.",
            "how_to_apply": "Apply through your state horticulture/agriculture department's micro-irrigation cell.",
            "portal": "pmksy.gov.in",
        },
        {
            "name": "e-NAM (National Agriculture Market)",
            "category": "market_access",
            "description": "Online trading platform linking APMC mandis for transparent price discovery and wider buyer access.",
            "eligibility_notes": "Farmers selling through participating APMC mandis; requires registration at the mandi.",
            "how_to_apply": "Register at your nearest e-NAM-integrated APMC mandi with identity and land/produce documents.",
            "portal": "enam.gov.in",
        },
        {
            "name": "Interest Subvention Scheme (on crop loans)",
            "category": "credit",
            "description": "Reduces effective interest on short-term crop loans up to a notified limit, with an extra incentive for prompt repayment.",
            "eligibility_notes": "Farmers with a KCC or crop loan up to the notified limit from an eligible lending institution.",
            "how_to_apply": "Automatically applied by your bank on eligible KCC/crop loans — confirm with your branch that it's been credited.",
            "portal": "Ask your bank branch directly",
        },
        {
            "name": "Rashtriya Krishi Vikas Yojana (RKVY)",
            "category": "subsidy",
            "description": "State-implemented umbrella scheme funding a range of agriculture and allied-sector infrastructure and productivity projects.",
            "eligibility_notes": "Varies widely by state and specific project component — check your state's current RKVY component list.",
            "how_to_apply": "Contact your state agriculture department; specific components and application routes differ by state.",
            "portal": "rkvy.nic.in",
        },
    ]

    CATEGORY_KEYWORDS = {
        "income_support": ["income", "kisan samman", "pm-kisan", "pm kisan", "cash support", "direct benefit"],
        "insurance": ["insurance", "bima", "crop loss", "fasal bima", "pmfby", "compensation", "calamity"],
        "credit": ["loan", "credit", "kcc", "kisan credit card", "interest", "bank", "borrow"],
        "irrigation": ["irrigation", "drip", "sprinkler", "solar pump", "kusum", "water", "pmksy"],
        "subsidy": ["subsidy", "seed", "fertilizer", "soil health", "input cost", "implement", "equipment"],
        "market_access": ["market", "mandi", "sell", "price", "enam", "buyer", "apmc"],
    }

    def _keyword_match_schemes(self, message: str, crop: str) -> List[Dict[str, Any]]:
        """Fallback matcher: keyword overlap against the curated scheme database."""
        msg_lower = (message or "").lower()

        if not msg_lower.strip():
            # No specific question — return a well-rounded general shortlist.
            general_keys = {
                "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
                "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
                "Kisan Credit Card (KCC)",
                "Soil Health Card Scheme",
            }
            return [s for s in self.SCHEME_DATABASE if s["name"] in general_keys]

        matched_categories = set()
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            if any(kw in msg_lower for kw in keywords):
                matched_categories.add(category)

        if not matched_categories:
            # No keyword hit — fall back to the same general shortlist rather
            # than an empty result, since the farmer still asked *something*
            # about schemes to reach this agent.
            general_keys = {
                "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
                "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
                "Kisan Credit Card (KCC)",
            }
            return [s for s in self.SCHEME_DATABASE if s["name"] in general_keys]

        return [s for s in self.SCHEME_DATABASE if s["category"] in matched_categories]

    def _build_user_content(self, message: str, profile: Dict[str, Any], crop: str) -> str:
        district = profile.get("district") or profile.get("location") or "India"
        land_size = profile.get("land_size_acres", "unspecified")
        category = profile.get("category", "unspecified")

        reference_list = "\n".join(
            f"- {s['name']} [{s['category']}]: {s['description']} "
            f"Eligibility notes: {s['eligibility_notes']} "
            f"How to apply: {s['how_to_apply']} Portal: {s['portal']}"
            for s in self.SCHEME_DATABASE
        )

        farmer_question = message.strip() if message and message.strip() else (
            "The farmer hasn't asked a specific question — give a general shortlist "
            "of schemes most relevant to their profile."
        )

        return (
            f"Farmer's question: {farmer_question}\n\n"
            f"Farmer profile — District: {district}, Land size: {land_size}, "
            f"Category: {category}, Crop: {crop or 'not specified'}\n\n"
            f"Reference schemes (only use these, do not invent others):\n{reference_list}\n\n"
            f"Return a JSON object with exactly these fields:\n"
            f'  "matched_schemes": array of objects with "name", "category", "why_relevant", "how_to_apply"\n'
            f'  "summary": string — a short, friendly, farmer-facing answer\n'
            f'  "needs_local_verification": boolean (true unless the query was purely informational)\n\n'
            f"Select 2-4 of the most relevant schemes. Do not overstate eligibility — "
            f"use language like 'may be eligible for' or 'worth checking', never 'you will get'."
        )

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        message = state.get("message") or state.get("user_message") or ""
        selected_crop = state.get("selected_crop", "")
        crop_shortlist = state.get("crop_shortlist", [])
        now = datetime.now(timezone.utc).isoformat()

        crop = selected_crop
        if not crop and crop_shortlist:
            first = crop_shortlist[0]
            crop = first.get("crop", "") if isinstance(first, dict) else str(first)

        language = profile.get("language", "en")

        logger.info(
            f"[GOVERNMENT_SCHEMES] farmer_id={state.get('farmer_id')} "
            f"query={message[:80]!r} crop={crop}"
        )

        fallback_matches = self._keyword_match_schemes(message, crop)
        fallback_data = GovernmentSchemesResult(
            matched_schemes=[
                SchemeMatch(
                    name=s["name"],
                    category=s["category"],
                    why_relevant=s["description"],
                    how_to_apply=f"{s['how_to_apply']} (Official portal: {s['portal']})",
                )
                for s in fallback_matches
            ],
            summary=(
                "Here are government schemes that may be relevant to your question. "
                "Confirm current eligibility and required documents at the official portal "
                "or your local agriculture office before applying."
            ),
            needs_local_verification=True,
        ).model_dump()

        schemes_result = self.safe_call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_content=self._build_user_content(message, profile, crop),
            response_schema=GovernmentSchemesResult,
            fallback_data=fallback_data,
            language=language,
        )

        matched_schemes = schemes_result.get("matched_schemes", [])
        summary = schemes_result.get(
            "summary",
            "Here are government schemes that may be relevant to you.",
        )

        recommendations = [summary]
        for scheme in matched_schemes:
            recommendations.append(f"{scheme['name']}: {scheme['how_to_apply']}")

        result = {
            "agent": "government_schemes",
            "status": "success",
            "generated_at": now,
            "timestamp": now,
            "source": "PM-KISAN / PMFBY / PMKSY / PM-KUSUM / e-NAM official portals (curated reference set)",
            "confidence": 0.75 if self.use_mock or not self.api_key else 0.85,
            "is_estimated": self.use_mock or not self.api_key,
            "data_status": "Scheme Matching Complete",
            "query": message,
            "matched_schemes": matched_schemes,
            "recommendations": recommendations,
            "warnings": [
                "Scheme eligibility, subsidy amounts, and deadlines vary by state and change over time. "
                "Confirm current details at the official portal or your local agriculture office/bank branch "
                "before applying."
            ],
        }

        return {"government_schemes": result}
