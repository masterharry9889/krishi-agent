def needs_credit(state) -> str:
    """Return 'credit_needed' if budget shortfall detected, else 'sufficient_budget'."""
    budget = state.get("budget_estimate", {})
    # stub: assume credit needed if estimated cost > 100000 (placeholder)
    if budget.get("estimated_cost", 0) > 100000:
        return "credit_needed"
    return "sufficient_budget"


def insurance_deadline_soon(state) -> bool:
    """Placeholder for router that might be used elsewhere."""
    return False


def has_image_attachment(state) -> str:
    """Return 'has_image' if state has image attachment, else 'no_image'.
    Kept for backward compatibility; route_from_onboarding is what the
    graph actually wires up now that there's a third branch."""
    if state.get("has_image_attachment") and state.get("image_data"):
        return "has_image"
    return "no_image"


# Keyword groups used to detect a government-scheme/policy question in the
# farmer's free-text chat message. Deliberately broad/simple (substring match)
# rather than an LLM call, so routing stays fast and deterministic — the
# government_schemes_agent itself does the nuanced matching once routed here.
SCHEME_KEYWORDS = [
    "scheme", "yojana", "yojna", "subsidy", "subsidies", "sarkari", "sarkar",
    "government scheme", "govt scheme", "pm-kisan", "pm kisan", "pmkisan",
    "pmfby", "fasal bima", "kisan credit card", "kcc", "kusum",
    "loan scheme", "policy", "grant", "eligible", "eligibility",
    "interest subvention", "soil health card", "e-nam", "enam", "rkvy", "pmksy",
]


def is_scheme_query(message: str) -> bool:
    """True if the farmer's message looks like a government scheme/policy question."""
    if not message:
        return False
    msg_lower = message.lower()
    return any(kw in msg_lower for kw in SCHEME_KEYWORDS)


def route_from_onboarding(state) -> str:
    """
    Single router for everything branching off the 'onboarding' node.
    Returns one of: 'has_image', 'scheme_query', 'no_image'.

    Image takes priority over scheme keywords in case both happen to be
    present (e.g. a farmer uploads a photo and also mentions "subsidy" in
    the same message) — disease diagnosis is the more time-sensitive intent.
    """
    if state.get("has_image_attachment") and state.get("image_data"):
        return "has_image"
    message = state.get("message") or state.get("user_message") or ""
    if is_scheme_query(message):
        return "scheme_query"
    return "no_image"