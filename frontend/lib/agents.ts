// Centralized agent registry — mirrors backend/app/agents/registry.py
// This is the single source of truth for agent metadata on the frontend.
// The backend exposes the same data at GET /api/v1/agents for runtime
// verification, but this static config drives the UI structure.

export type AgentPhase =
  | "diagnostics"
  | "recommendation"
  | "planning"
  | "monitoring"
  | "harvest_decision"
  | "market_linkage"
  | "feedback";

export type AgentStatus = "idle" | "running" | "success" | "error" | "coming_soon" | "blocked";

export interface AgentRegistryEntry {
  key: string;
  display_name: string;
  description: string;
  implemented: boolean;
  phase: AgentPhase;
  dependencies: string[];
  icon_category: string;
  aliases?: string[];
}

export const AGENT_REGISTRY: AgentRegistryEntry[] = [
  {
    key: "soil",
    display_name: "Soil Analysis",
    description: "Analyses Soil Health Card data — pH, NPK status, micronutrient deficiencies, and corrective measures.",
    implemented: true,
    phase: "diagnostics",
    dependencies: [],
    icon_category: "soil",
  },
  {
    key: "weather",
    display_name: "Weather",
    description: "7-day weather forecast and seasonal monsoon outlook for your location.",
    implemented: true,
    phase: "diagnostics",
    dependencies: [],
    icon_category: "weather",
  },
  {
    key: "market_intelligence",
    display_name: "Market Intelligence",
    description: "Agmarknet mandi prices, demand-supply trends, and best market timing for your district.",
    implemented: true,
    phase: "diagnostics",
    dependencies: [],
    icon_category: "market",
  },
  {
    key: "crop_recommendation",
    display_name: "Crop Recommendation",
    description: "Ranked crop shortlist based on your soil report, weather outlook, and market signals.",
    implemented: true,
    phase: "recommendation",
    dependencies: ["soil", "weather"],
    icon_category: "crop",
  },
  {
    key: "irrigation",
    display_name: "Irrigation Planning",
    description: "Water scheduling and irrigation optimization based on soil moisture and forecast.",
    implemented: true,
    phase: "recommendation",
    dependencies: ["soil", "weather", "crop_recommendation"],
    icon_category: "irrigation",
  },
  {
    key: "budget_estimator",
    display_name: "Budget Estimator",
    description: "Totals input costs and expected returns for the recommended crop plan.",
    implemented: true,
    phase: "planning",
    dependencies: ["irrigation", "crop_recommendation"],
    icon_category: "budget",
  },
  {
    key: "input_verification",
    display_name: "Input Verification",
    description: "Verified seed and fertilizer dealer contacts to avoid counterfeit inputs.",
    implemented: true,
    phase: "planning",
    dependencies: ["budget_estimator"],
    icon_category: "verification",
  },
  {
    key: "scheme_insurance",
    display_name: "Insurance & Schemes",
    description: "PMFBY crop insurance eligibility, government scheme matching, and subsidy alerts.",
    implemented: true,
    phase: "planning",
    dependencies: ["input_verification", "crop_recommendation"],
    icon_category: "insurance",
    aliases: ["insurance"],
  },
  {
    key: "credit",
    display_name: "Credit",
    description: "Kisan Credit Card and rural bank loan options suited to your crop and land.",
    implemented: true,
    phase: "planning",
    dependencies: ["budget_estimator", "scheme_insurance"],
    icon_category: "credit",
  },
  {
    key: "crop_monitoring",
    display_name: "Crop Monitoring",
    description: "Satellite NDVI crop health monitoring, pest alerts, and disease risk flags.",
    implemented: true,
    phase: "monitoring",
    dependencies: ["crop_recommendation"],
    icon_category: "monitoring",
    aliases: ["monitoring"],
  },
  {
    key: "advisory",
    display_name: "Advisory",
    description: "Personalised agronomic nudges for irrigation, pest management, and labour timing.",
    implemented: true,
    phase: "monitoring",
    dependencies: ["crop_monitoring", "weather"],
    icon_category: "advisory",
  },
  {
    key: "storage_sell_timing",
    display_name: "Harvest & Sell Timing",
    description: "Post-harvest storage recommendations and optimal sell-timing window analysis.",
    implemented: true,
    phase: "harvest_decision",
    dependencies: ["crop_monitoring", "market_intelligence"],
    icon_category: "harvest",
    aliases: ["storage"],
  },
  {
    key: "market_linkage",
    display_name: "Market Linkage",
    description: "e-NAM and FPO connections, direct buyer linkage, and transport cost estimation.",
    implemented: true,
    phase: "market_linkage",
    dependencies: ["storage_sell_timing", "crop_recommendation"],
    icon_category: "market",
  },
  {
    key: "feedback",
    display_name: "Feedback",
    description: "Capture season learnings to continuously improve next season's recommendations.",
    implemented: true,
    phase: "feedback",
    dependencies: ["market_linkage"],
    icon_category: "feedback",
  },
];

export const getAgentByKey = (key: string): AgentRegistryEntry | undefined => {
  // Check canonical keys and aliases
  return AGENT_REGISTRY.find(
    (a) => a.key === key || (a.aliases && a.aliases.includes(key))
  );
};

export const getImplementedAgents = (): AgentRegistryEntry[] =>
  AGENT_REGISTRY.filter((a) => a.implemented);

// Phase display names for the dashboard section headers
export const PHASE_LABELS: Record<string, string> = {
  diagnostics: "Diagnosis",
  recommendation: "Recommendations",
  planning: "Planning",
  monitoring: "Monitoring",
  harvest_decision: "Harvest Decision",
  market_linkage: "Market Linkage",
  feedback: "Feedback",
};
