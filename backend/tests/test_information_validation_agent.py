"""
Unit tests for InformationValidationAgent.
Verifies all domain rules, cross-agent consistency, safety cautions, and report generation.
"""
import pytest
from backend.app.agents.information_validation_agent import (
    InformationValidationAgent,
    InformationValidationReport,
)


class TestInformationValidationAgent:
    @pytest.fixture
    def validator(self):
        return InformationValidationAgent()

    def test_soil_validation_normal_and_extreme(self, validator):
        # Normal soil
        soil_normal = {"ph": 7.2, "nitrogen": 210, "phosphorus": 18, "potassium": 300}
        checks = validator.validate_soil(soil_normal)
        assert any(c["item"] == "soil_ph" and c["passed"] for c in checks)
        assert any(c["item"] == "soil_nitrogen" and c["passed"] for c in checks)

        # Acidic soil should generate lime warning
        soil_acidic = {"ph": 4.8}
        checks_acidic = validator.validate_soil(soil_acidic)
        assert any(c["item"] == "ph_acidity_warning" and "lime" in c.get("warning", "").lower() for c in checks_acidic)

        # Alkaline soil should generate gypsum warning
        soil_alkaline = {"ph": 8.6}
        checks_alkaline = validator.validate_soil(soil_alkaline)
        assert any(c["item"] == "ph_alkalinity_warning" and "gypsum" in c.get("warning", "").lower() for c in checks_alkaline)

    def test_weather_validation(self, validator):
        weather_rain = {"temperature": 28.0, "rainfall_mm": 22.0}
        checks = validator.validate_weather(weather_rain)
        assert any(c["item"] == "weather_temp" and c["passed"] for c in checks)
        assert any(c["item"] == "weather_rainfall" and c["passed"] for c in checks)
        assert any("spray" in c.get("warning", "").lower() for c in checks)

    def test_market_validation(self, validator):
        market_valid = {
            "modal_price_inr": 2150,
            "price_trend": "increasing",
            "source": "Agmarknet APMC",
        }
        checks = validator.validate_market(market_valid)
        assert any(c["item"] == "market_price_positive" and c["passed"] for c in checks)
        assert any(c["item"] == "market_trend_valid" and c["passed"] for c in checks)
        assert any(c["item"] == "market_source" and c["passed"] for c in checks)

    def test_crop_water_compatibility(self, validator):
        crop_data = {
            "crops": [
                {"name": "Paddy (Rice)", "suitabilityScore": 90},
                {"name": "Soybean", "suitabilityScore": 88},
            ]
        }
        profile_rainfed = {"water_source": "Rainfed Dryland"}
        checks = validator.validate_crop_recommendations(crop_data, profile_rainfed)
        assert any(c["item"] == "water_suitability_Paddy (Rice)" and "water requirement" in c.get("warning", "").lower() for c in checks)

    def test_budget_arithmetic_consistency(self, validator):
        budget_data = {
            "inputCostInr": 50000,
            "expectedRevenueInr": 130000,
            "expectedNetMarginInr": 80000,
        }
        checks = validator.validate_budget(budget_data)
        assert any(c["item"] == "budget_arithmetic_consistency" and c["passed"] for c in checks)

    def test_pesticide_caution_requirement(self, validator):
        # Missing caution
        diag_no_caution = {
            "confidencePct": 92,
            "treatment": {
                "chemicalControl": "Spray Mancozeb 2g/L",
            },
        }
        checks = validator.validate_disease_treatment(diag_no_caution)
        assert any("pesticide_safety_caution" in c["item"] and "warning" in c for c in checks)

        # Has caution
        diag_with_caution = {
            "confidencePct": 92,
            "treatment": {
                "chemicalControl": "Spray Mancozeb 2g/L. Follow label caution and wear protective mask/gloves.",
            },
        }
        checks_ok = validator.validate_disease_treatment(diag_with_caution)
        assert any("pesticide_safety_caution" in c["item"] and c["passed"] for c in checks_ok)

    def test_master_validation_report(self, validator):
        collected = {
            "soil": {"ph": 7.0, "nitrogen": 200},
            "weather": {"temperature": 25.0, "rainfall_mm": 5.0},
            "market_intelligence": {"modal_price_inr": 2200, "price_trend": "stable", "source": "Agmarknet"},
            "budget": {"inputCostInr": 40000, "expectedRevenueInr": 100000, "expectedNetMarginInr": 60000},
        }
        report = validator.validate_all_collected_information(collected, profile={"land_size": 2.0})
        assert isinstance(report, InformationValidationReport)
        assert report.is_valid is True
        assert report.validation_score > 80.0
        assert len(report.checks_passed) >= 4
        assert len(report.safety_notices) >= 1
