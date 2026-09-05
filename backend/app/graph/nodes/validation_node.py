"""
Validation Node — LangGraph node wrapper for the Validation Agent.

This node runs as the FINAL step in the graph before the response is returned to the user.
It validates all agent outputs through the guardrail layer.
"""
from ...agents.validation_agent import validation_node as _validation_node

# Re-export with the expected name
validation_node = _validation_node