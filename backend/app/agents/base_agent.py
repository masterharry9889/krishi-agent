# Base agent with common LLM client, retry, structured-output parsing.
# For now, a stub; actual implementation would initialize an LLM client
# and provide helper methods for calling tools and parsing outputs.

class BaseAgent:
    def __init__(self):
        # In practice: self.llm = ChatModel(...), self.tools = [...]
        pass