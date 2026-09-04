// Use relative URL so requests go through the Next.js proxy rewrite in next.config.ts
// which forwards /api/v1/* -> http://localhost:8000/api/v1/*
const BACKEND_URL = "";

export interface OnboardPayload {
  name: string;
  phone: string;
  district: string;
  language: string;
  password: string;
  confirm_password?: string;
}

export interface OnboardResponse {
  farmer_id: string;
  season_id: string;
  status: string;
  access_token?: string;
  token_type?: string;
}

export interface FarmerLoginResponse {
  access_token: string;
  token_type: string;
  farmer_id: string;
  season_id: string;
  name: string;
  district: string;
  language: string;
}

const FARMER_TOKEN_KEY = "farmer_token";

export function getFarmerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FARMER_TOKEN_KEY);
}

export function setFarmerToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FARMER_TOKEN_KEY, token);
  document.cookie = `farmer_token=${token}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearFarmerToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FARMER_TOKEN_KEY);
  document.cookie = "farmer_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function farmerAuthHeaders(): Record<string, string> {
  const token = getFarmerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function farmerLogin(phone: string, password: string): Promise<FarmerLoginResponse> {
  const res = await fetch(`${BACKEND_URL}/api/v1/farmer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
    credentials: "same-origin",
  });

  if (!res.ok) {
    let message = `Login failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) {
        message = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join(", ")
          : String(data.detail);
      }
    } catch { /* keep default */ }
    throw new ApiError(message, res.status);
  }

  const data = (await res.json()) as FarmerLoginResponse;
  if (data.access_token) {
    setFarmerToken(data.access_token);
  }
  return data;
}

export async function setupFarmerPassword(
  phone: string,
  password: string,
  confirm_password?: string
): Promise<FarmerLoginResponse> {
  const res = await fetch(`${BACKEND_URL}/api/v1/farmer/setup-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password, confirm_password }),
    credentials: "same-origin",
  });

  if (!res.ok) {
    let message = `Password setup failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) {
        message = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join(", ")
          : String(data.detail);
      }
    } catch { /* keep default */ }
    throw new ApiError(message, res.status);
  }

  const data = (await res.json()) as FarmerLoginResponse;
  if (data.access_token) {
    setFarmerToken(data.access_token);
  }
  return data;
}

export class ApiError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function onboardFarmer(
  payload: OnboardPayload
): Promise<OnboardResponse> {
  const res = await fetch(`${BACKEND_URL}/api/v1/onboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  });

  if (!res.ok) {
    let message = `Server error (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) {
        message = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join(", ")
          : String(data.detail);
      }
    } catch {
      // keep default message
    }
    throw new ApiError(message, res.status);
  }

  const data = (await res.json()) as OnboardResponse;
  if (data.access_token) {
    setFarmerToken(data.access_token);
  }
  return data;
}

// ─── Admin API types ─────────────────────────────────────────

export interface FarmerRecord {
  farmer_id: string;
  season_id: string;
  name: string;
  phone: string;
  district: string;
  language: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FarmerListResponse {
  farmers: FarmerRecord[];
  total: number;
}

export interface FarmerUpdate {
  name?: string;
  phone?: string;
  district?: string;
  language?: string;
  status?: string;
}

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
}

export const SUPPORTED_LANGUAGES: Record<string, { label: string; native: string }> = {
  hi: { label: "Hindi", native: "हिंदी" },
  mr: { label: "Marathi", native: "मराठी" },
  ta: { label: "Tamil", native: "தமிழ்" },
  pa: { label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  te: { label: "Telugu", native: "తెలుగు" },
  kn: { label: "Kannada", native: "ಕನ್ನಡ" },
  gu: { label: "Gujarati", native: "ગુજરાતી" },
  bn: { label: "Bengali", native: "বাংলা" },
  en: { label: "English", native: "English" },
};

export function formatLanguageLabel(code: string): string {
  if (!code) return "Unknown";
  const normalized = code.toLowerCase().trim();
  const entry = SUPPORTED_LANGUAGES[normalized];
  if (entry) {
    return `${entry.label} (${entry.native})`;
  }
  return code.toUpperCase();
}

const ADMIN_TOKEN_KEY = "admin_token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function adminLogin(
  username: string,
  password: string
): Promise<AdminLoginResponse> {
  const b64 = btoa(`${username}:${password}`);
  const res = await fetch(`${BACKEND_URL}/api/v1/admin/login`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${b64}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new ApiError(
      res.status === 401 ? "Invalid credentials" : `Login failed (${res.status})`,
      res.status
    );
  }

  return res.json() as Promise<AdminLoginResponse>;
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listFarmers(params?: {
  skip?: number;
  limit?: number;
  district?: string;
  language?: string;
  search?: string;
}): Promise<FarmerListResponse> {
  const q = new URLSearchParams();
  if (params?.skip) q.set("skip", String(params.skip));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.district) q.set("district", params.district);
  if (params?.language) q.set("language", params.language);
  if (params?.search) q.set("search", params.search);

  const res = await fetch(
    `${BACKEND_URL}/api/v1/admin/farmers?${q.toString()}`,
    {
      method: "GET",
      headers: { ...authHeaders() },
      credentials: "same-origin",
    }
  );

  if (!res.ok) {
    throw new ApiError(
      res.status === 403 ? "Admin access required" : `Error ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<FarmerListResponse>;
}

export async function getFarmer(farmerId: string): Promise<FarmerRecord> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/admin/farmers/${farmerId}`,
    {
      method: "GET",
      headers: { ...authHeaders() },
      credentials: "same-origin",
    }
  );

  if (!res.ok) {
    throw new ApiError(
      res.status === 404 ? "Farmer not found" : `Error ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<FarmerRecord>;
}

export async function updateFarmer(
  farmerId: string,
  updates: FarmerUpdate
): Promise<FarmerRecord> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/admin/farmers/${farmerId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(updates),
      credentials: "same-origin",
    }
  );

  if (!res.ok) {
    throw new ApiError(`Error ${res.status}`, res.status);
  }

  return res.json() as Promise<FarmerRecord>;
}

export async function deleteFarmer(farmerId: string): Promise<void> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/admin/farmers/${farmerId}`,
    {
      method: "DELETE",
      headers: { ...authHeaders() },
      credentials: "same-origin",
    }
  );

  if (!res.ok) {
    throw new ApiError(
      res.status === 404 ? "Farmer not found" : `Error ${res.status}`,
      res.status
    );
  }
}

// ─── Farmer Dashboard API ─────────────────────────────────────

export interface FarmerProfile {
  name: string;
  phone: string;
  location: string;
  district: string;
  language: string;
  land_size: number;
  water_source: string;
  past_crops: string[];
  budget: number;
  notes: string;
}

export interface AgentOutputEntry {
  agent: string;
  output: Record<string, unknown>;
  timestamp: string;
}

export interface FarmerContextResponse {
  farmer_id: string;
  season_id: string;
  profile: FarmerProfile;
  phase: string;
  agent_outputs: AgentOutputEntry[];
}

export interface AgentRunResult {
  agent: string;
  status: "success" | "coming_soon" | "error" | "blocked";
  output: Record<string, unknown> | unknown[];
  message: string;
  timestamp: string;
}

export interface PriorityItem {
  title: string;
  reason: string;
  urgency: "low" | "medium" | "high" | "critical";
  recommended_action: string;
  source: string;
  agent?: string;
}

export interface FarmerAlert {
  type: "WEATHER" | "CROP" | "PEST" | "IRRIGATION" | "MARKET" | "FINANCIAL" | "SCHEME" | "HARVEST";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  action: string;
  source: string;
  created_at: string;
}

export interface FarmerInsight {
  summary: string;
  farmer_id: string;
  season_id: string;
  district: string;
  timeline: {
    current_phase: string;
    next_step: string;
    completed_steps: string[];
    all_phases: string[];
  };
  priorities: PriorityItem[];
  alerts: FarmerAlert[];
  weather_actions: Array<{ condition: string; action: string; urgency: string }>;
  market_decision: {
    crop?: string;
    mandi?: string;
    modal_price_inr?: number;
    price_trend?: string;
    recommendation_type?: string;
    reasoning?: string;
    source?: string;
    confidence?: number;
    is_estimated?: boolean;
  };
  crop_decision: {
    recommended_crop?: string;
    varieties?: string[];
    suitability_score?: number;
    expected_duration_days?: number;
    why_crop?: string;
    source?: string;
    confidence?: number;
    is_estimated?: boolean;
    factors?: {
      soil?: string;
      weather?: string;
      market?: string;
    };
  };
  financial_snapshot: {
    estimated_input_cost_inr: number;
    cost_per_acre_inr: number;
    expected_net_margin_inr: number;
    roi_pct: number;
    kcc_credit_available_inr?: number;
    pmfby_eligible?: boolean;
    trust_level?: string;
    is_estimated?: boolean;
  };
  source_agents: string[];
  generated_at: string;
}

export interface OrchestrateResponse {
  status: string;
  farmer_id: string;
  season_id: string;
  insight: FarmerInsight;
  context: FarmerContextResponse;
  timestamp: string;
}

export async function getFarmerContext(
  farmerId: string
): Promise<FarmerContextResponse> {
  const res = await fetch(`${BACKEND_URL}/api/v1/farmers/${farmerId}/context`, {
    method: "GET",
    headers: { ...farmerAuthHeaders() },
    credentials: "same-origin",
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) message = String(data.detail);
    } catch { /* keep default */ }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<FarmerContextResponse>;
}

export async function runAgent(
  farmerId: string,
  seasonId: string,
  agentName: string
): Promise<AgentRunResult> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/farmers/${farmerId}/seasons/${seasonId}/agents/${agentName}/run`,
    {
      method: "POST",
      headers: { ...farmerAuthHeaders() },
      credentials: "same-origin",
    }
  );

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) message = String(data.detail);
    } catch { /* keep default */ }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<AgentRunResult>;
}

export async function orchestrateFarmAnalysis(
  farmerId: string,
  seasonId: string,
  forceRefresh = false
): Promise<OrchestrateResponse> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/farmers/${farmerId}/seasons/${seasonId}/orchestrate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...farmerAuthHeaders() },
      body: JSON.stringify({ force_refresh: forceRefresh }),
      credentials: "same-origin",
    }
  );

  if (!res.ok) {
    let message = `Orchestration error (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) message = String(data.detail);
    } catch { /* keep default */ }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<OrchestrateResponse>;
}

export async function getFarmerInsight(
  farmerId: string
): Promise<{ farmer_id: string; season_id: string; insight: FarmerInsight }> {
  const res = await fetch(`${BACKEND_URL}/api/v1/farmers/${farmerId}/insight`, {
    method: "GET",
    headers: { ...farmerAuthHeaders() },
    credentials: "same-origin",
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) message = String(data.detail);
    } catch { /* keep default */ }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<{ farmer_id: string; season_id: string; insight: FarmerInsight }>;
}

export interface FarmerFeedbackPayload {
  rating: number;
  used_recommendation: boolean;
  actual_yield?: number;
  actual_price?: number;
  actual_cost?: number;
  notes?: string;
}

export async function submitFarmerFeedback(
  farmerId: string,
  seasonId: string,
  payload: FarmerFeedbackPayload
): Promise<{ status: string; message: string }> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/farmers/${farmerId}/seasons/${seasonId}/feedback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...farmerAuthHeaders() },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    }
  );

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) message = String(data.detail);
    } catch { /* keep default */ }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<{ status: string; message: string }>;
}

export interface AgentStatusInfo {
  status: string;
  message: string;
}

export interface AgentRegistryEntry {
  key: string;
  display_name: string;
  description: string;
  implemented: boolean;
  phase: string;
  dependencies: string[];
  icon_category: string;
  aliases?: string[];
}

export async function getAgentStatuses(
  farmerId: string,
  seasonId: string
): Promise<Record<string, AgentStatusInfo>> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/farmers/${farmerId}/seasons/${seasonId}/agents/status`,
    {
      method: "GET",
      headers: { ...farmerAuthHeaders() },
      credentials: "same-origin",
    }
  );

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) message = String(data.detail);
    } catch { /* keep default */ }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<Record<string, AgentStatusInfo>>;
}

export async function getAgentRegistry(): Promise<Record<string, AgentRegistryEntry>> {
  const res = await fetch(`${BACKEND_URL}/api/v1/agents`, {
    method: "GET",
    credentials: "same-origin",
  });

  if (!res.ok) {
    throw new ApiError(`Error ${res.status}`, res.status);
  }

  return res.json() as Promise<Record<string, AgentRegistryEntry>>;
}
