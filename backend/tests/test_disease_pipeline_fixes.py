"""
Tests for the disease detection pipeline bug fixes.

Covers:
  Lead #2: call_vision_llm() multimodal message format
  Lead #3: error vs uncertainty distinction (diagnosis_source)
  Lead #4: mock result labeling ([MOCK] prefix)
  Lead #5: graph compilation (no duplicate edge errors)
  Lead #6: language passthrough
"""
import json
import os
import sys
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from pydantic import BaseModel, Field
from typing import List

# Ensure backend is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents.base_agent import BaseAgent, LANGUAGE_NAMES
from app.agents.disease_detection_agent import (
    DiseaseDetectionAgent,
    DiseaseDetectionResult,
)


# ─── Fixtures ──────────────────────────────────────────────────────────

class DummySchema(BaseModel):
    name: str = Field(description="Test name")
    value: float = Field(ge=0.0, le=1.0)


@pytest.fixture
def agent():
    """BaseAgent in non-mock mode with fake credentials."""
    with patch.dict(os.environ, {"USE_MOCK_TOOLS": "false", "GROQ_API_KEY": "test-key"}):
        a = BaseAgent()
        a.api_key = "test-key"
        a.client = MagicMock()
        return a


@pytest.fixture
def detection_agent():
    """DiseaseDetectionAgent in non-mock mode with fake credentials."""
    with patch.dict(os.environ, {"USE_MOCK_TOOLS": "false", "GROQ_API_KEY": "test-key"}):
        a = DiseaseDetectionAgent()
        a.api_key = "test-key"
        a.client = MagicMock()
        return a


@pytest.fixture
def mock_detection_agent():
    """DiseaseDetectionAgent in mock mode."""
    with patch.dict(os.environ, {"USE_MOCK_TOOLS": "true"}):
        return DiseaseDetectionAgent()


# ─── Lead #2: call_vision_llm message format ──────────────────────────

class TestCallVisionLLM:
    """Tests for the new call_vision_llm method."""

    def test_call_llm_rejects_image_base64_kwarg(self, agent):
        """REGRESSION: call_llm() must reject image_base64 (the original bug)."""
        with pytest.raises(TypeError, match="image_base64"):
            agent.call_llm(
                system_prompt="test",
                user_content="test",
                response_schema=DummySchema,
                max_retries=1,
                image_base64="fake_data",
            )

    def test_call_vision_llm_exists(self, agent):
        """call_vision_llm must exist on BaseAgent."""
        assert hasattr(agent, "call_vision_llm")
        assert callable(agent.call_vision_llm)

    def test_call_vision_llm_builds_multimodal_message(self, agent):
        """call_vision_llm must construct image_url content blocks."""
        # Mock the Groq API response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(
            {"name": "test", "value": 0.5}
        )
        agent.client.chat.completions.create.return_value = mock_response

        result = agent.call_vision_llm(
            system_prompt="Analyze this image",
            user_content="What do you see?",
            image_base64="abc123base64data",
            response_schema=DummySchema,
            language="en",
        )

        # Verify the API was called
        call_args = agent.client.chat.completions.create.call_args
        messages = call_args.kwargs["messages"]

        # System message should be a string
        assert messages[0]["role"] == "system"
        assert isinstance(messages[0]["content"], str)

        # User message should be a list with text + image_url
        assert messages[1]["role"] == "user"
        content = messages[1]["content"]
        assert isinstance(content, list)
        assert len(content) == 2

        # First item: text
        assert content[0]["type"] == "text"
        assert content[0]["text"] == "What do you see?"

        # Second item: image_url with base64 data URI
        assert content[1]["type"] == "image_url"
        assert content[1]["image_url"]["url"] == "data:image/jpeg;base64,abc123base64data"

    def test_call_vision_llm_handles_data_uri(self, agent):
        """If image_base64 is already a data URI, don't double-wrap it."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(
            {"name": "test", "value": 0.5}
        )
        agent.client.chat.completions.create.return_value = mock_response

        agent.call_vision_llm(
            system_prompt="test",
            user_content="test",
            image_base64="data:image/png;base64,iVBOR",
            response_schema=DummySchema,
        )

        call_args = agent.client.chat.completions.create.call_args
        content = call_args.kwargs["messages"][1]["content"]
        assert content[1]["image_url"]["url"] == "data:image/png;base64,iVBOR"

    def test_call_vision_llm_uses_vision_model(self, agent):
        """call_vision_llm must use self.vision_model, not self.model."""
        agent.vision_model = "test-vision-model"
        agent.model = "test-text-model"

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(
            {"name": "test", "value": 0.5}
        )
        agent.client.chat.completions.create.return_value = mock_response

        agent.call_vision_llm(
            system_prompt="test",
            user_content="test",
            image_base64="abc",
            response_schema=DummySchema,
        )

        call_args = agent.client.chat.completions.create.call_args
        assert call_args.kwargs["model"] == "test-vision-model"

    def test_call_vision_llm_raises_without_api_key(self):
        """call_vision_llm must raise ValueError if no API key."""
        with patch.dict(os.environ, {"USE_MOCK_TOOLS": "false"}, clear=False):
            agent = BaseAgent()
            agent.api_key = None
            agent.client = None

            with pytest.raises(ValueError, match="GROQ_API_KEY"):
                agent.call_vision_llm(
                    system_prompt="test",
                    user_content="test",
                    image_base64="abc",
                    response_schema=DummySchema,
                )


# ─── Lead #2 cont.: _extract_json helper ──────────────────────────────

class TestExtractJson:
    """Tests for the JSON extraction helper."""

    def test_raw_json(self):
        result = BaseAgent._extract_json('{"name": "test", "value": 0.5}')
        assert result == {"name": "test", "value": 0.5}

    def test_json_in_code_block(self):
        text = '```json\n{"name": "test", "value": 0.5}\n```'
        result = BaseAgent._extract_json(text)
        assert result == {"name": "test", "value": 0.5}

    def test_json_in_prose(self):
        text = 'Here is the analysis:\n{"name": "test", "value": 0.5}\nEnd of response.'
        result = BaseAgent._extract_json(text)
        assert result == {"name": "test", "value": 0.5}

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Could not extract JSON"):
            BaseAgent._extract_json("no json here at all")


# ─── Lead #3: error vs uncertainty distinction ────────────────────────

class TestDiagnosisSource:
    """Tests for diagnosis_source field distinguishing error from uncertainty."""

    def test_model_error_produces_error_source(self, detection_agent):
        """When vision model call fails, diagnosis_source must be 'vision_model_error'."""
        detection_agent.client.chat.completions.create.side_effect = RuntimeError("API down")

        state = {
            "profile": {"district": "Nagpur", "language": "en"},
            "selected_crop": "Rice",
            "image_data": "fake_base64_image",
        }

        result = detection_agent.run(state)
        dd = result["disease_detection"]

        assert dd["diagnosis_source"] == "vision_model_error"
        assert dd["data_status"] == "Model Error - Using Fallback"
        assert any("error" in w.lower() or "fallback" in w.lower() for w in dd["warnings"])

    def test_low_confidence_produces_uncertain_source(self, detection_agent):
        """When model returns low confidence, diagnosis_source must be 'vision_model_uncertain'."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "disease_name": "Blast",
            "confidence": 0.3,
            "affected_crop": "Rice",
            "symptoms_observed": ["spots"],
            "is_healthy": False,
            "needs_human_review": False,
        })
        detection_agent.client.chat.completions.create.return_value = mock_response

        state = {
            "profile": {"district": "Nagpur", "language": "en"},
            "selected_crop": "Rice",
            "image_data": "fake_base64_image",
        }

        result = detection_agent.run(state)
        dd = result["disease_detection"]

        assert dd["diagnosis_source"] == "vision_model_uncertain"
        assert dd["needs_human_review"] is True  # Forced by threshold
        assert dd["data_status"] == "Image Unclear - Retake Needed"

    def test_high_confidence_produces_confident_source(self, detection_agent):
        """When model returns high confidence, diagnosis_source must be 'vision_model_confident'."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "disease_name": "Blast",
            "confidence": 0.85,
            "affected_crop": "Rice",
            "symptoms_observed": ["diamond-shaped lesions"],
            "is_healthy": False,
            "needs_human_review": False,
        })
        detection_agent.client.chat.completions.create.return_value = mock_response

        state = {
            "profile": {"district": "Nagpur", "language": "en"},
            "selected_crop": "Rice",
            "image_data": "fake_base64_image",
        }

        result = detection_agent.run(state)
        dd = result["disease_detection"]

        assert dd["diagnosis_source"] == "vision_model_confident"
        assert dd["needs_human_review"] is False
        assert dd["data_status"] == "Image Analysis Complete"
        assert dd["disease_name"] == "Blast"


# ─── Lead #4: mock result labeling ────────────────────────────────────

class TestMockLabeling:
    """Tests for mock result [MOCK] labeling."""

    def test_mock_result_has_mock_prefix(self, mock_detection_agent):
        """Mock disease_name must start with [MOCK]."""
        result = mock_detection_agent._get_mock_result("Rice", "Nagpur")
        assert result["disease_name"].startswith("[MOCK]")

    def test_mock_result_has_is_mock_flag(self, mock_detection_agent):
        result = mock_detection_agent._get_mock_result("Cotton", "Nagpur")
        assert result["is_mock"] is True

    def test_mock_result_has_diagnosis_source(self, mock_detection_agent):
        result = mock_detection_agent._get_mock_result("Rice", "Nagpur")
        assert result["diagnosis_source"] == "mock"

    def test_mock_result_has_development_warning(self, mock_detection_agent):
        result = mock_detection_agent._get_mock_result("Rice", "Nagpur")
        warnings = result["warnings"]
        assert any("SIMULATED" in w or "NOT based on" in w for w in warnings)

    def test_mock_run_returns_labeled_result(self, mock_detection_agent):
        """Full run() in mock mode must produce [MOCK] labeled output."""
        state = {
            "profile": {"district": "Nagpur", "language": "en"},
            "selected_crop": "Rice",
            "image_data": "fake_base64_image",
        }
        result = mock_detection_agent.run(state)
        dd = result["disease_detection"]
        assert dd["disease_name"].startswith("[MOCK]")
        assert dd["diagnosis_source"] == "mock"


# ─── Lead #5: graph compilation ───────────────────────────────────────

class TestGraphCompilation:
    """Test that build_graph compiles without errors."""

    def test_build_graph_compiles(self):
        """Graph must compile after removing duplicate edge."""
        from langgraph.checkpoint.memory import MemorySaver
        from app.graph.build_graph import build_graph

        checkpointer = MemorySaver()
        graph = build_graph(checkpointer)
        assert graph is not None

    def test_no_duplicate_validation_end_edge(self):
        """build_graph.py should have exactly one validation→END edge."""
        graph_path = os.path.join(
            os.path.dirname(__file__), "..", "app", "graph", "build_graph.py"
        )
        with open(graph_path) as f:
            source = f.read()
        count = source.count('graph.add_edge("validation", END)')
        assert count == 1, f"Expected 1 validation→END edge, found {count}"


# ─── Lead #6: language passthrough ────────────────────────────────────

class TestLanguagePassthrough:
    """Tests for language parameter forwarding to call_vision_llm."""

    def test_vision_llm_includes_language_instruction(self, agent):
        """call_vision_llm system prompt must include the language name."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(
            {"name": "test", "value": 0.5}
        )
        agent.client.chat.completions.create.return_value = mock_response

        agent.call_vision_llm(
            system_prompt="Analyze this",
            user_content="test",
            image_base64="abc",
            response_schema=DummySchema,
            language="ta",
        )

        call_args = agent.client.chat.completions.create.call_args
        system_prompt = call_args.kwargs["messages"][0]["content"]
        assert "Tamil" in system_prompt
        assert "(ta)" in system_prompt

    def test_disease_detection_passes_language(self, detection_agent):
        """DiseaseDetectionAgent.run() must forward profile language to vision LLM."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "disease_name": "Blast",
            "confidence": 0.85,
            "affected_crop": "Rice",
            "symptoms_observed": ["spots"],
            "is_healthy": False,
            "needs_human_review": False,
        })
        detection_agent.client.chat.completions.create.return_value = mock_response

        state = {
            "profile": {"district": "Nagpur", "language": "mr"},
            "selected_crop": "Rice",
            "image_data": "fake_base64_image",
        }

        detection_agent.run(state)

        call_args = detection_agent.client.chat.completions.create.call_args
        system_prompt = call_args.kwargs["messages"][0]["content"]
        assert "Marathi" in system_prompt
        assert "(mr)" in system_prompt


# ─── Lead #1: vision_model configuration ──────────────────────────────

class TestVisionModelConfig:
    """Tests for GROQ_VISION_MODEL env var support."""

    def test_default_vision_model(self):
        """BaseAgent should have a default vision_model."""
        with patch.dict(os.environ, {"USE_MOCK_TOOLS": "true"}, clear=False):
            agent = BaseAgent()
            assert hasattr(agent, "vision_model")
            assert agent.vision_model  # not empty
            assert "vision" in agent.vision_model.lower() or "scout" in agent.vision_model.lower() or "llama-4" in agent.vision_model.lower()

    def test_env_override_vision_model(self):
        """GROQ_VISION_MODEL env var should override the default."""
        with patch.dict(os.environ, {
            "USE_MOCK_TOOLS": "true",
            "GROQ_VISION_MODEL": "my-custom-vision-model",
        }):
            agent = BaseAgent()
            assert agent.vision_model == "my-custom-vision-model"

    def test_disease_agent_uses_vision_model(self):
        """DiseaseDetectionAgent should not hardcode a deprecated model."""
        with patch.dict(os.environ, {"USE_MOCK_TOOLS": "true"}, clear=False):
            agent = DiseaseDetectionAgent()
            assert "90b-vision-preview" not in agent.vision_model
