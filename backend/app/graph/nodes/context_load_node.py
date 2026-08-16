"""
Graph node: context_load

Loads the persistent farmer context from MongoDB using ``farmer_id``
and ``season_id``, producing a fully populated ``FarmerState`` dict.
This is the entry-point node that connects a registered farmer to the
multi-agent pipeline — it should be the first node in any pipeline run
that resumes from an existing farmer record.
"""
from ...context import FarmerContext


def context_load_node(state: dict) -> dict:
    """Load a farmer's full context from MongoDB.

    Expects ``state`` to contain at minimum ``farmer_id`` (and optionally
    ``season_id``).  If ``season_id`` is missing it is inferred from
    MongoDB via ``farmer_id``.

    Returns the complete ``FarmerState`` dict with the ``profile``
    sub-dict populated and all agent-output fields initialized to
    ``None`` (or restored from prior runs).
    """
    farmer_id = state.get("farmer_id")
    season_id = state.get("season_id")

    if not farmer_id:
        # Cannot load without a farmer_id — return state unchanged so
        # the graph can fall through to onboarding (new registration).
        return dict(state)

    context = FarmerContext(
        farmer_id=farmer_id,
        season_id=season_id or "",
    ) if season_id else FarmerContext.from_farmer_id(farmer_id)

    loaded = context.load()

    # Preserve any fields the caller may have set that aren't in the
    # standard FarmerState (future-proofing).
    for key, value in state.items():
        if key not in loaded or loaded[key] is None:
            loaded[key] = value

    return loaded
