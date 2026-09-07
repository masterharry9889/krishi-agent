"""
Validation Agent — Guardrail & Validation Layer for Krishi Agent Pipeline.

Runs as the FINAL node in the LangGraph pipeline before any response reaches the frontend.
Covers:
1. Input guardrails (off-topic, prompt injection, image validation)
2. Output guardrails (confidence thresholds, pesticide cautions, financial certainty, claim grounding)
3. Schema validation (Pydantic models for every structured output)
4. Language/localization validation

On ANY guardrail failure: log the reason, return a safe fallback message to the farmer.
Never fail silently, never expose internal errors.
"""
import logging
import re
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone

from pydantic import ValidationError

from .schemas import (
    AgentOutputUnion,
    ValidationResult,
    SUPPORTED_LANGUAGES,
    DISEASE_CONFIDENCE_THRESHOLD,
    BaseAgentOutput,
    CropRecommendationOutput,
    CropMonitoringOutput,
    BudgetEstimatorOutput,
    SchemeInsuranceOutput,
    InputVerificationOutput,
    AdvisoryOutput,
    CreditAgentOutput,
    StorageSellTimingOutput,
    MarketLinkageOutput,
    FeedbackAgentOutput,
    SoilAgentOutput,
    WeatherAgentOutput,
    MarketIntelOutput,
    ResourceIrrigationOutput,
    DiseaseDetectionOutput,
    DiseaseResearchOutput,
)

logger = logging.getLogger("krishi_agent.validation")


# ─── Regex Patterns for Guardrails ─────────────────────────────────────

# Off-topic detection: non-agriculture keywords that shouldn't be authoritative
OFF_TOPIC_PATTERNS = [
    r"\b(cryptocurrency|bitcoin|stock market|forex|trading|investment portfolio)\b",
    r"\b(medical diagnosis|prescription|dosage|medicine|treatment for)\b(?!.*(crop|plant|pest|disease|soil))",
    r"\b(legal advice|lawsuit|contract law|criminal|divorce)\b",
    r"\b(programming|code|debug|api key|database|server)\b",
    r"\b(political|election|government policy|minister|parliament)\b(?!.*(scheme|subsidy|agriculture|farming))",
]

# Prompt injection / role escape attempts
PROMPT_INJECTION_PATTERNS = [
    r"(ignore|forget|disregard).*(previous|above|system|instruction|prompt)",
    r"(you are|act as|pretend to be).*(not|no longer|different).*(farm|agriculture|krishi)",
    r"(system prompt|instructions|guidelines|rules).*(show|reveal|print|output|tell me)",
    r"(bypass|override|disable).*(safety|guardrail|validation|filter)",
    r"(what is your|tell me your).*(prompt|instruction|system message)",
]

# Pesticide dosage mentions without caution
PESTICIDE_DOSAGE_PATTERNS = [
    r"\b(\d+(\.\d+)?)\s*(ml|litres?|liters?|kg|grams?|gm)\s*(per\s*(acre|hectare|ha|litres?|liter))\b",
    r"\b(spray|apply|use).{0,30}\b\d+(\.\d+)?\s*(ml|l|kg|g)\b",
    r"\bdosage.{0,20}\d+",
    r"\b(concentration|dilution).{0,20}\d+",
]

# Financial certainty overstatement
FINANCIAL_CERTAINTY_PATTERNS = [
    r"\byou\s+(will|shall|guaranteed?\s+to)\s+(get|receive|obtain|qualify\s+for)\s+(the\s+)?(loan|scheme|subsidy|insurance|credit)",
    r"\b(guaranteed|assured|certain|definite)\s+(approval|eligibility|loan|scheme|subsidy)",
    r"\byou\s+are\s+eligible\s+for\s+(the\s+)?(loan|scheme|subsidy|insurance)\b(?!.*(subject to|verification|approval|may|might|could))",
]

# Claims that should be grounded in research/sources
UNGROUNDED_CLAIM_PATTERNS = [
    r"\b(studies show|research proves|scientifically proven|experts confirm)\b",
    r"\b(according to|as per|based on).{0,30}\b(ICAR|IARI|KVK|SAU|NABARD|RBI|PMFBY)\b",
]

# Image file validation
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_IMAGE_SIZE_MB = 10


# ─── Language Detection (simple heuristic) ────────────────────────────

DEVANAGARI_RANGE = re.compile(r"[\u0900-\u097F]")
TAMIL_RANGE = re.compile(r"[\u0B80-\u0BFF]")
TELUGU_RANGE = re.compile(r"[\u0C00-\u0C7F]")
KANNADA_RANGE = re.compile(r"[\u0C80-\u0CFF]")
GUJARATI_RANGE = re.compile(r"[\u0A80-\u0AFF]")
PUNJABI_RANGE = re.compile(r"[\u0A00-\u0A7F]")
BENGALI_RANGE = re.compile(r"[\u0980-\u09FF]")

LANGUAGE_SCRIPTS = {
    "hi": DEVANAGARI_RANGE,
    "mr": DEVANAGARI_RANGE,
    "ta": TAMIL_RANGE,
    "te": TELUGU_RANGE,
    "kn": KANNADA_RANGE,
    "gu": GUJARATI_RANGE,
    "pa": PUNJABI_RANGE,
    "bn": BENGALI_RANGE,
}


def detect_language(text: str) -> str:
    """Heuristic language detection for Indian languages."""
    if not text or not text.strip():
        return "en"

    # Count script characters
    script_scores = {}
    for lang, pattern in LANGUAGE_SCRIPTS.items():
        matches = len(pattern.findall(text))
        if matches > 0:
            script_scores[lang] = matches

    if script_scores:
        return max(script_scores, key=script_scores.get)

    # Default to English if no Indic script detected
    return "en"


def validate_language_match(response_text: str, expected_lang: str) -> Tuple[bool, str]:
    """Check if response is in the expected language."""
    if expected_lang == "en":
        return True, "English expected, response in English"

    detected = detect_language(response_text)
    if detected == expected_lang:
        return True, f"Language match: {SUPPORTED_LANGUAGES.get(expected_lang, expected_lang)}"

    # Special case: Devanagari covers both hi and mr
    if expected_lang in ("hi", "mr") and detected in ("hi", "mr"):
        return True, f"Devanagari script match for {SUPPORTED_LANGUAGES.get(expected_lang, expected_lang)}"

    return False, f"Language mismatch: expected {SUPPORTED_LANGUAGES.get(expected_lang, expected_lang)}, detected {SUPPORTED_LANGUAGES.get(detected, detected)}"


# ─── Input Guardrails ──────────────────────────────────────────────────

def check_off_topic(message: str) -> Tuple[bool, Optional[str]]:
    """Return (is_off_topic, reason)."""
    msg_lower = message.lower()
    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, msg_lower, re.IGNORECASE):
            return True, f"Off-topic content detected: matches pattern '{pattern}'"
    return False, None


def check_prompt_injection(message: str) -> Tuple[bool, Optional[str]]:
    """Return (is_injection, reason)."""
    msg_lower = message.lower()
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, msg_lower, re.IGNORECASE):
            return True, f"Prompt injection attempt detected: matches pattern '{pattern}'"
    return False, None


def validate_image_upload(file_info: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validate image file before passing to vision model.
    file_info should have: content_type, size_bytes (or size_mb)
    """
    content_type = file_info.get("content_type", "")
    if content_type not in ALLOWED_IMAGE_TYPES:
        return False, f"Invalid image type: {content_type}. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"

    size_mb = file_info.get("size_mb") or (file_info.get("size_bytes", 0) / (1024 * 1024))
    if size_mb > MAX_IMAGE_SIZE_MB:
        return False, f"Image too large: {size_mb:.1f}MB > {MAX_IMAGE_SIZE_MB}MB limit"

    return True, None


# ─── Output Guardrails ──────────────────────────────────────────────────

def check_disease_confidence(agent_output: Dict[str, Any], monitoring_alerts: List[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
    """
    Disease diagnosis must not state treatment as certain when confidence < threshold.
    Checks crop_monitoring_agent alerts for pest/disease types with confidence.
    """
    # Find disease/pest alerts from monitoring
    disease_alerts = [
        a for a in monitoring_alerts
        if isinstance(a, dict) and a.get("type") in ("pest", "disease") and a.get("severity") in ("high", "medium")
    ]

    if not disease_alerts:
        return True, None  # No disease alerts to validate against

    # Check if the current agent output makes definitive treatment claims
    # Look at recommendations/warnings for definitive language
    recommendations = agent_output.get("recommendations", [])
    warnings = agent_output.get("warnings", [])

    definitive_treatment_phrases = [
        r"\b(will cure|will eliminate|guaranteed to|definitely|certainly)\b",
        r"\b(apply|use|spray).{0,20}\b(cure|eliminate|kill|eradicate)\b",
    ]

    all_text = " ".join(recommendations + warnings).lower()

    for alert in disease_alerts:
        # In our system, monitoring agent doesn't expose confidence directly on alerts
        # But we can check if the agent output mentions confidence
        agent_confidence = agent_output.get("confidence", 1.0)

        # If this agent is making treatment claims but confidence is low
        if agent_confidence < DISEASE_CONFIDENCE_THRESHOLD:
            for pattern in definitive_treatment_phrases:
                if re.search(pattern, all_text, re.IGNORECASE):
                    return False, f"Definitive treatment claim with low confidence ({agent_confidence:.2f} < {DISEASE_CONFIDENCE_THRESHOLD})"

    return True, None


def check_pesticide_caution(agent_output: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Any pesticide recommendation must include dosage caution + consult officer note."""
    recommendations = agent_output.get("recommendations", [])
    warnings = agent_output.get("warnings", [])
    all_text = " ".join(recommendations + warnings).lower()

    # Check if pesticides are mentioned
    pesticide_mentioned = any(
        re.search(pattern, all_text, re.IGNORECASE)
        for pattern in [
            r"\b(pesticide|insecticide|fungicide|herbicide|weedicide)\b",
            r"\b(spray|application).{0,10}\b(chemical|synthetic)\b",
        ]
    )

    if not pesticide_mentioned:
        return True, None

    # Check for required cautions
    has_dosage_caution = any(
        re.search(pattern, all_text, re.IGNORECASE)
        for pattern in [
            r"\b(dosage|dose|quantity|amount).{0,20}\b(caution|careful|consult|follow label)\b",
            r"\b(consult|contact).{0,20}\b(agriculture officer|kvik|kisan|extension)\b",
            r"\b(label|manufacturer).{0,20}\b(instruction|direction|recommend)\b",
        ]
    )

    if not has_dosage_caution:
        return False, "Pesticide recommendation missing required dosage caution and 'consult agriculture officer' note"

    return True, None


def check_financial_certainty(agent_output: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Financial guidance must be framed as estimate, not guarantee."""
    recommendations = agent_output.get("recommendations", [])
    warnings = agent_output.get("warnings", [])
    all_text = " ".join(recommendations + warnings).lower()

    # Only check agents that deal with financial products
    agent = agent_output.get("agent", "")
    financial_agents = {"scheme_insurance", "credit", "budget_estimator", "government_schemes"}
    if agent not in financial_agents:
        return True, None

    for pattern in FINANCIAL_CERTAINTY_PATTERNS:
        if re.search(pattern, all_text, re.IGNORECASE):
            return False, f"Financial certainty overstated: matches pattern '{pattern}'"

    # Ensure estimate language is present
    has_estimate_language = any(
        word in all_text
        for word in ["estimate", "estimated", "may be", "might be", "could be", "subject to", "eligible for", "potential", "indicative"]
    )

    if not has_estimate_language and any(kw in all_text for kw in ["loan", "scheme", "subsidy", "insurance", "credit", "budget", "cost", "revenue"]):
        return False, "Financial guidance missing estimate/qualifying language"

    return True, None


def check_claim_grounding(agent_output: Dict[str, Any], state: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate that claims in output map back to sources.
    For disease_research_agent / crop_monitoring_agent: check source citations.
    """
    agent = agent_output.get("agent", "")

    # Agents that should have verifiable sources
    research_agents = {"crop_monitoring", "scheme_insurance", "credit", "market_intelligence", "input_verification", "government_schemes"}
    if agent not in research_agents:
        return True, None

    source = agent_output.get("source", "").lower()
    recommendations = agent_output.get("recommendations", [])
    all_text = " ".join(recommendations).lower()

    # Check for ungrounded authoritative claims
    for pattern in UNGROUNDED_CLAIM_PATTERNS:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        if matches:
            # Verify the cited source actually appears in the agent's source field
            cited_sources = re.findall(r"(icar|iari|kvk|sau|nabard|rbi|pmfby|agmarknet|wdra|fssai|cibrc|apmc)", all_text, re.IGNORECASE)
            for cited in cited_sources:
                if cited.lower() not in source:
                    return False, f"Ungrounded claim: cites '{cited}' but agent source is '{source}'"

    return True, None


SCHEMA_MAP = {
    "crop_recommendation": CropRecommendationOutput,
    "soil": None,  # Uses BaseAgentOutput with extra fields
    "weather": None,
    "market_intelligence": None,
    "irrigation": None,
    "budget_estimator": BudgetEstimatorOutput,
    "input_verification": InputVerificationOutput,
    "scheme_insurance": SchemeInsuranceOutput,
    "credit": CreditAgentOutput,
    "crop_monitoring": CropMonitoringOutput,
    "advisory": AdvisoryOutput,
    "storage_sell_timing": StorageSellTimingOutput,
    "market_linkage": None,
    "feedback": None,
    "disease_detection": DiseaseDetectionOutput,
    "disease_research": DiseaseResearchOutput,
    "government_schemes": None,  # uses BaseAgentOutput with extra fields
}

def validate_schema(agent_output: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """Validate agent output against its Pydantic schema. Returns (passed, error_msg, validated_dict)."""
    agent_key = agent_output.get("agent", "")
    schema_class = SCHEMA_MAP.get(agent_key)

    if schema_class is None:
        # Use base schema for agents without custom schema
        schema_class = BaseAgentOutput

    try:
        validated = schema_class.model_validate(agent_output)
        return True, None, validated.model_dump()
    except ValidationError as e:
        error_details = []
        for err in e.errors():
            loc = " -> ".join(str(x) for x in err["loc"])
            error_details.append(f"{loc}: {err['msg']}")
        return False, f"Schema validation failed: {'; '.join(error_details)}", None


# ─── Main Validation Function ──────────────────────────────────────────

def validate_agent_output(
    agent_output: Dict[str, Any],
    state: Dict[str, Any],
    is_final_output: bool = False
) -> ValidationResult:
    """
    Main validation entry point. Runs all applicable guardrails on an agent's output.
    If is_final_output=True, also runs language validation.
    """
    agent_key = agent_output.get("agent", "unknown")

    # 1. Schema validation (always runs)
    schema_ok, schema_err, validated = validate_schema(agent_output)
    if not schema_ok:
        logger.warning(f"[VALIDATION] Schema failed for {agent_key}: {schema_err}")
        return ValidationResult(
            passed=False,
            failure_reason=schema_err,
            failure_category="schema_validation",
            fallback_message="I'm having trouble formatting my response. Let me try again with a simpler answer."
        )

    # 2. Output guardrails (run on validated output)
    checks = [
        ("confidence_threshold", lambda: check_disease_confidence(validated, state.get("monitoring_alerts", []))),
        ("pesticide_caution_missing", lambda: check_pesticide_caution(validated)),
        ("financial_certainty_overstated", lambda: check_financial_certainty(validated)),
        ("unsupported_claim", lambda: check_claim_grounding(validated, state)),
    ]

    for category, check_fn in checks:
        passed, reason = check_fn()
        if not passed:
            logger.warning(f"[VALIDATION] {category} failed for {agent_key}: {reason}")
            fallback = _get_fallback_message(category, agent_key)
            return ValidationResult(
                passed=False,
                validated_output=validated,
                failure_reason=reason,
                failure_category=category,
                fallback_message=fallback
            )

    # 3. Language validation (only on final user-facing output)
    if is_final_output:
        profile = state.get("profile", {})
        expected_lang = profile.get("language", "en")

        # Extract user-facing text from output
        user_text = _extract_user_text(validated)
        lang_ok, lang_reason = validate_language_match(user_text, expected_lang)

        if not lang_ok:
            logger.warning(f"[VALIDATION] Language mismatch for {agent_key}: {lang_reason}")
            # Retry generation with explicit language instruction would happen upstream
            # For now, return fallback
            return ValidationResult(
                passed=False,
                validated_output=validated,
                failure_reason=lang_reason,
                failure_category="language_mismatch",
                fallback_message=_get_language_fallback(expected_lang)
            )

    return ValidationResult(passed=True, validated_output=validated)


def _extract_user_text(output: Dict[str, Any]) -> str:
    """Extract human-readable text from agent output for language checking."""
    parts = []
    for key in ["recommendations", "warnings", "executive_summary", "reasoning", "advisory_log", "recommendation_summary"]:
        val = output.get(key)
        if isinstance(val, list):
            parts.extend(str(v) for v in val)
        elif isinstance(val, str):
            parts.append(val)
        elif isinstance(val, dict):
            for v in val.values():
                if isinstance(v, str):
                    parts.append(v)
    return " ".join(parts)


def _get_fallback_message(category: str, agent_key: str) -> str:
    """Safe, farmer-friendly fallback messages by failure category."""
    fallbacks = {
        "schema_validation": "I'm having trouble organizing my response. Here's what you need to know: ",
        "confidence_threshold": "I'm not confident enough to give a definitive treatment recommendation. Please consult your local agriculture officer for a field diagnosis.",
        "pesticide_caution_missing": "For any chemical treatment, please follow label instructions carefully and consult your local agriculture officer for the correct dosage and safety precautions.",
        "financial_certainty_overstated": "The amounts and eligibility mentioned are estimates only. Actual approval depends on bank verification and scheme guidelines. Please check with your local branch.",
        "unsupported_claim": "I want to make sure I give you accurate information. Please verify the details with your local KVK or agriculture department.",
        "language_mismatch": "Let me respond in your preferred language.",
    }
    return fallbacks.get(category, "I need to double-check that information. Please consult your local agriculture officer for specific guidance.")


def _get_language_fallback(lang: str) -> str:
    """Language-specific fallback message."""
    fallbacks = {
        "hi": "मुझे खेद है, मैं आपकी भाषा में सही जवाब नहीं दे पा रहा। कृपया अपने स्थानीय कृषि अधिकारी से सलाह लें।",
        "mr": "मला खेद आहे, मी तुमच्या भाषेत बरेच उत्तर देऊ शकत नाही. कृपया तुमच्या स्थानीय कृषी अधिकाऱ्यांची सल्ला घ्या.",
        "ta": "மன்னிக்கவும், நான் உங்கள் மொழியில் சரியான பதிலை அளிக்க முடியவில்லை. தயவுசெய்து உங்கள் உள்ளூரில் உள்ள விவசாய அதிகாரியை அணுகவும்.",
    }
    return fallbacks.get(lang, "I'm having trouble responding in your language. Please consult your local agriculture officer for guidance.")


# ─── Input Validation (for user messages) ──────────────────────────────

def validate_user_input(message: str, file_info: Optional[Dict[str, Any]] = None) -> ValidationResult:
    """
    Validate incoming user message before it enters the graph.
    Returns ValidationResult with fallback if rejected.
    """
    # Check off-topic
    off_topic, reason = check_off_topic(message)
    if off_topic:
        logger.warning(f"[VALIDATION] Input rejected - off topic: {reason}")
        return ValidationResult(
            passed=False,
            failure_reason=reason,
            failure_category="off_topic_input",
            fallback_message="I can only help with farming, agriculture, and related government schemes. For other topics, please consult the appropriate expert."
        )

    # Check prompt injection
    injection, reason = check_prompt_injection(message)
    if injection:
        logger.warning(f"[VALIDATION] Input rejected - prompt injection: {reason}")
        return ValidationResult(
            passed=False,
            failure_reason=reason,
            failure_category="prompt_injection",
            fallback_message="I'm here to help with farming advice. How can I assist you with your crops, soil, weather, or government schemes?"
        )

    # Check image upload if present
    if file_info:
        img_ok, reason = validate_image_upload(file_info)
        if not img_ok:
            logger.warning(f"[VALIDATION] Image upload rejected: {reason}")
            return ValidationResult(
                passed=False,
                failure_reason=reason,
                failure_category="invalid_image_upload",
                fallback_message="Please upload a valid image file (JPEG, PNG, WebP) under 10MB for disease detection."
            )

    return ValidationResult(passed=True)


# ─── Validation Agent Class (for registry compatibility) ───────────────

class ValidationAgent:
    """Validation agent that can be registered in the agent registry."""

    def __init__(self):
        self.name = "validation"
        self.key = "validation"

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate the complete pipeline output before returning to user.
        This runs as the FINAL node in the graph.
        """
        # Collect all agent outputs from state for validation
        agent_outputs = {}
        for key in state.keys():
            if key.endswith("_agent") or key in SCHEMA_MAP:
                val = state.get(key)
                if isinstance(val, dict) and val.get("agent"):
                    agent_outputs[key] = val

        # Validate each agent output
        all_passed = True
        failure_reasons = []

        # Which agent's output is the last user-facing thing said, per branch —
        # "feedback" for the main season-planning pipeline, "disease_research"
        # for the image-upload branch, "government_schemes" for the scheme/
        # policy-question branch. Only that one needs the language check;
        # everything upstream of it is intermediate state.
        final_output_keys = {"feedback", "disease_research", "government_schemes"}

        for agent_key, output in agent_outputs.items():
            result = validate_agent_output(output, state, is_final_output=(agent_key in final_output_keys))
            if not result.passed:
                all_passed = False
                failure_reasons.append(f"{agent_key}: {result.failure_reason}")

        # If any validation failed, log and return safe response
        if not all_passed:
            logger.error(f"[VALIDATION] Pipeline validation failed: {'; '.join(failure_reasons)}")
            # Return a safe summary instead of potentially unsafe agent outputs
            return {
                "validation": {
                    "agent": "validation",
                    "status": "success",
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "Krishi Agent Validation Layer",
                    "confidence": 1.0,
                    "is_estimated": False,
                    "data_status": "Validation Completed with Fallback",
                    "recommendations": [
                        "Some automated recommendations could not be fully validated.",
                        "Please consult your local agriculture officer for specific guidance.",
                        "The general farming principles remain: test soil, follow weather, use certified inputs."
                    ],
                    "warnings": ["Validation layer activated fallback responses for safety."],
                }
            }

        return {"validation": {"status": "passed", "validated_agents": list(agent_outputs.keys())}}


# ─── Graph Node Function ───────────────────────────────────────────────

def validation_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """LangGraph node function for the validation step."""
    agent = ValidationAgent()
    return agent.run(state)