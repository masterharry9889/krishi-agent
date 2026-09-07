import os
import json
import re
import time
import logging
from typing import Type, TypeVar, Any, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
import groq

T = TypeVar("T", bound=BaseModel)

logger = logging.getLogger("krishi_agent.base_agent")

LANGUAGE_NAMES = {
    "hi": "Hindi",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "pa": "Punjabi",
    "gu": "Gujarati",
    "bn": "Bengali",
    "en": "English",
}

class BaseAgent:
    """Base agent providing Groq API integration with structured output parsing, retries, and language support."""

    # Groq text model current as of this writing has moved on from
    # llama-3.3-70b-versatile / llama-3.1-8b-instant (deprecated June 2026).
    # See https://console.groq.com/docs/deprecations for the current list
    # before changing this default.
    DEFAULT_TEXT_MODEL = "openai/gpt-oss-120b"

    # Vision-capable Groq model. llama-3.2-90b-vision-preview and
    # llama-4-scout-17b-16e-instruct are both deprecated as of June 2026.
    # qwen/qwen3.6-27b is the current generally-available multimodal model
    # (qwen/qwen3-vl-32b-instruct exists but requires requesting access from
    # your Groq account team, so it's not a safe default).
    DEFAULT_VISION_MODEL = "qwen/qwen3.6-27b"

    def __init__(self, model: str = None):
        load_dotenv()
        self.model = os.environ.get("GROQ_MODEL", model or self.DEFAULT_TEXT_MODEL)
        self.vision_model = os.environ.get("GROQ_VISION_MODEL", self.DEFAULT_VISION_MODEL)
        self.use_mock = os.environ.get("USE_MOCK_TOOLS", "true").lower() in ("true", "1", "yes")

        if self.use_mock:
            self.api_key = None
            self.client = None
        else:
            self.api_key = os.environ.get("GROQ_API_KEY")
            if self.api_key:
                try:
                    self.client = groq.Groq(api_key=self.api_key)
                except Exception:
                    self.client = None
            else:
                self.client = None

    def call_llm(
        self,
        system_prompt: str,
        user_content: str,
        response_schema: Type[T],
        language: str = "hi",
        max_retries: int = 2,
        image_base64: Optional[str] = None,
    ) -> T:
        """
        Calls Groq LLM using OpenAI-compatible tool/function calling for structured JSON output matching response_schema.
        Raises ValueError if API key is missing or RuntimeError if call fails.

        If image_base64 is provided, the call is routed to self.vision_model and the
        image is attached to the user message as an image_url content block (Groq's
        vision models expect multimodal "content" as a list of {type, ...} blocks,
        not a plain string) — a plain-string user_content would silently never show
        the model the image at all.
        """
        if not self.client or not self.api_key:
            raise ValueError(
                "GROQ_API_KEY environment variable is missing or invalid. "
                "Set GROQ_API_KEY in backend/.env or shell environment."
            )

        lang_name = LANGUAGE_NAMES.get(language, "Hindi")
        lang_prompt = (
            f"\n\n[LANGUAGE REQUIREMENT]\n"
            f"Write all human-readable summaries, text descriptions, advice, and recommendations in {lang_name} ({language}). "
            f"Keep all JSON property names in standard English."
        )
        full_system_prompt = system_prompt + lang_prompt

        tool_name = f"record_{response_schema.__name__.lower()}"
        tool_definition = {
            "type": "function",
            "function": {
                "name": tool_name,
                "description": f"Record structured response for {response_schema.__name__}",
                "parameters": response_schema.model_json_schema()
            }
        }

        if image_base64:
            # Groq vision models require multimodal content as a list of blocks.
            # Accept either a raw base64 string or an already-formed data URI.
            image_url = (
                image_base64 if image_base64.startswith("data:image")
                else f"data:image/jpeg;base64,{image_base64}"
            )
            user_message_content = [
                {"type": "text", "text": user_content},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]
            model_to_use = self.vision_model
        else:
            user_message_content = user_content
            model_to_use = self.model

        messages = [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": user_message_content}
        ]

        for attempt in range(1, max_retries + 1):
            try:
                current_messages = list(messages)
                if attempt > 1:
                    current_messages.append({
                        "role": "user",
                        "content": "IMPORTANT: Your previous output did not strictly conform to the required JSON schema. Please ensure all required fields are present and valid."
                    })

                call_kwargs = {
                    "model": model_to_use,
                    "messages": current_messages,
                    "tools": [tool_definition],
                    "tool_choice": {"type": "function", "function": {"name": tool_name}},
                    "temperature": 0.2,
                    "timeout": 25.0 if image_base64 else 10.0,
                }
                if image_base64:
                    call_kwargs["max_tokens"] = 600

                response = self.client.chat.completions.create(**call_kwargs)

                tool_calls = response.choices[0].message.tool_calls
                if not tool_calls:
                    raise ValueError("Groq API returned response but tool_calls is empty.")

                raw_arguments = tool_calls[0].function.arguments
                if isinstance(raw_arguments, str):
                    parsed_json = json.loads(raw_arguments)
                else:
                    parsed_json = raw_arguments

                validated_instance = response_schema.model_validate(parsed_json)
                return validated_instance

            except Exception as e:
                if attempt == max_retries:
                    raise RuntimeError(f"Groq LLM call failed after {max_retries} attempts: {e}") from e
                time.sleep(0.5 * attempt)

    def safe_call_llm(
        self,
        system_prompt: str,
        user_content: str,
        response_schema: Type[T],
        fallback_data: Any,
        language: str = "hi",
    ) -> Any:
        """
        Safely attempts to call the LLM. If mock mode is on, API key is missing, or LLM call fails,
        returns fallback_data without throwing raw provider exceptions.
        """
        if self.use_mock or not self.client or not self.api_key:
            return fallback_data

        try:
            llm_result = self.call_llm(
                system_prompt=system_prompt,
                user_content=user_content,
                response_schema=response_schema,
                language=language,
            )
            return llm_result.model_dump()
        except Exception as exc:
            # Safely log warning and return fallback
            print(f"[BaseAgent Warning] LLM call failed ({exc}). Using structured fallback.")
            return fallback_data

    # Alias call_claude to call_llm for backwards compatibility
    def call_claude(
        self,
        system_prompt: str,
        user_content: str,
        response_schema: Type[T],
        max_retries: int = 2,
    ) -> T:
        return self.call_llm(system_prompt, user_content, response_schema, max_retries=max_retries)

    def call_vision_llm(
        self,
        system_prompt: str,
        user_content: str,
        image_base64: str,
        response_schema: Type[T],
        language: str = "hi",
        max_retries: int = 2,
    ) -> T:
        """
        Calls a vision-capable Groq LLM with both text and an image.

        Uses OpenAI-compatible multimodal message format with image_url content blocks.
        Parses structured JSON from the model response and validates against response_schema.
        Raises ValueError if API key is missing or RuntimeError if call fails.
        """
        if not self.client or not self.api_key:
            raise ValueError(
                "GROQ_API_KEY environment variable is missing or invalid. "
                "Set GROQ_API_KEY in backend/.env or shell environment."
            )

        lang_name = LANGUAGE_NAMES.get(language, "Hindi")
        lang_prompt = (
            f"\n\n[LANGUAGE REQUIREMENT]\n"
            f"Write all human-readable summaries, text descriptions, advice, and recommendations in {lang_name} ({language}). "
            f"Keep all JSON property names in standard English."
        )

        schema_json = json.dumps(response_schema.model_json_schema(), indent=2)
        json_instruction = (
            f"\n\n[OUTPUT FORMAT]\n"
            f"Respond ONLY with a valid JSON object matching this schema:\n{schema_json}\n"
            f"Do NOT output any chain-of-thought, reasoning, or <think> tags. "
            f"Do not include any explanation, markdown formatting, or code fences — start directly with '{{' and end with '}}'."
        )

        full_system_prompt = system_prompt + lang_prompt + json_instruction

        # Build image URL — handle raw base64, data URIs, and HTTP URLs
        if image_base64.startswith("data:image"):
            image_url = image_base64
        elif image_base64.startswith("http"):
            image_url = image_base64
        else:
            image_url = f"data:image/jpeg;base64,{image_base64}"

        # Build multimodal user message (OpenAI-compatible format)
        user_message_content = [
            {
                "type": "text",
                "text": f"{user_content}\n\nCRITICAL: Output ONLY the raw JSON object directly starting with '{{'. Do NOT output <think> tags or internal thoughts."
            },
            {"type": "image_url", "image_url": {"url": image_url}},
        ]

        messages = [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": user_message_content},
        ]

        for attempt in range(1, max_retries + 1):
            try:
                current_messages = list(messages)
                if attempt > 1:
                    current_messages.append({
                        "role": "user",
                        "content": (
                            "IMPORTANT: Your previous output was not valid JSON. "
                            "Return ONLY the raw JSON object matching the schema. "
                            "No markdown, no explanation, no <think> tags."
                        )
                    })

                call_kwargs = {
                    "model": self.vision_model,
                    "messages": current_messages,
                    "temperature": 0.1,
                    "max_tokens": 750,
                    "timeout": 30.0,
                }
                if "qwen" in self.vision_model.lower():
                    call_kwargs["reasoning_effort"] = "none"

                response = self.client.chat.completions.create(**call_kwargs)

                content = response.choices[0].message.content or ""
                parsed_json = self._extract_json(content)
                validated_instance = response_schema.model_validate(parsed_json)

                logger.info(
                    f"[VISION_LLM] Success on attempt {attempt}/{max_retries} "
                    f"model={self.vision_model}"
                )
                return validated_instance

            except Exception as e:
                logger.warning(
                    f"[VISION_LLM] Attempt {attempt}/{max_retries} failed: {e}"
                )
                if attempt == max_retries:
                    raise RuntimeError(
                        f"Vision LLM call failed after {max_retries} attempts: {e}"
                    ) from e
                time.sleep(0.5 * attempt)

    @staticmethod
    def _extract_json(text: str) -> dict:
        """Extract a JSON object from LLM response text.

        Handles:
          - Raw JSON (model returned only JSON)
          - JSON inside ```json ... ``` code blocks
          - JSON embedded in surrounding prose
        """
        text = text.strip()
        # Strip reasoning tags if present
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
        text = re.sub(r'<thought>.*?</thought>', '', text, flags=re.DOTALL).strip()

        # 1. Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 2. Try extracting from markdown code block
        code_block = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', text, re.DOTALL)
        if code_block:
            try:
                return json.loads(code_block.group(1).strip())
            except json.JSONDecodeError:
                pass

        # 3. Try finding a JSON object in the text by brace matching
        brace_start = text.find('{')
        if brace_start >= 0:
            depth = 0
            for i in range(brace_start, len(text)):
                if text[i] == '{':
                    depth += 1
                elif text[i] == '}':
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(text[brace_start:i + 1])
                        except json.JSONDecodeError:
                            break

        raise ValueError(f"Could not extract JSON from response: {text[:300]}")