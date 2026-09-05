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

    def __init__(self, model: str = "llama-3.3-70b-versatile"):
        load_dotenv()
        self.model = os.environ.get("GROQ_MODEL", model)
        self.vision_model = os.environ.get(
            "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
        )
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
    ) -> T:
        """
        Calls Groq LLM using OpenAI-compatible tool/function calling for structured JSON output matching response_schema.
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

        messages = [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": user_content}
        ]

        for attempt in range(1, max_retries + 1):
            try:
                current_messages = list(messages)
                if attempt > 1:
                    current_messages.append({
                        "role": "user",
                        "content": "IMPORTANT: Your previous output did not strictly conform to the required JSON schema. Please ensure all required fields are present and valid."
                    })

                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=current_messages,
                    tools=[tool_definition],
                    tool_choice={"type": "function", "function": {"name": tool_name}},
                    temperature=0.2,
                    timeout=10.0,
                )

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
            f"Do not include any explanation, markdown formatting, or code fences — just the raw JSON object."
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
            {"type": "text", "text": user_content},
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
                            "No markdown, no explanation."
                        )
                    })

                response = self.client.chat.completions.create(
                    model=self.vision_model,
                    messages=current_messages,
                    temperature=0.2,
                    max_tokens=1024,
                    timeout=30.0,
                )

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