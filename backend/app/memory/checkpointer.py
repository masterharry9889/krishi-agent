"""
Memory checkpointer module exporting MemorySaver instance.
"""
from langgraph.checkpoint.memory import MemorySaver

# Shared MemorySaver instance for state persistence during graph execution
memory_checkpointer = MemorySaver()
