"""
Shared farmer context layer for the Krishi Agent multi-agent pipeline.

This package provides a service-oriented bridge between MongoDB-stored
farmer records and the LangGraph FarmerState TypedDict.  It lets any
agent read/write the shared, persistent farmer context using only the
``farmer_id`` and ``season_id`` returned by the /onboard API.
"""
from .farmer_context import FarmerContext

__all__ = ["FarmerContext"]
