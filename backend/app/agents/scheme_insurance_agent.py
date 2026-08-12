class SchemeInsuranceAgent:
    """Checks crop-insurance eligibility and enrollment deadlines."""
    def run(self, state):
        # Stub: eligibility based on crop and location.
        # In reality, we would check the selected crop (if any) and location against government schemes.
        # For now, we return a fixed eligibility.
        eligibility = {
            'eligible': True,
            'scheme': 'PMFBY',
            'deadline': '2026-06-30'
        }
        return {"insurance_status": eligibility}