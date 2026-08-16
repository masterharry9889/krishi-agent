"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getFarmerToken,
  clearFarmerToken,
  getFarmerContext,
  getFarmerInsight,
  orchestrateFarmAnalysis,
  submitFarmerFeedback,
  FarmerContextResponse,
  FarmerInsight,
  FarmerFeedbackPayload,
  ApiError,
} from "@/lib/api";
import { AGENT_REGISTRY } from "@/lib/agents";

interface AgentState {
  status: "idle" | "running" | "success" | "error" | "blocked";
  result: unknown | null;
  error: string | null;
}

export default function FarmerDashboardPage() {
  const router = useRouter();

  const [context, setContext] = useState<FarmerContextResponse | null>(null);
  const [insight, setInsight] = useState<FarmerInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Orchestrating state
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestrationStep, setOrchestrationStep] = useState("Checking soil & weather...");

  // Collapsible states
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Agent states for technical drawer
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});

  // Feedback form state
  const [feedback, setFeedback] = useState<FarmerFeedbackPayload>({
    rating: 5,
    used_recommendation: true,
    actual_yield: undefined,
    actual_price: undefined,
    notes: "",
  });
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSuccess, setFbSuccess] = useState<string | null>(null);

  // 1. Initial Load: Auth check and fetch context
  useEffect(() => {
    const activeToken = getFarmerToken();
    if (!activeToken) {
      router.push("/farmer/login");
      return;
    }

    let ignore = false;

    async function loadDashboard() {
      setError(null);
      try {
        if (!activeToken) return;
        // Decode payload from token to get farmer_id
        const payloadBase64 = activeToken.split(".")[1];
        const decoded = JSON.parse(atob(payloadBase64));
        const farmerId = decoded.farmer_id || decoded.sub;

        if (!farmerId) {
          clearFarmerToken();
          router.push("/farmer/login");
          return;
        }

        const [ctx, insData] = await Promise.all([
          getFarmerContext(farmerId),
          getFarmerInsight(farmerId).catch(() => null),
        ]);

        if (!ignore) {
          setContext(ctx);
          if (insData?.insight) setInsight(insData.insight);

          // Populate agent states
          const nextStates: Record<string, AgentState> = {};
          for (const a of AGENT_REGISTRY) {
            nextStates[a.key] = { status: "idle", result: null, error: null };
          }
          if (ctx.agent_outputs && Array.isArray(ctx.agent_outputs)) {
            for (const entry of ctx.agent_outputs) {
              const key = entry.agent;
              if (nextStates[key]) {
                nextStates[key] = {
                  status: "success",
                  result: { agent: key, status: "success", output: entry.output, timestamp: entry.timestamp },
                  error: null,
                };
              }
            }
          }
          setAgentStates(nextStates);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            clearFarmerToken();
            router.push("/farmer/login");
            return;
          }
          let message = "Failed to load dashboard. Please try again.";
          if (err instanceof ApiError) message = err.message;
          else if (err instanceof Error) message = err.message;
          setError(message);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      ignore = true;
    };
  }, [router]);

  const handleLogout = () => {
    clearFarmerToken();
    router.push("/farmer/login");
  };

  const handleAnalyzeMyFarm = async () => {
    if (!context) return;
    setOrchestrating(true);
    setError(null);
    setOrchestrationStep("Checking soil nutrients & micro-climate...");

    try {
      const steps = [
        "Checking weather forecasts...",
        "Checking market prices in APMC mandis...",
        "Finding suitable crop recommendations...",
        "Calculating irrigation & financial estimates...",
        "Finalizing your farm decision summary...",
      ];

      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < steps.length) {
          setOrchestrationStep(steps[stepIdx]);
          stepIdx++;
        }
      }, 1000);

      const res = await orchestrateFarmAnalysis(context.farmer_id, context.season_id, true);
      clearInterval(interval);

      setInsight(res.insight);
      setContext(res.context);

      // Refresh agent statuses
      if (res.context?.agent_outputs) {
        const nextStates: Record<string, AgentState> = {};
        for (const a of AGENT_REGISTRY) {
          nextStates[a.key] = { status: "idle", result: null, error: null };
        }
        for (const entry of res.context.agent_outputs) {
          const key = entry.agent;
          if (nextStates[key]) {
            nextStates[key] = {
              status: "success",
              result: { agent: key, status: "success", output: entry.output, timestamp: entry.timestamp },
              error: null,
            };
          }
        }
        setAgentStates(nextStates);
      }
    } catch (err: unknown) {
      let message = "Farm analysis failed. Please try again.";
      if (err instanceof ApiError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setOrchestrating(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setFbSubmitting(true);
    setFbSuccess(null);
    try {
      const res = await submitFarmerFeedback(context.farmer_id, context.season_id, feedback);
      setFbSuccess(res.message || "Thank you! Your feedback has been recorded.");
    } catch (err: unknown) {
      let message = "Feedback submission failed.";
      if (err instanceof ApiError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setFbSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--green-900)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🌾</div>
          <div>Loading your farm decision dashboard...</div>
        </div>
      </div>
    );
  }

  if (error && !context) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--green-900)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif", padding: "1.5rem" }}>
        <div style={{ maxWidth: "450px", textAlign: "center", background: "rgba(255,255,255,0.05)", padding: "2rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
          <h2 style={{ fontSize: "1.25rem", margin: "0 0 1rem" }}>Dashboard Error</h2>
          <p style={{ color: "#ffa0a0", fontSize: "0.9rem", marginBottom: "1.5rem" }}>{error}</p>
          <button onClick={() => router.push("/farmer/login")} style={{ background: "var(--gold-500)", color: "var(--green-900)", border: "none", borderRadius: "6px", padding: "0.6rem 1.25rem", fontWeight: 700, cursor: "pointer" }}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const profile = context?.profile;
  const cropDec = insight?.crop_decision;
  const marketDec = insight?.market_decision;
  const finSnap = insight?.financial_snapshot;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(170deg, var(--green-900) 0%, var(--soil-900) 100%)", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif" }}>
      {/* Top Header */}
      <header style={{ background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "1rem 1.5rem", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🌾</span>
            <div>
              <h1 style={{ fontSize: "1.125rem", margin: 0, fontWeight: 700, color: "#fff" }}>
                Welcome, {profile?.name || "Farmer"}
              </h1>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)" }}>
                {profile?.district} District • Land: {profile?.land_size} Acres • Language: {profile?.language?.toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.4rem 0.85rem", fontSize: "0.8rem", color: "var(--gold-300)" }}>
              Current Season: <strong>Kharif 2026</strong>
            </div>

            <button
              onClick={handleLogout}
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                padding: "0.4rem 0.85rem",
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "rgba(255,255,255,0.1)")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "transparent")}
            >
              Logout 🚪
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {error && (
          <div style={{ background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.4)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.5rem", color: "#ffa0a0", fontSize: "0.875rem" }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── 1. Smart Orchestrator CTA Banner ── */}
        <section style={{ background: "linear-gradient(135deg, rgba(200,137,58,0.15) 0%, rgba(107,174,133,0.15) 100%)", border: "1px solid var(--gold-500)", borderRadius: "14px", padding: "1.75rem", marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--gold-300)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "0.3rem" }}>
              AI Farm Decision Intelligence
            </div>
            <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem", fontWeight: 700, color: "#fff" }}>
              Get Instant Farm & Crop Recommendations
            </h2>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", maxWidth: "55ch" }}>
              Run full multi-agent diagnostic analysis across soil nutrients, weather forecasts, APMC mandi prices, and crop suitability.
            </p>
          </div>

          <button
            onClick={handleAnalyzeMyFarm}
            disabled={orchestrating}
            style={{
              background: orchestrating ? "var(--gold-700)" : "var(--gold-500)",
              color: "var(--green-900)",
              border: "none",
              borderRadius: "8px",
              padding: "0.85rem 1.75rem",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: orchestrating ? "wait" : "pointer",
              boxShadow: "0 4px 14px rgba(200,137,58,0.3)",
              transition: "transform 0.15s, background 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {orchestrating ? (
              <>
                <span className="spinner">⏳</span> {orchestrationStep}
              </>
            ) : (
              <>🌾 Analyze My Farm</>
            )}
          </button>
        </section>

        {/* ── 2. Today's Priorities & Actionable Nudges ── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📋</span> Today&apos;s Priorities & Actionable Nudges
          </h2>

          {insight?.priorities && insight.priorities.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
              {insight.priorities.map((item, idx) => (
                <div key={idx} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", padding: "0.25rem 0.5rem", borderRadius: "4px", background: item.urgency === "critical" ? "rgba(220,53,69,0.2)" : item.urgency === "high" ? "rgba(255,193,7,0.2)" : "rgba(107,174,133,0.2)", color: item.urgency === "critical" ? "#ff8080" : item.urgency === "high" ? "#ffd54f" : "var(--green-300)" }}>
                        {item.urgency} Urgency
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{item.source}</span>
                    </div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.4rem", color: "#fff" }}>{item.title}</h3>
                    <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", margin: "0 0 0.75rem", lineHeight: 1.5 }}>{item.reason}</p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "0.6rem 0.75rem", fontSize: "0.825rem", color: "var(--gold-300)", fontWeight: 600 }}>
                    👉 Action: {item.recommended_action}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5rem", borderRadius: "10px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
              Click &quot;Analyze My Farm&quot; above to generate your priority action plan.
            </div>
          )}
        </section>

        {/* ── 3. Recommended Crop Decision Card ── */}
        {cropDec?.recommended_crop && (
          <section style={{ marginBottom: "2.5rem" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--green-300)", borderRadius: "12px", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--green-300)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                    ⭐ Recommended Crop Choice
                  </span>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.2rem 0 0", color: "#fff" }}>
                    {cropDec.recommended_crop} {cropDec.varieties && cropDec.varieties.length > 0 && `(Varieties: ${cropDec.varieties.join(", ")})`}
                  </h3>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--gold-300)" }}>
                    {Math.round((cropDec.suitability_score || 0.85) * 100)}% Match
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                    Est. Duration: {cropDec.expected_duration_days || 120} days
                  </div>
                </div>
              </div>

              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.6, margin: "0 0 1rem" }}>
                {cropDec.why_crop}
              </p>

              {/* Collapsible Factor Breakdown */}
              <button
                onClick={() => setWhyExpanded(!whyExpanded)}
                style={{ background: "transparent", color: "var(--gold-300)", border: "none", padding: 0, fontSize: "0.825rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                {whyExpanded ? "▲ Hide underlying factors" : "▼ Why this recommendation?"}
              </button>

              {whyExpanded && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Soil Fit</div>
                    <div style={{ fontSize: "0.825rem", color: "#fff", marginTop: "0.2rem" }}>{cropDec.factors?.soil}</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Weather Fit</div>
                    <div style={{ fontSize: "0.825rem", color: "#fff", marginTop: "0.2rem" }}>{cropDec.factors?.weather}</div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Market Opportunity</div>
                    <div style={{ fontSize: "0.825rem", color: "#fff", marginTop: "0.2rem" }}>{cropDec.factors?.market}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── 4. Market & Selling Decision + Financial Snapshot ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
          {/* Market & Selling Card */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.1rem" }}>📈</span>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#fff" }}>Market & Selling Decision</h3>
            </div>
            {marketDec?.mandi ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>{marketDec.mandi}</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--gold-300)" }}>₹{marketDec.modal_price_inr}/quintal</div>
                  </div>
                  <span style={{ padding: "0.3rem 0.75rem", borderRadius: "6px", background: "rgba(107,174,133,0.2)", color: "var(--green-300)", fontWeight: 700, fontSize: "0.8rem" }}>
                    {marketDec.recommendation_type}
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5, margin: 0 }}>{marketDec.reasoning}</p>
              </div>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Run analysis to view mandi prices.</div>
            )}
          </div>

          {/* Financial Snapshot Card */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.1rem" }}>💰</span>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#fff" }}>Financial & Credit Snapshot</h3>
            </div>
            {finSnap ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Estimated Input Cost</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginTop: "0.2rem" }}>₹{finSnap.estimated_input_cost_inr?.toLocaleString()}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Expected Net Margin</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--green-300)", marginTop: "0.2rem" }}>₹{finSnap.expected_net_margin_inr?.toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Run analysis to compute budget & credit estimates.</div>
            )}
          </div>
        </div>

        {/* ── 5. Farmer Season Feedback Form ── */}
        <section style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.5rem", marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>⭐</span> Farmer Season Feedback & Harvest Logging
          </h2>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", margin: "0 0 1.25rem" }}>
            Help improve regional AI accuracy by logging your actual crop yield and market realization.
          </p>

          {fbSuccess ? (
            <div style={{ background: "rgba(107,174,133,0.15)", border: "1px solid rgba(107,174,133,0.4)", padding: "1rem", borderRadius: "8px", color: "var(--green-300)", fontSize: "0.9rem" }}>
              ✓ {fbSuccess}
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "0.3rem" }}>Rating (1–5 Stars)</label>
                  <select
                    value={feedback.rating}
                    onChange={(e) => setFeedback((f) => ({ ...f, rating: Number(e.target.value) }))}
                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.6rem", color: "#fff" }}
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r} style={{ background: "var(--green-900)" }}>{r} Stars</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "0.3rem" }}>Actual Harvest Yield (Quintals/Acre)</label>
                  <input
                    type="number"
                    placeholder="e.g. 40"
                    value={feedback.actual_yield ?? ""}
                    onChange={(e) => setFeedback((f) => ({ ...f, actual_yield: e.target.value ? Number(e.target.value) : undefined }))}
                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.6rem", color: "#fff" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "0.3rem" }}>Notes / Harvest Feedback</label>
                <textarea
                  rows={2}
                  placeholder="Share details about crop performance, weather impacts, or prices received..."
                  value={feedback.notes}
                  onChange={(e) => setFeedback((f) => ({ ...f, notes: e.target.value }))}
                  style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.65rem", color: "#fff", fontSize: "0.85rem", resize: "vertical" }}
                />
              </div>

              <button
                type="submit"
                disabled={fbSubmitting}
                style={{ background: "var(--gold-500)", color: "var(--green-900)", border: "none", borderRadius: "6px", padding: "0.65rem 1.5rem", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}
              >
                {fbSubmitting ? "Submitting..." : "Submit Season Feedback"}
              </button>
            </form>
          )}
        </section>

        {/* ── 6. Collapsible Agronomist Technical Drawer (14 Agents) ── */}
        <section>
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "1rem", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>🤖 Agronomist Diagnostic View (14 Multi-Agent Diagnostic Cards)</span>
            <span>{showTechnicalDetails ? "▲ Hide Technical View" : "▼ Show Technical View"}</span>
          </button>

          {showTechnicalDetails && (
            <div style={{ marginTop: "1.5rem" }}>
              {AGENT_REGISTRY.map((agent) => {
                const st = agentStates[agent.key] || { status: "idle", result: null, error: null };
                return (
                  <div key={agent.key} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "1rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem" }}>{agent.display_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{agent.description}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "0.7rem", color: st.status === "success" ? "var(--green-300)" : st.status === "running" ? "var(--gold-300)" : "rgba(255,255,255,0.4)", textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{st.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 7. Agricultural Safety & Advisory Disclaimer Footer ── */}
        <footer style={{ marginTop: "3.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, textAlign: "center", maxWidth: "900px", margin: "0 auto" }}>
            <strong>⚠️ Agricultural Advisory Disclaimer:</strong> Krishi Agent recommendations are generated using official government soil baselines, Open-Meteo micro-climate models, APMC mandi pricing feeds, and AI agronomic interpretations. Financial margins, yields, and credit limits are non-guaranteed estimates. Please consult your district Krishi Vigyan Kendra (KVK) extension officer or licensed agricultural officer prior to applying heavy fertilizer/chemical dosages or undertaking major capital investments.
          </div>
        </footer>
      </main>
    </div>
  );
}
