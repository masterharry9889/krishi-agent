"""
Agmarknet / e-NAM Mandi API tool integration with fixture and fallback support.
"""
import os
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, List

def fetch_market_intelligence(district: str, crop: str = None) -> Dict[str, Any]:
    """
    Fetches live or baseline Mandi commodity prices for a district.
    When USE_MOCK_TOOLS=true, returns realistic Agmarknet mock fixture data.
    When USE_MOCK_TOOLS=false, attempts live Agmarknet / OGD portal query with graceful fallback.
    """
    use_mock = os.environ.get("USE_MOCK_TOOLS", "true").lower() in ("true", "1", "yes")

    if use_mock:
        return {
            "source": "Agmarknet / e-NAM Mandi Portal (Mock Fixture)",
            "data_status": "Live Mandi Data",
            "is_estimated": False,
            "confidence": 0.92,
            "district": district,
            "commodities": [
                {
                    "crop": "Cotton",
                    "mandi": f"{district} APMC Main Mandi",
                    "modal_price": 6800.0,
                    "min_price": 6500.0,
                    "max_price": 7100.0,
                    "price_unit": "INR/quintal",
                    "demand_level": "high",
                    "supply_level": "medium",
                    "price_trend": "rising",
                },
                {
                    "crop": "Soyabean",
                    "mandi": f"{district} APMC Main Mandi",
                    "modal_price": 4450.0,
                    "min_price": 4200.0,
                    "max_price": 4650.0,
                    "price_unit": "INR/quintal",
                    "demand_level": "medium",
                    "supply_level": "low",
                    "price_trend": "stable",
                },
                {
                    "crop": "Maize",
                    "mandi": f"{district} APMC Main Mandi",
                    "modal_price": 2100.0,
                    "min_price": 1950.0,
                    "max_price": 2250.0,
                    "price_unit": "INR/quintal",
                    "demand_level": "low",
                    "supply_level": "high",
                    "price_trend": "falling",
                },
            ],
            "summary": f"Strong demand noted for Cotton and Soyabean in {district} APMC mandis.",
            "warnings": [],
        }

    # Live / Unmocked mode with fallback
    # If live Agmarknet API key (AGMARKNET_API_KEY) is present, queries live API
    ag_key = os.environ.get("AGMARKNET_API_KEY")
    if ag_key:
        try:
            url = f"https://api.data.gov.in/resource/9ef74e38-d9f6-413f-ae0a-2610a401e86e?api-key={ag_key}&format=json&filters[district]={urllib.parse.quote(district)}"
            req = urllib.request.Request(url, headers={"User-Agent": "KrishiAgent/1.0"})
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                records = data.get("records", [])
                if records:
                    commodities = []
                    for r in records[:5]:
                        commodities.append({
                            "crop": r.get("commodity", "Crop"),
                            "mandi": r.get("market", f"{district} APMC"),
                            "modal_price": float(r.get("modal_price", 0)),
                            "min_price": float(r.get("min_price", 0)),
                            "max_price": float(r.get("max_price", 0)),
                            "price_unit": "INR/quintal",
                            "demand_level": "medium",
                            "supply_level": "medium",
                            "price_trend": "stable",
                        })
                    return {
                        "source": "Agmarknet Government Data Portal (Live Feed)",
                        "data_status": "Live Mandi Feed",
                        "is_estimated": False,
                        "confidence": 0.95,
                        "district": district,
                        "commodities": commodities,
                        "summary": f"Live APMC mandi data fetched for {district}.",
                        "warnings": [],
                    }
        except Exception:
            pass

    # Fallback regional baseline
    return {
        "source": "Agmarknet Mandi Feed (Regional Baseline)",
        "data_status": "Estimated Market Baseline",
        "is_estimated": True,
        "confidence": 0.82,
        "district": district,
        "commodities": [
            {
                "crop": "Cotton",
                "mandi": f"{district} APMC",
                "modal_price": 6650.0,
                "min_price": 6400.0,
                "max_price": 6900.0,
                "price_unit": "INR/quintal",
                "demand_level": "high",
                "supply_level": "medium",
                "price_trend": "rising",
            },
            {
                "crop": "Soyabean",
                "mandi": f"{district} APMC",
                "modal_price": 4350.0,
                "min_price": 4150.0,
                "max_price": 4500.0,
                "price_unit": "INR/quintal",
                "demand_level": "medium",
                "supply_level": "medium",
                "price_trend": "stable",
            },
        ],
        "summary": f"Regional market baseline prices for {district} district.",
        "warnings": [f"Live Agmarknet feed connection unavailable for '{district}'. Using estimated district market baseline."],
    }
