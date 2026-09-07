"""
Disease Detection Agent — Identifies crop diseases/pests from leaf images.

Uses a vision-capable model to classify uploaded crop/leaf photos against
common diseases for the farmer's crop and region. Returns structured output
with confidence scoring and human-review flags.
"""
import os
import base64
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from .base_agent import BaseAgent

logger = logging.getLogger("krishi_agent.disease_detection")


# ─── Response Schema ───────────────────────────────────────────────────

class DiseaseDetectionResult(BaseModel):
    """Structured result from vision model classification."""
    disease_name: str = Field(description="Name of identified disease or 'Healthy'")
    confidence: float = Field(ge=0.0, le=1.0, description="Model confidence 0-1")
    affected_crop: str = Field(description="Crop type the disease affects")
    symptoms_observed: List[str] = Field(default_factory=list, description="Visible symptoms described")
    is_healthy: bool = Field(description="True if no disease detected")
    needs_human_review: bool = Field(description="True if confidence below threshold or unclear image")


# ─── Agent ──────────────────────────────────────────────────────────────

class DiseaseDetectionAgent(BaseAgent):
    """
    Detects crop diseases and pests from leaf/crop images using vision LLM.

    Input (from state):
        - image_data: base64 encoded image or file reference
        - crop_type: optional, from farmer's selected_crop or crop_shortlist
        - district: from farmer's profile location

    Output:
        - disease_detection: structured result with diagnosis
    """

    # Confidence threshold below which we request a clearer photo
    CONFIDENCE_THRESHOLD = 0.6

    # Common Indian crop diseases by crop (for prompt context)
    CROP_DISEASES = {
        "Cotton": [
            "Bollworm", "Aphid", "Whitefly", "Leaf Curl Virus",
            "Bacterial Blight", "Fusarium Wilt", "Root Rot", "Alternaria Leaf Spot"
        ],
        "Soyabean": [
            "Yellow Mosaic Virus", "Rust", "Bacterial Pustule",
            "Pod Blight", "Charcoal Rot", "Stem Fly", "Girdle Beetle"
        ],
        "Maize": [
            "Fall Armyworm", "Stem Borer", "Downy Mildew",
            "Leaf Blight", "Rust", "Ear Rot"
        ],
        "Wheat": [
            "Yellow Rust", "Brown Rust", "Black Rust",
            "Powdery Mildew", "Loose Smut", "Karnal Bunt"
        ],
        "Rice": [
            "Blast", "Bacterial Leaf Blight", "Brown Spot",
            "Sheath Blight", "Tungro Virus", "Stem Borer", "Leaf Folder"
        ],
        "Pearl Millet": [
            "Downy Mildew", "Ergot", "Smut", "Rust"
        ],
        "Sugarcane": [
            "Red Rot", "Wilt", "Smut", "Top Borer", "Early Shoot Borer"
        ],
        "Groundnut": [
            "Leaf Spot", "Rust", "Stem Rot", "Bud Necrosis"
        ],
    }

    SYSTEM_PROMPT = (
        "You are an expert Plant Pathologist specializing in Indian crop diseases. "
        "Analyze the provided crop/leaf image and identify any visible disease or pest symptoms. "
        "Consider the crop type and regional context (Indian agriculture). "
        "Return a structured diagnosis with confidence scoring. "
        "If the image is unclear, not a plant, or confidence is low, indicate human review is needed."
    )

    def __init__(self, model: str = None):
        # No model override here — BaseAgent.vision_model (qwen/qwen3.6-27b by
        # default, overridable via GROQ_VISION_MODEL) is what actually gets used
        # for image calls. llama-3.2-90b-vision-preview is deprecated on Groq.
        super().__init__(model=model)

    def _get_crop_context(self, crop_type: str) -> str:
        """Get relevant disease list for the crop."""
        diseases = self.CROP_DISEASES.get(crop_type, [])
        if diseases:
            return f"Common diseases/pests for {crop_type}: {', '.join(diseases)}."
        return f"No specific disease database for {crop_type}; use general plant pathology knowledge."

    def _build_user_content(
        self,
        image_base64: str,
        crop_type: str,
        district: str
    ) -> str:
        """Build the user content for the vision model."""
        crop_context = self._get_crop_context(crop_type)
        return (
            f"Analyze this crop/leaf image for disease or pest symptoms.\n\n"
            f"Crop type: {crop_type}\n"
            f"Location (district): {district}\n"
            f"{crop_context}\n\n"
            f"Return a JSON object with exactly these fields:\n"
            f'  "disease_name": string (name of disease/pest, or "Healthy" if none)\n'
            f'  "confidence": float 0-1 (your certainty)\n'
            f'  "affected_crop": string (the crop type)\n'
            f'  "symptoms_observed": array of strings (visible symptoms, empty if healthy)\n'
            f'  "is_healthy": boolean (true if no disease detected)\n'
            f'  "needs_human_review": boolean (true if image unclear, not a plant, or confidence < {self.CONFIDENCE_THRESHOLD})\n\n'
            f"Be precise. If uncertain, set needs_human_review=true and confidence low."
        )

    def _create_fallback_result(self, crop_type: str, reason: str) -> DiseaseDetectionResult:
        """Create a fallback result when vision model unavailable or fails."""
        return DiseaseDetectionResult(
            disease_name="Unknown",
            confidence=0.0,
            affected_crop=crop_type,
            symptoms_observed=[],
            is_healthy=False,
            needs_human_review=True
        )

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        crop_shortlist = state.get("crop_shortlist", [])
        selected_crop = state.get("selected_crop", "")
        image_data = state.get("image_data")  # base64 string or file reference
        now = datetime.now(timezone.utc).isoformat()

        # Determine crop type
        crop_type = selected_crop
        if not crop_type and crop_shortlist:
            first = crop_shortlist[0]
            crop_type = first.get("crop", "Unknown") if isinstance(first, dict) else str(first)
        if not crop_type:
            crop_type = "Unknown"

        district = profile.get("district") or profile.get("location") or "India"
        language = profile.get("language", "en")

        logger.info(
            f"[DISEASE_DETECTION] farmer_id={state.get('farmer_id')} "
            f"crop={crop_type} district={district} has_image={bool(image_data)}"
        )

        # If no image provided, return early with a clear message
        if not image_data:
            fallback = DiseaseDetectionResult(
                disease_name="No image provided",
                confidence=0.0,
                affected_crop=crop_type,
                symptoms_observed=[],
                is_healthy=False,
                needs_human_review=True
            )
            result = {
                "agent": "disease_detection",
                "status": "success",
                "generated_at": now,
                "timestamp": now,
                "source": "Disease Detection Agent (no image)",
                "confidence": 0.0,
                "is_estimated": False,
                "data_status": "No Image Provided",
                "disease_name": fallback.disease_name,
                "confidence": fallback.confidence,
                "affected_crop": fallback.affected_crop,
                "symptoms_observed": fallback.symptoms_observed,
                "is_healthy": fallback.is_healthy,
                "needs_human_review": True,
                "recommendations": [
                    "Please upload a clear photo of the affected leaf or plant for disease diagnosis."
                ],
                "warnings": ["No image was provided for analysis."]
            }
            return {"disease_detection": result}

        # Prepare image for vision model
        image_base64 = self._prepare_image(image_data)

        # If mock mode or no API key, return mock result
        if self.use_mock or not self.api_key:
            logger.info("[DISEASE_DETECTION] Using mock response (no API key or mock mode)")
            mock_result = self._get_mock_result(crop_type, district)
            return {"disease_detection": mock_result}

        # Call vision LLM
        diagnosis_source = "vision_model_error"  # default; overridden on success
        try:
            user_content = self._build_user_content(image_base64, crop_type, district)

            # For vision models, we need to pass the image.
            # call_llm returns a validated DiseaseDetectionResult instance (not a
            # dict) — work with it as a model, then re-apply the human-review
            # threshold and rebuild before returning.
            analysis: DiseaseDetectionResult = self.call_llm(
                system_prompt=self.SYSTEM_PROMPT,
                user_content=user_content,
                response_schema=DiseaseDetectionResult,
                language=language,
                max_retries=2,
                image_base64=image_base64
            )

            needs_review = analysis.needs_human_review or analysis.confidence < self.CONFIDENCE_THRESHOLD
            detection = analysis.model_copy(update={"needs_human_review": needs_review})

            diagnosis_source = (
                "vision_model_uncertain"
                if detection.needs_human_review
                else "vision_model_confident"
            )

            logger.info(
                f"[DISEASE_DETECTION] Vision model returned: "
                f"disease={detection.disease_name} confidence={detection.confidence:.2f} "
                f"source={diagnosis_source}"
            )

        except Exception as e:
            logger.error(
                f"[DISEASE_DETECTION] Vision model call FAILED for "
                f"farmer_id={state.get('farmer_id')} crop={crop_type}: {e}",
                exc_info=True,
            )
            detection = self._create_fallback_result(crop_type, str(e))
            diagnosis_source = "vision_model_error"

        # Build agent output
        warnings = []
        if diagnosis_source == "vision_model_error":
            warnings.append(
                "Disease detection model encountered an error. "
                "This is a fallback result — please retry or consult your local agriculture officer."
            )
        elif detection.needs_human_review:
            if detection.confidence < self.CONFIDENCE_THRESHOLD:
                warnings.append(
                    f"Confidence ({detection.confidence:.0%}) below threshold ({self.CONFIDENCE_THRESHOLD:.0%}). "
                    "Please retake photo with better lighting and focus on affected area."
                )
            else:
                warnings.append("Image unclear or not a plant. Please upload a clearer photo of the affected leaf.")

        if detection.is_healthy:
            recommendations = [
                f"No disease detected on {crop_type}. The plant appears healthy.",
                "Continue regular monitoring and good agricultural practices."
            ]
        elif detection.needs_human_review:
            recommendations = [
                "Unable to confidently diagnose from this image.",
                "Please upload a clearer photo: good lighting, focus on affected leaf, avoid shadows."
            ]
        else:
            recommendations = [
                f"Detected: {detection.disease_name} on {crop_type} "
                f"(confidence: {detection.confidence:.0%})."
            ]
            if detection.symptoms_observed:
                recommendations.append(
                    f"Symptoms observed: {', '.join(detection.symptoms_observed)}"
                )

        data_status_map = {
            "vision_model_confident": "Image Analysis Complete",
            "vision_model_uncertain": "Image Unclear - Retake Needed",
            "vision_model_error": "Model Error - Using Fallback",
        }

        result = {
            "agent": "disease_detection",
            "status": "success",
            "generated_at": now,
            "timestamp": now,
            "source": f"Vision-based Disease Detection (Groq {self.vision_model})",
            "confidence": detection.confidence,
            "is_estimated": False,
            "data_status": data_status_map.get(diagnosis_source, "Unknown"),
            "diagnosis_source": diagnosis_source,
            "disease_name": detection.disease_name,
            "affected_crop": detection.affected_crop,
            "symptoms_observed": detection.symptoms_observed,
            "is_healthy": detection.is_healthy,
            "needs_human_review": detection.needs_human_review,
            "recommendations": recommendations,
            "warnings": warnings,
        }

        return {"disease_detection": result}

    def _prepare_image(self, image_data: Any) -> str:
        """Convert various image inputs to base64 string."""
        if isinstance(image_data, str):
            # Already base64 or URL
            if image_data.startswith("data:image") or image_data.startswith("http"):
                return image_data
            # Assume it's already base64
            return image_data
        elif isinstance(image_data, bytes):
            return base64.b64encode(image_data).decode("utf-8")
        elif isinstance(image_data, dict):
            # File reference object
            if "base64" in image_data:
                return image_data["base64"]
            if "path" in image_data:
                with open(image_data["path"], "rb") as f:
                    return base64.b64encode(f.read()).decode("utf-8")
        # Default: return empty string (will trigger fallback)
        return ""

    def _get_mock_result(self, crop_type: str, district: str) -> dict:
        """Return a mock detection result for development/testing.

        WARNING: Mock results are keyed by crop_type from the farmer's profile,
        NOT by actual image content. This is intentional for dev-mode — the mock
        has no vision capability. In production, USE_MOCK_TOOLS must be false.
        """
        import random

        # Mock diseases by crop
        mock_diseases = {
            "Cotton": ["Bollworm", "Leaf Curl Virus", "Bacterial Blight"],
            "Soyabean": ["Yellow Mosaic Virus", "Rust", "Bacterial Pustule"],
            "Maize": ["Fall Armyworm", "Downy Mildew", "Stem Borer"],
            "Wheat": ["Yellow Rust", "Powdery Mildew", "Loose Smut"],
            "Rice": ["Blast", "Bacterial Leaf Blight", "Brown Spot"],
        }

        diseases = mock_diseases.get(crop_type, ["Leaf Spot", "Aphid Infestation"])
        disease = random.choice(diseases)
        confidence = round(random.uniform(0.65, 0.92), 2)

        now = datetime.now(timezone.utc).isoformat()
        return {
            "agent": "disease_detection",
            "status": "success",
            "generated_at": now,
            "timestamp": now,
            "source": "Mock Disease Detection (Development Mode — NOT image-aware)",
            "confidence": confidence,
            "is_estimated": True,
            "is_mock": True,
            "data_status": "Mock Image Analysis (NOT based on uploaded photo)",
            "diagnosis_source": "mock",
            "disease_name": f"[MOCK] {disease}",
            "affected_crop": crop_type,
            "symptoms_observed": [
                f"[MOCK] Characteristic {disease.lower()} symptoms on leaves",
                "[MOCK] Discoloration and lesions visible"
            ],
            "is_healthy": False,
            "needs_human_review": confidence < self.CONFIDENCE_THRESHOLD,
            "recommendations": [
                f"[MOCK] Detected: {disease} on {crop_type} (confidence: {confidence:.0%}).",
                f"[MOCK] Symptoms observed: Characteristic {disease.lower()} symptoms on leaves, Discoloration and lesions visible"
            ],
            "warnings": [
                "This is a SIMULATED result for development/testing. "
                "The diagnosis is NOT based on the uploaded image. "
                "Set USE_MOCK_TOOLS=false with a valid GROQ_API_KEY for real diagnosis."
            ] + (
                [f"Confidence ({confidence:.0%}) below threshold. Please retake photo."]
                if confidence < self.CONFIDENCE_THRESHOLD else []
            ),
        }