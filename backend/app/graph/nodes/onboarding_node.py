# Node: onboarding
# Called at the start of the season to collect farmer profile.
# In practice, this node would call the FarmerInterfaceAgent (via voice/app).
# For now, we stub it to accept input from the API layer (the API would have already
# collected the profile and passed it in the state, or we can have the node read from
# a form). We'll design the node to expect the profile in the state under a key
# that the API sets, or we can have the node do nothing and assume the API has
# already set the profile.

# However, to match the spec, the node should trigger the onboarding process.
# We'll design the node to be invoked by the API with the profile data, and then
# the node will set the profile in the state.

# But note: the state already has a 'profile' field. The API (or a front-end) would
# have collected the profile and then invoked the graph with that profile.

# So the node can simply pass through the profile that is already in the state?
# Actually, the state is passed to the node, and the node can read the profile from
# the state if it was set by the API before invoking the graph.

# However, the spec says the Farmer Interface Agent collects the profile via voice or app.
# We'll assume that the API layer (or a front-end) has already collected the profile
# and placed it in the state under 'profile' before invoking the graph.

# Therefore, the onboarding node does nothing but ensure the profile is present.
# We'll add a check and set a placeholder if not.

def onboarding_node(state):
    # Ensure profile exists; if not, set a default (should not happen in production)
    if not state.get("profile"):
        # In a real system, we would raise an error or trigger the UI to collect.
        # For now, we set a minimal profile to allow the graph to run.
        state["profile"] = {
            "location": "unknown",
            "land_size": 0,
            "water_source": "unknown",
            "past_crops": [],
            "budget": 0,
            "language": "en"
        }
    # Return the state update (we are not changing anything, but we can return the profile
    # to ensure it's set). Actually, we are just passing through.
    return {"profile": state["profile"]}