import pytest
from unittest.mock import patch, MagicMock
from backend.app.agents.qa_agent import QAAgent, QAResponse

def test_qa_agent_agriculture_related():
    agent = QAAgent(model="test-model")
    
    mock_response = QAResponse(
        answer="Tomato blight can be managed by removing affected leaves and applying copper-based fungicides.",
        topic="pest_management",
        confidence=0.9,
        follow_up_suggestions=["What organic fungicide can I use?", "How often should I water?"],
        sources=["ICAR IPM Guidelines"],
        is_agriculture_related=True
    )
    
    with patch.object(agent, 'safe_call_llm', return_value=mock_response):
        result = agent.run({
            "message": "How do I cure tomato blight?",
            "profile": {"name": "Ramesh", "language": "en"}
        })
        
        assert "qa" in result
        qa_data = result["qa"]
        assert qa_data["status"] == "success"
        assert "Tomato blight can be managed" in qa_data["answer"]
        assert qa_data["topic"] == "pest_management"
        assert len(qa_data["follow_up_suggestions"]) == 2
        assert qa_data["is_agriculture_related"] is True

def test_qa_agent_non_agriculture():
    agent = QAAgent(model="test-model")
    
    mock_response = QAResponse(
        answer="I can give you a recipe for chocolate cake...",
        topic="off_topic",
        confidence=0.95,
        follow_up_suggestions=[],
        sources=[],
        is_agriculture_related=False
    )
    
    with patch.object(agent, 'safe_call_llm', return_value=mock_response):
        result = agent.run({
            "message": "How do I bake a cake?",
            "profile": {"name": "Ramesh", "language": "en"}
        })
        
        qa_data = result["qa"]
        # Guardrail override removed — LLM answer passes through as-is.
        # The endpoint-level input validation handles off-topic filtering.
        assert qa_data["is_agriculture_related"] is False
        assert len(qa_data["follow_up_suggestions"]) >= 1

def test_qa_agent_fallback():
    # If safe_call_llm returns the fallback dict instead of a QAResponse object
    agent = QAAgent(model="test-model")
    
    fallback_dict = {
        "answer": "Namaste Ramesh! Based on your farm profile...",
        "topic": "general",
        "confidence": 0.5,
        "follow_up_suggestions": ["What crops should I grow this season?"],
        "sources": ["ICAR"],
        "is_agriculture_related": True
    }
    
    with patch.object(agent, 'safe_call_llm', return_value=fallback_dict):
        result = agent.run({
            "message": "Tell me something",
            "profile": {"name": "Ramesh", "language": "en"}
        })
        
        qa_data = result["qa"]
        assert "Namaste Ramesh" in qa_data["answer"]
        assert qa_data["topic"] == "general"
        assert len(qa_data["follow_up_suggestions"]) > 0
