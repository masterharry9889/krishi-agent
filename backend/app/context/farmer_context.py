"""
FarmerContext — shared, persistent context layer for the Krishi Agent
multi-agent pipeline.

A ``FarmerContext`` bridges MongoDB-stored farmer records and the
LangGraph ``FarmerState`` TypedDict.  Any agent or node can use it to
load a farmer's full profile (including prior agent outputs) by
``farmer_id`` or ``season_id``, and to write back its results.

Design goals
------------
* **Single source of truth** — all farmer data lives in MongoDB.
* **Minimal coupling** — agents call ``context.load()`` / ``context.save()``
  without knowing collection names or field mappings.
* **Idempotent loading** — calling ``load()`` on the same farmer_id
  always returns the same base profile; agent outputs are layered on top.
* **Append-only agent outputs** — each agent's result is stored as a
  timestamped entry so downstream agents and human audits can trace the
  full reasoning chain.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from ..db import FarmerService


class FarmerContext:
    """Load, update, and persist the shared farmer context in MongoDB.

    Parameters
    ----------
    farmer_id:
        The UUID returned by ``POST /api/v1/onboard``.
    season_id:
        The season UUID returned by ``POST /api/v1/onboard``.
    service:
        Optional ``FarmerService`` override (mainly for testing).
    """

    def __init__(
        self,
        farmer_id: str,
        season_id: str,
        service: FarmerService | None = None,
    ):
        if not farmer_id or not season_id:
            raise ValueError("Both farmer_id and season_id are required to load farmer context")
        self.farmer_id = farmer_id
        self.season_id = season_id
        self._service = service or FarmerService()

    # ─── Loading ───────────────────────────────────────────────

    def load(self) -> dict[str, Any]:
        """Load the farmer's MongoDB record and return a dict keyed for
        ``FarmerState``.

        The returned dict always contains ``farmer_id``, ``season_id``,
        and a populated ``profile`` dict.  Agent output fields
        (``soil_report``, ``weather_outlook``, etc.) are set to ``None``
        by default and filled in when the corresponding agent writes
        them back.
        """
        doc = self._service.get_by_farmer_id(self.farmer_id)
        if doc is None:
            raise LookupError(
                f"Farmer not found for farmer_id={self.farmer_id}"
            )

        profile = {
            "name": doc.get("name", ""),
            "phone": doc.get("phone", ""),
            "location": doc.get("district", "India"),  # district → location
            "district": doc.get("district", ""),
            "language": doc.get("language", "hi"),
            "land_size": doc.get("land_size", 1.0),
            "water_source": doc.get("water_source", "rainfed"),
            "past_crops": doc.get("past_crops", []),
            "budget": doc.get("budget", 0.0),
            "notes": doc.get("notes", ""),
        }

        # Restore previously persisted agent outputs so that a resumed
        # season run can pick up where the last agent left off.
        agent_outputs: list[dict] = doc.get("agent_outputs", [])
        state: dict[str, Any] = {
            "farmer_id": doc["farmer_id"],
            "season_id": doc["season_id"],
            "profile": profile,
            "soil_report": None,
            "weather_outlook": None,
            "market_intel": None,
            "crop_shortlist": None,
            "selected_crop": None,
            "input_plan": None,
            "budget_estimate": None,
            "verified_dealers": None,
            "insurance_status": None,
            "credit_offers": None,
            "monitoring_alerts": doc.get("monitoring_alerts", []),
            "advisory_log": doc.get("advisory_log", []),
            "harvest_ready": False,
            "sell_recommendation": None,
            "sale_record": None,
            "season_feedback": None,
            "crop_recommendation_summary": None,
            "phase": doc.get("phase", "onboarding"),
            "needs_human_confirmation": False,
            "pending_confirmation_type": None,
        }

        # Layer persisted agent outputs onto the state.
        for entry in agent_outputs:
            agent_name = entry.get("agent", "")
            output = entry.get("output", {})
            # Map agent names to FarmerState fields
            field_map = {
                "soil": "soil_report",
                "weather": "weather_outlook",
                "market_intel": "market_intel",
                "market_intelligence": "market_intel",
                "crop_recommendation": "crop_shortlist",
                "resource_irrigation": "input_plan",
                "irrigation": "input_plan",
                "budget_estimator": "budget_estimate",
                "input_verification": "verified_dealers",
                "scheme_insurance": "insurance_status",
                "credit": "credit_offers",
                "crop_monitoring": "monitoring_alerts",
                "advisory": "advisory_log",
                "storage_sell_timing": "sell_recommendation",
                "market_linkage": "sale_record",
                "feedback": "season_feedback",
            }
            field = field_map.get(agent_name)
            if field:
                if agent_name == "crop_recommendation" and isinstance(output, dict):
                    # CropRecommendationAgent returns {crop_shortlist, crop_recommendation_summary}
                    state["crop_shortlist"] = output.get("crop_shortlist", [])
                    state["crop_recommendation_summary"] = output.get("crop_recommendation_summary", "")
                else:
                    state[field] = output

        return state

    def load_profile(self) -> dict[str, Any]:
        """Return only the ``profile`` sub-dict from the loaded context.

        Convenience for agents that only need profile data.
        """
        return self.load()["profile"]

    # ─── Saving ────────────────────────────────────────────────

    def save_agent_output(self, agent_name: str, output: dict[str, Any]) -> dict[str, Any]:
        """Persist a single agent's output to MongoDB under
        ``agent_outputs``.

        Returns the full updated document.
        """
        result = self._service.save_agent_output(
            self.farmer_id, agent_name, output
        )
        if result is None:
            raise LookupError(
                f"Farmer not found for farmer_id={self.farmer_id}"
            )
        return result

    def update_profile(self, **fields: Any) -> dict[str, Any]:
        """Update one or more profile-level fields (e.g. ``land_size``,
        ``budget``) on the farmer's MongoDB record.
        """
        result = self._service.update_farmer(self.farmer_id, fields)
        if result is None:
            raise LookupError(
                f"Farmer not found for farmer_id={self.farmer_id}"
            )
        return result

    def update_phase(self, phase: str) -> dict[str, Any]:
        """Advance the farmer's pipeline phase.

        Valid phases: onboarding, diagnostics, recommendation, planning,
        monitoring, harvest_decision, market_linkage, feedback.
        """
        result = self._service.update_farmer(self.farmer_id, {"phase": phase})
        if result is None:
            raise LookupError(
                f"Farmer not found for farmer_id={self.farmer_id}"
            )
        return result

    # ─── Convenience ───────────────────────────────────────────

    @classmethod
    def from_farmer_id(cls, farmer_id: str, service: FarmerService | None = None) -> "FarmerContext":
        """Look up a farmer by farmer_id and construct a FarmerContext,
        inferring season_id from the MongoDB record.
        """
        svc = service or FarmerService()
        doc = svc.get_by_farmer_id(farmer_id)
        if doc is None:
            raise LookupError(f"Farmer not found for farmer_id={farmer_id}")
        return cls(
            farmer_id=doc["farmer_id"],
            season_id=doc["season_id"],
            service=svc,
        )

    @classmethod
    def from_season_id(cls, season_id: str, service: FarmerService | None = None) -> "FarmerContext":
        """Look up a farmer by season_id.

        Currently MongoDB does not index season_id, so we look up by
        ``season_id`` field directly.  If no result is found, raises
        ``LookupError``.
        """
        svc = service or FarmerService()
        doc = svc.collection.find_one({"season_id": season_id})
        if doc is None:
            raise LookupError(f"Farmer not found for season_id={season_id}")
        return cls(
            farmer_id=doc["farmer_id"],
            season_id=doc["season_id"],
            service=svc,
        )

    def to_state(self) -> dict[str, Any]:
        """Alias for :meth:`load`."""
        return self.load()
