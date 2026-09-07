"""
Disease Research Agent — Produces actionable treatment recommendations
for identified crop diseases/pests.

Takes disease_detection_agent output and generates regionally-appropriate,
step-by-step treatment plans prioritizing organic/low-cost interventions
for smallholder farmers, consistent with Indian agricultural extension guidance.
"""
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone

from .base_agent import BaseAgent

logger = logging.getLogger("krishi_agent.disease_research")


# ─── Agent ──────────────────────────────────────────────────────────────

class DiseaseResearchAgent(BaseAgent):
    """
    Generates treatment recommendations for detected crop diseases.

    Input (from state):
        - disease_detection: output from DiseaseDetectionAgent
        - profile: farmer's district, language, selected_crop

    Output:
        - disease_research: structured treatment recommendations
    """

    # Treatment knowledge base aligned with Indian agricultural extension
    # (ICAR/State Agri Dept / KVK style recommendations)
    TREATMENT_PROTOCOLS = {
        # Cotton
        "Bollworm": {
            "crop": "Cotton",
            "severity": "High - can cause 30-50% yield loss if untreated",
            "organic_first": [
                "Install pheromone traps @ 5/acre for monitoring",
                "Release Trichogramma egg parasitoids @ 1.5 lakh/ha at 15-day intervals",
                "Spray 5% Neem Seed Kernel Extract (NSKE) or 1500 ppm Neem oil",
                "Apply NPV (Nuclear Polyhedrosis Virus) @ 250 LE/ha for larval control"
            ],
            "chemical_if_needed": [
                "If ETL crossed: Emamectin benzoate 5% SG @ 220 g/ha OR",
                "Chlorantraniliprole 18.5% SC @ 150 ml/ha OR",
                "Indoxacarb 14.5% SC @ 353 ml/ha"
            ],
            "prevention": [
                "Deep summer ploughing to expose pupae",
                "Remove and destroy crop residues after harvest",
                "Grow resistant Bt cotton varieties",
                "Avoid late sowing; synchronous planting in village"
            ],
            "expert_help": "Contact KVK if >10% boll damage or larvae >2/plant after two sprays"
        },
        "Leaf Curl Virus": {
            "crop": "Cotton",
            "severity": "High - vector-borne, spreads rapidly via whitefly",
            "organic_first": [
                "Remove and destroy infected plants immediately (roguing)",
                "Yellow sticky traps @ 10/acre for whitefly monitoring",
                "Spray 5% NSKE or Neem oil 1500 ppm weekly",
                "Intercrop with marigold/coriander to repel whitefly"
            ],
            "chemical_if_needed": [
                "Imidacloprid 17.8% SL @ 50 ml/acre (seed treatment)",
                "Thiamethoxam 25% WG @ 40 g/acre (foliar, if whitefly >5/leaf)"
            ],
            "prevention": [
                "Use virus-free certified seeds",
                "Control whitefly vector early season",
                "Remove weed hosts (malva, aconypha) around fields",
                "Crop rotation with non-host crops"
            ],
            "expert_help": "Contact KVK immediately if >5% plants show symptoms in first 30 days"
        },
        "Bacterial Blight": {
            "crop": "Cotton",
            "severity": "Moderate-High - favors humid conditions",
            "organic_first": [
                "Spray Copper oxychloride 50% WP @ 2.5 g/L (organic approved)",
                "Streptomycin sulphate 90% + Tetracycline hydrochloride 10% @ 1 g/L",
                "Remove infected leaves/bolls; avoid field work when wet"
            ],
            "chemical_if_needed": [
                "Copper hydroxide 77% WP @ 2 g/L",
                "Kasugamycin 3% SL @ 1.5 ml/L"
            ],
            "prevention": [
                "Use acid-delinted certified seeds",
                "Avoid overhead irrigation",
                "Crop rotation with cereals",
                "Balanced nutrition; avoid excess nitrogen"
            ],
            "expert_help": "Contact KVK if disease spreads to upper canopy despite treatment"
        },

        # Soyabean
        "Yellow Mosaic Virus": {
            "crop": "Soyabean",
            "severity": "High - transmitted by whitefly, causes severe yield loss",
            "organic_first": [
                "Rogue out infected plants within 30 DAS",
                "Yellow sticky traps @ 10/acre for whitefly",
                "Neem oil 1500 ppm @ 2 ml/L at 10-day intervals"
            ],
            "chemical_if_needed": [
                "Thiamethoxam 25% WG @ 40 g/acre (whitefly vector control)",
                "Imidacloprid 17.8% SL @ 50 ml/acre"
            ],
            "prevention": [
                "Use resistant varieties (JS 97-52, JS 20-34, NRC 37)",
                "Early sowing to avoid peak whitefly",
                "Weed management (remove alternate hosts)",
                "Seed treatment with Imidacloprid"
            ],
            "expert_help": "Contact KVK if >10% plants infected before flowering"
        },
        "Rust": {
            "crop": "Soyabean",
            "severity": "Moderate - late season, manageable with timely action",
            "organic_first": [
                "Spray 5% NSKE at first appearance",
                "Remove severely infected lower leaves"
            ],
            "chemical_if_needed": [
                "Hexaconazole 5% EC @ 1 ml/L",
                "Propiconazole 25% EC @ 1 ml/L",
                "Tebuconazole 25.9% EC @ 0.75 ml/L"
            ],
            "prevention": [
                "Use rust-resistant varieties",
                "Avoid dense planting; ensure air circulation",
                "Crop rotation with non-legumes"
            ],
            "expert_help": "Contact KVK if rust appears before pod filling stage"
        },
        "Bacterial Pustule": {
            "crop": "Soyabean",
            "severity": "Low-Moderate - seed-borne, favors wet weather",
            "organic_first": [
                "Copper oxychloride 50% WP @ 2.5 g/L",
                "Avoid field operations when foliage wet"
            ],
            "chemical_if_needed": [
                "Streptocycline @ 1 g/L + Copper oxychloride @ 2.5 g/L"
            ],
            "prevention": [
                "Use certified disease-free seed",
                "Hot water seed treatment (52°C, 30 min)",
                "Crop rotation with cereals"
            ],
            "expert_help": "Usually manageable; contact KVK if widespread in seed crop"
        },

        # Maize
        "Fall Armyworm": {
            "crop": "Maize",
            "severity": "Very High - invasive, rapid spread, high yield loss",
            "organic_first": [
                "Pheromone traps @ 5/acre for monitoring",
                "Handpick egg masses and early instar larvae",
                "Spray 5% NSKE or Neem oil 1500 ppm @ 2 ml/L",
                "Apply Metarhizium anisopliae @ 5 g/L (entomopathogenic fungus)",
                "Whorl application of sand + lime (1:1) or neem cake"
            ],
            "chemical_if_needed": [
                "Spinetoram 11.7% SC @ 300 ml/ha",
                "Chlorantraniliprole 18.5% SC @ 150 ml/ha",
                "Emamectin benzoate 5% SG @ 220 g/ha"
            ],
            "prevention": [
                "Early planting to avoid peak moth flight",
                "Intercrop with legumes (cowpea, soybean)",
                "Maintain field sanitation; destroy crop residues",
                "Use FAW-tolerant hybrids when available"
            ],
            "expert_help": "Contact KVK immediately if >20% plants damaged or larvae in whorl >2/plant"
        },
        "Downy Mildew": {
            "crop": "Maize",
            "severity": "Moderate-High - systemic, favors cool humid weather",
            "organic_first": [
                "Remove and destroy systemically infected plants (stunted, chlorotic)",
                "Spray Mancozeb 75% WP @ 2.5 g/L (protectant)"
            ],
            "chemical_if_needed": [
                "Metalaxyl 8% + Mancozeb 64% WP @ 2.5 g/L",
                "Azoxystrobin 23% SC @ 1 ml/L"
            ],
            "prevention": [
                "Use resistant hybrids",
                "Seed treatment with Metalaxyl @ 6 g/kg",
                "Avoid waterlogging; improve drainage",
                "Early sowing to escape favorable conditions"
            ],
            "expert_help": "Contact KVK if >15% plants show systemic infection"
        },
        "Stem Borer": {
            "crop": "Maize",
            "severity": "Moderate - dead hearts, reduces plant stand",
            "organic_first": [
                "Remove dead hearts; destroy larvae inside",
                "Trichogramma chilonis @ 50,000/ha at weekly intervals (3-4 releases)",
                "Neem cake @ 250 kg/ha at sowing"
            ],
            "chemical_if_needed": [
                "Carbofuran 3% CG @ 33 kg/ha in whorl (30 DAS)",
                "Fipronil 0.3% GR @ 25 kg/ha"
            ],
            "prevention": [
                "Early planting",
                "Destroy stubble after harvest",
                "Crop rotation with non-graminaceous crops"
            ],
            "expert_help": "Contact KVK if dead hearts >10% despite treatment"
        },

        # Wheat
        "Yellow Rust": {
            "crop": "Wheat",
            "severity": "High - stripe rust, favors cool temps, rapid spread",
            "organic_first": [
                "Spray Propiconazole 25% EC @ 1 ml/L at first sign",
                "Remove susceptible volunteer plants"
            ],
            "chemical_if_needed": [
                "Tebuconazole 25.9% EC @ 750 ml/ha",
                "Propiconazole 25% EC @ 500 ml/ha",
                "Triadimefon 25% WP @ 500 g/ha"
            ],
            "prevention": [
                "Use resistant varieties (DBW 187, HD 3086, WH 1105)",
                "Timely sowing (mid-November)",
                "Balanced fertilizers; avoid excess N",
                "Seed treatment with fungicide"
            ],
            "expert_help": "Contact KVK immediately if rust appears before flag leaf stage"
        },
        "Powdery Mildew": {
            "crop": "Wheat",
            "severity": "Moderate - white powdery coating, late season",
            "organic_first": [
                "Spray 5% NSKE or Neem oil",
                "Sulfur 80% WP @ 2.5 g/L (organic approved)"
            ],
            "chemical_if_needed": [
                "Triadimefon 25% WP @ 500 g/ha",
                "Propiconazole 25% EC @ 500 ml/ha"
            ],
            "prevention": [
                "Use resistant varieties",
                "Avoid late sowing",
                "Proper spacing for air circulation"
            ],
            "expert_help": "Contact KVK if disease reaches flag leaf before grain filling"
        },

        # Rice
        "Blast": {
            "crop": "Rice",
            "severity": "High - leaf, neck, and panicle blast; major yield reducer",
            "organic_first": [
                "Spray Pseudomonas fluorescens @ 10 g/L (seed treatment + foliar)",
                "Neem oil 1500 ppm @ 2 ml/L",
                "Balanced nutrition; split N application"
            ],
            "chemical_if_needed": [
                "Tricyclazole 75% WP @ 0.6 g/L",
                "Isoprothiolane 40% EC @ 1.5 ml/L",
                "Azoxystrobin 23% SC @ 1 ml/L"
            ],
            "prevention": [
                "Use resistant varieties (Swarna Sub1, CR Dhan 205, etc.)",
                "Seed treatment with Carbendazim @ 2 g/kg",
                "Avoid excessive N; use split application",
                "Maintain 5 cm standing water"
            ],
            "expert_help": "Contact KVK if neck blast appears or >10% leaf area affected"
        },
        "False Smut": {
            "crop": "Rice",
            "severity": "Moderate-High - transforms individual grains into greenish/yellowish/black powdery spore balls; reduces grain yield and grain quality",
            "organic_first": [
                "Hand-pick and carefully destroy infected smut balls inside plastic bags to prevent spore dispersal",
                "Spray Trichoderma viride or Pseudomonas fluorescens @ 10 g/L at booting stage",
                "Avoid excessive nitrogenous fertilizer application at panicle emergence"
            ],
            "chemical_if_needed": [
                "Propiconazole 25% EC @ 1.0 ml/L at 50% panicle emergence",
                "Trifloxystrobin 25% + Tebuconazole 50% WG @ 0.4 g/L at boot leaf stage",
                "Copper oxychloride 50% WP @ 2.5 g/L"
            ],
            "prevention": [
                "Seed treatment with Carbendazim 50% WP @ 2 g/kg of seed",
                "Adopt wider spacing and proper drainage during flowering",
                "Use clean certified disease-free seeds",
                "Apply recommended Potash (MOP) to enhance panicle resistance"
            ],
            "expert_help": "Contact local KVK or Agricultural Extension Officer if false smut balls appear on more than 5% of panicles"
        },
        "Bacterial Leaf Blight": {
            "crop": "Rice",
            "severity": "High - vascular disease, causes wilting/yield loss",
            "organic_first": [
                "Copper oxychloride 50% WP @ 2.5 g/L",
                "Drain field; avoid waterlogging"
            ],
            "chemical_if_needed": [
                "Streptocycline @ 1 g/L + Copper oxychloride @ 2.5 g/L",
                "Kasugamycin 3% SL @ 1.5 ml/L"
            ],
            "prevention": [
                "Use resistant varieties (Improved Samba Mahsuri, etc.)",
                "Seed treatment with Streptocycline",
                "Balanced fertilizers; avoid excess N",
                "Summer ploughing; destroy weed hosts"
            ],
            "expert_help": "Contact KVK if >20% leaves affected or kresek phase (wilting) observed"
        },
        "Brown Spot": {
            "crop": "Rice",
            "severity": "Moderate - seed-borne, favors nutrient deficiency",
            "organic_first": [
                "Correct soil nutrient imbalance (especially K, Si)",
                "Seed treatment with hot water (52°C, 10 min) or Pseudomonas"
            ],
            "chemical_if_needed": [
                "Mancozeb 75% WP @ 2.5 g/L",
                "Propiconazole 25% EC @ 1 ml/L"
            ],
            "prevention": [
                "Use certified disease-free seed",
                "Balanced nutrition; apply Silicon fertilizers",
                "Proper water management"
            ],
            "expert_help": "Usually manageable with nutrition; contact KVK if severe in nursery"
        },

        # Generic fallbacks
        "Leaf Spot": {
            "crop": "General",
            "severity": "Variable - fungal/bacterial leaf spots",
            "organic_first": [
                "Remove severely infected leaves",
                "Spray Copper oxychloride 50% WP @ 2.5 g/L",
                "Neem oil 1500 ppm @ 2 ml/L",
                "Improve air circulation; avoid overhead irrigation"
            ],
            "chemical_if_needed": [
                "Mancozeb 75% WP @ 2.5 g/L",
                "Propiconazole 25% EC @ 1 ml/L"
            ],
            "prevention": [
                "Crop rotation",
                "Certified disease-free seed",
                "Balanced nutrition",
                "Field sanitation"
            ],
            "expert_help": "Contact KVK for specific identification if spreading rapidly"
        },
        "Aphid Infestation": {
            "crop": "General",
            "severity": "Low-Moderate - vector for viruses, honeydew/sooty mold",
            "organic_first": [
                "Yellow sticky traps",
                "Spray 5% NSKE or Neem oil 1500 ppm",
                "Encourage ladybird beetles (natural predators)",
                "Strong water jet to dislodge colonies"
            ],
            "chemical_if_needed": [
                "Imidacloprid 17.8% SL @ 50 ml/acre",
                "Thiamethoxam 25% WG @ 40 g/acre",
                "Flonicamid 50% WG @ 150 g/ha"
            ],
            "prevention": [
                "Remove weed hosts",
                "Avoid excess nitrogen",
                "Intercrop with trap crops (mustard)"
            ],
            "expert_help": "Contact KVK if virus symptoms appear (mosaic, stunting)"
        },
    }

    SYSTEM_PROMPT = (
        "You are an expert Agricultural Extension Officer specializing in Indian crop protection. "
        "Generate practical, step-by-step treatment recommendations for the given disease and crop. "
        "Prioritize organic, biological, and low-cost interventions suitable for smallholder farmers. "
        "Only recommend chemical pesticides as a last resort, with clear dosage and safety cautions. "
        "Reference Indian agricultural extension sources (ICAR, KVK, State Agri Dept) where possible. "
        "Output must be in the farmer's language when possible."
    )

    def run(self, state: dict) -> dict:
        profile = state.get("profile", {})
        disease_detection = state.get("disease_detection", {})
        selected_crop = state.get("selected_crop", "")
        crop_shortlist = state.get("crop_shortlist", [])
        now = datetime.now(timezone.utc).isoformat()

        district = profile.get("district") or profile.get("location") or "India"
        language = profile.get("language", "en")

        # Get disease info from detection result
        if isinstance(disease_detection, dict):
            disease_name = disease_detection.get("disease_name", "Unknown")
            affected_crop = disease_detection.get("affected_crop", selected_crop)
            is_healthy = disease_detection.get("is_healthy", False)
            needs_human_review = disease_detection.get("needs_human_review", True)
        else:
            disease_name = "Unknown"
            affected_crop = selected_crop or "Unknown"
            is_healthy = False
            needs_human_review = True

        logger.info(
            f"[DISEASE_RESEARCH] farmer_id={state.get('farmer_id')} "
            f"disease={disease_name} crop={affected_crop} healthy={is_healthy}"
        )

        # If healthy or needs review, return appropriate response
        if is_healthy:
            result = self._build_healthy_response(affected_crop, district, language, now)
            return {"disease_research": result}

        if needs_human_review:
            result = self._build_unclear_response(affected_crop, district, language, now)
            return {"disease_research": result}

        # Look up treatment protocol
        protocol = self.TREATMENT_PROTOCOLS.get(disease_name)
        if not protocol:
            # Try partial match
            for key in self.TREATMENT_PROTOCOLS:
                if key.lower() in disease_name.lower() or disease_name.lower() in key.lower():
                    protocol = self.TREATMENT_PROTOCOLS[key]
                    break

        if not protocol:
            # Generic fallback
            protocol = self._get_generic_protocol(disease_name, affected_crop)

        # Build recommendations in priority order
        recommended_actions = []
        recommended_actions.extend(protocol.get("organic_first", []))

        # Add chemical options with strong cautions
        chemical_options = protocol.get("chemical_if_needed", [])
        if chemical_options:
            recommended_actions.append(
                "⚠️ CHEMICAL OPTION (only if organic methods fail & ETL crossed): "
                "Consult agriculture officer for correct dosage & safety. "
                "Follow label strictly. Wear PPE. Observe pre-harvest interval."
            )
            recommended_actions.extend(chemical_options)

        prevention_tips = protocol.get("prevention", [])
        when_to_seek_expert = protocol.get("expert_help", "Contact your local KVK or agriculture officer for field diagnosis.")

        # Build response
        result = {
            "agent": "disease_research",
            "status": "success",
            "generated_at": now,
            "timestamp": now,
            "source": "Indian Agricultural Extension Protocols (ICAR/KVK/State Agri Dept aligned)",
            "confidence": 0.88,
            "is_estimated": False,
            "data_status": "Treatment Protocol Generated",
            "disease_name": disease_name,
            "severity_note": protocol.get("severity", "Assess field severity before treatment."),
            "recommended_actions": recommended_actions,
            "prevention_tips": prevention_tips,
            "when_to_seek_expert_help": when_to_seek_expert,
            "sources": [
                "ICAR-NCIPM Integrated Pest Management Guidelines",
                "State Agricultural Department Advisory Bulletins",
                "KVK District-Level Crop Protection Recommendations",
                "Package of Practices for major crops (ICAR)"
            ],
            "recommendations": recommended_actions[:3],  # Top 3 for quick view
            "warnings": [
                "⚠️ Chemical pesticides: Use only as last resort. Consult agriculture officer for dosage.",
                "⚠️ Always wear protective equipment (gloves, mask, goggles) when spraying.",
                "⚠️ Observe pre-harvest interval (PHI) strictly to avoid residue in produce.",
                "⚠️ Do not mix chemicals unless label permits. Rotate modes of action to prevent resistance."
            ],
        }

        return {"disease_research": result}

    def _build_healthy_response(
        self, crop: str, district: str, language: str, now: str
    ) -> dict:
        """Response when plant is healthy."""
        msg_dict = {
            "en": f"Good news! Your {crop} plant appears healthy with no visible disease symptoms.",
            "hi": f"अच्छी खबर! आपका {crop} पौधा स्वस्थ दिखता है, कोई रोग के लक्षण नहीं हैं।",
            "mr": f"चांगली बातमी! तुमचे {crop} रोप स्वस्थ दिसते, कोणतेही रोगाचे लक्षण नाहीत।",
            "ta": f"நல்ல செய்தி! உங்கள் {crop} செடி ஆரோக்கியமாக இருக்கின்றது, நோய் அறிகுறிகள் இல்லை।",
        }
        msg = msg_dict.get(language, msg_dict["en"])

        return {
            "agent": "disease_research",
            "status": "success",
            "generated_at": now,
            "timestamp": now,
            "source": "Disease Research Agent",
            "confidence": 1.0,
            "is_estimated": False,
            "data_status": "Healthy Plant Confirmed",
            "disease_name": "Healthy",
            "severity_note": "No disease detected.",
            "recommended_actions": [
                msg,
                "Continue regular field monitoring and good agricultural practices.",
                "Maintain balanced nutrition and proper irrigation scheduling."
            ],
            "prevention_tips": [
                "Regular field scouting (weekly)",
                "Balanced fertilization - avoid excess nitrogen",
                "Proper water management - avoid waterlogging",
                "Crop rotation and field sanitation",
                "Use certified disease-free seeds"
            ],
            "when_to_seek_expert_help": "If you notice any unusual symptoms in the future, upload a photo for diagnosis.",
            "sources": ["General Good Agricultural Practices"],
            "recommendations": [
                msg,
                "Continue regular monitoring and good practices."
            ],
            "warnings": []
        }

    def _build_unclear_response(
        self, crop: str, district: str, language: str, now: str
    ) -> dict:
        """Response when image was unclear."""
        msg_dict = {
            "en": "The uploaded photo was unclear for diagnosis. Please retake with better lighting.",
            "hi": "अपलोड की गई तस्वीर निदान के लिए स्पष्ट नहीं है। कृपया बेहतर रोशनी के साथ दोबारा खींचें।",
            "mr": "अपलोड केलेले फोटो निदानासाठी स्पष्ट नाही. कृपया चांगली दिव्याने पुन्हा घ्या.",
            "ta": "அப்லோட் செய்யப்பட்ட புகைப்படம் நோய் கண்டறிதலுக்கு தெளிவு இல்லை. தயவுசெய்து நல்ல வெளிச்சத்தில் மீண்டும் எடுக்கவும்.",
        }
        msg = msg_dict.get(language, msg_dict["en"])

        return {
            "agent": "disease_research",
            "status": "success",
            "generated_at": now,
            "timestamp": now,
            "source": "Disease Research Agent",
            "confidence": 0.0,
            "is_estimated": False,
            "data_status": "Image Unclear - Cannot Diagnose",
            "disease_name": "Unclear Image",
            "severity_note": "Cannot determine disease from provided image.",
            "recommended_actions": [
                msg,
                "Retake photo: good lighting, focus on affected leaf, avoid shadows/blur.",
                "Capture both upper and lower leaf surfaces.",
                "Include a reference object (coin/hand) for scale."
            ],
            "prevention_tips": [],
            "when_to_seek_expert_help": "If symptoms worsen before you can retake photo, visit your local KVK or agriculture officer.",
            "sources": None,
            "recommendations": [
                msg,
                "Please upload a clearer photo for accurate diagnosis."
            ],
            "warnings": ["No treatment recommended without confirmed diagnosis."]
        }

    def _get_generic_protocol(self, disease_name: str, crop: str) -> dict:
        """Generic protocol for unknown diseases."""
        return {
            "crop": crop,
            "severity": "Unknown - requires field diagnosis",
            "organic_first": [
                "Remove visibly affected plant parts",
                "Spray 5% Neem Seed Kernel Extract (NSKE) weekly",
                "Improve field drainage and air circulation",
                "Apply Trichoderma viride @ 5 g/L as foliar spray"
            ],
            "chemical_if_needed": [
                "Broad-spectrum fungicide: Mancozeb 75% WP @ 2.5 g/L",
                "Broad-spectrum insecticide: Neem oil 1500 ppm @ 2 ml/L"
            ],
            "prevention": [
                "Crop rotation with non-host crops",
                "Use certified disease-free seeds",
                "Balanced nutrition; avoid excess nitrogen",
                "Field sanitation - remove crop residues",
                "Proper spacing for air circulation"
            ],
            "expert_help": "Contact your local KVK or agriculture officer for specific diagnosis and treatment."
        }