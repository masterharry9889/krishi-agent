"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getFarmerContext,
  runAgent,
  orchestrateFarmAnalysis,
  DASHBOARD_REQUIRED_AGENTS,
  getFarmerInsight,
  submitFarmerFeedback,
  ApiError,
  FarmerContextResponse,
  FarmerInsight,
  PriorityItem,
  FarmerAlert,
} from "@/lib/api";
import { AGENT_REGISTRY } from "@/lib/agents";

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi (हिंदी)",
  mr: "Marathi (मराठी)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (தமிழ்)",
  kn: "Kannada (ಕನ್ನಡ)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  gu: "Gujarati (ગુજરાતી)",
  bn: "Bengali (বাংলা)",
  en: "English",
};

interface PageParams {
  farmer_id: string;
  season_id: string;
}

interface AgentState {
  status: "idle" | "running" | "success" | "error" | "blocked";
  result: Record<string, unknown> | null;
  error: string | null;
}

export default function FarmerDashboardPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const { farmer_id: farmerId, season_id: seasonId } = resolvedParams;

  const [context, setContext] = useState<FarmerContextResponse | null>(null);
  const [insight, setInsight] = useState<FarmerInsight | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestratorStep, setOrchestratorStep] = useState<string>("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [whyExpanded, setWhyExpanded] = useState(false);

  // Feedback form state
  const [fbRating, setFbRating] = useState<number>(5);
  const [fbUsed, setFbUsed] = useState<boolean>(true);
  const [fbYield, setFbYield] = useState<string>("");
  const [fbPrice, setFbPrice] = useState<string>("");
  const [fbNotes, setFbNotes] = useState<string>("");
  const [fbSubmitted, setFbSubmitted] = useState<boolean>(false);
  const [fbSubmitting, setFbSubmitting] = useState<boolean>(false);

  // Agent states for technical drawer
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(() => {
    const init: Record<string, AgentState> = {};
    for (const a of AGENT_REGISTRY) {
      init[a.key] = { status: "idle", result: null, error: null };
    }
    return init;
  });

  const loadDashboardData = useCallback(async () => {
    setContextError(null);
    try {
      const [ctx, insData] = await Promise.all([
        getFarmerContext(farmerId),
        getFarmerInsight(farmerId).catch(() => null),
      ]);
      setContext(ctx);
      if (insData?.insight) setInsight(insData.insight);

      if (ctx.agent_outputs && Array.isArray(ctx.agent_outputs)) {
        const nextStates: Record<string, AgentState> = {};
        for (const a of AGENT_REGISTRY) {
          nextStates[a.key] = { status: "idle", result: null, error: null };
        }
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
        setAgentStates(nextStates);
      }
    } catch (err) {
      let message = "Failed to load dashboard. Please try again.";
      if (err instanceof ApiError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setContextError(message);
    } finally {
      setContextLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setContextError(null);
      try {
        const [ctx, insData] = await Promise.all([
          getFarmerContext(farmerId),
          getFarmerInsight(farmerId).catch(() => null),
        ]);
        if (!ignore) {
          setContext(ctx);
          if (insData?.insight) setInsight(insData.insight);

          if (ctx.agent_outputs && Array.isArray(ctx.agent_outputs)) {
            const nextStates: Record<string, AgentState> = {};
            for (const a of AGENT_REGISTRY) {
              nextStates[a.key] = { status: "idle", result: null, error: null };
            }
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
            setAgentStates(nextStates);
          }
        }
      } catch (err) {
        if (!ignore) {
          let message = "Failed to load dashboard. Please try again.";
          if (err instanceof ApiError) message = err.message;
          else if (err instanceof Error) message = err.message;
          setContextError(message);
        }
      } finally {
        if (!ignore) setContextLoading(false);
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [farmerId]);

  const handleAnalyzeMyFarm = async () => {
    setOrchestrating(true);
    setOrchestratorStep("Analyzing Soil, Weather, Market & Crop Plan...");
    try {
      const res = await orchestrateFarmAnalysis(
        farmerId,
        seasonId,
        true,
        DASHBOARD_REQUIRED_AGENTS
      );
      setContext(res.context);
      setInsight(res.insight);

      if (res.context.agent_outputs) {
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
    } catch (err) {
      let msg = "Analysis failed. Please try again.";
      if (err instanceof ApiError) msg = err.message;
      else if (err instanceof Error) msg = err.message;
      alert(`Orchestration error: ${msg}`);
    } finally {
      setOrchestrating(false);
      setOrchestratorStep("");
    }
  };

  const handleRunAgent = async (agentKey: string) => {
    setAgentStates((prev) => ({ ...prev, [agentKey]: { status: "running", result: null, error: null } }));
    try {
      const res = await runAgent(farmerId, seasonId, agentKey);
      if (res.status === "error") {
        setAgentStates((prev) => ({ ...prev, [agentKey]: { status: "error", result: null, error: res.message || "Agent execution failed." } }));
      } else {
        setAgentStates((prev) => ({ ...prev, [agentKey]: { status: "success", result: res as unknown as Record<string, unknown>, error: null } }));
        const insData = await getFarmerInsight(farmerId).catch(() => null);
        if (insData?.insight) setInsight(insData.insight);
      }
    } catch (err) {
      let msg = "Analysis failed. Please try again.";
      if (err instanceof ApiError) msg = err.message;
      else if (err instanceof Error) msg = err.message;
      setAgentStates((prev) => ({ ...prev, [agentKey]: { status: "error", result: null, error: msg } }));
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbSubmitting(true);
    try {
      await submitFarmerFeedback(farmerId, seasonId, {
        rating: fbRating,
        used_recommendation: fbUsed,
        actual_yield: fbYield ? parseFloat(fbYield) : undefined,
        actual_price: fbPrice ? parseFloat(fbPrice) : undefined,
        notes: fbNotes,
      });
      setFbSubmitted(true);
    } catch {
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setFbSubmitting(false);
    }
  };

  if (contextLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--green-900)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-dm-sans), sans-serif" }}>Loading your Farm Decision Platform…</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (contextError || !context) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--green-900)", color: "#fff", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.4)", borderRadius: "12px", padding: "2rem", textAlign: "center" }}>
          <h2 style={{ color: "#ff8080", marginTop: 0 }}>Unable to Load Farm Data</h2>
          <p style={{ color: "rgba(255,255,255,0.7)" }}>{contextError || "Farmer record not found."}</p>
          <button onClick={loadDashboardData} style={{ background: "var(--gold-500)", color: "var(--green-900)", border: "none", borderRadius: "6px", padding: "0.6rem 1.5rem", fontWeight: 600, cursor: "pointer", marginTop: "1rem" }}>Retry</button>
        </div>
      </div>
    );
  }

  const profile = context.profile;
  const currentPhase = insight?.timeline?.current_phase || "SOIL & WEATHER CHECK";
  const priorities = insight?.priorities || [];
  const alerts = insight?.alerts || [];
  const cropDec = insight?.crop_decision;
  const marketDec = insight?.market_decision;
  const finSnap = insight?.financial_snapshot;
  const weatherActs = insight?.weather_actions || [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--green-900)", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif" }}>
      {/* ── Top Navigation Bar ── */}
      <nav style={{ background: "rgba(26,48,32,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100, padding: "0 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif", fontSize: "1.35rem", color: "var(--gold-300)", textDecoration: "none" }}>Krishi Agent</Link>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>📍 {profile.district}</span>
            <Link href="/" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "0.35rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px" }}>← Home</Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

        {/* ── 1. Farmer Welcome & Farm Profile Header ── */}
        <div style={{ background: "linear-gradient(135deg, rgba(38,70,47,0.9) 0%, rgba(26,48,32,0.95) 100%)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "1.75rem", marginBottom: "2rem", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--gold-300)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                Intelligent Farm Decision Platform
              </div>
              <h1 style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif", fontSize: "clamp(1.8rem, 4vw, 2.75rem)", margin: "0 0 0.5rem", color: "#fff" }}>
                Welcome, {profile.name}!
              </h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "0.925rem" }}>
                Real-time agricultural decisions, localized risk alerts, and crop market guidance for your plot.
              </p>
            </div>
            <button
              onClick={handleAnalyzeMyFarm}
              disabled={orchestrating}
              style={{
                background: orchestrating ? "rgba(200,137,58,0.3)" : "var(--gold-500)",
                color: orchestrating ? "rgba(255,255,255,0.7)" : "var(--green-900)",
                border: "none",
                borderRadius: "8px",
                padding: "0.85rem 1.75rem",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: orchestrating ? "wait" : "pointer",
                boxShadow: "0 4px 15px rgba(200,137,58,0.4)",
                transition: "transform 0.2s, background 0.2s",
              }}
            >
              {orchestrating ? `⟳ ${orchestratorStep || "Analyzing..."}` : "🌾 Analyze My Farm"}
            </button>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "1.25rem 0" }} />

          {/* Quick Farm Metadata Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
            {[
              { label: "District", val: profile.district },
              { label: "Land Size", val: `${profile.land_size || 1.0} Acre(s)` },
              { label: "Water Source", val: profile.water_source || "Rainfed" },
              { label: "Language", val: LANGUAGE_NAMES[profile.language] || profile.language },
              { label: "Current Phase", val: currentPhase, gold: true },
              { label: "Farmer ID", val: context.farmer_id.slice(0, 8) + "…", mono: true },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{item.label}</div>
                <div style={{ fontSize: item.mono ? "0.78rem" : "0.95rem", fontWeight: item.gold ? 700 : 500, color: item.gold ? "var(--gold-300)" : "#fff", fontFamily: item.mono ? "var(--font-jetbrains-mono), monospace" : "inherit" }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. Today's Farming Priorities ── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "1.25rem" }}>⚡</span>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#fff" }}>Today’s Priorities & Farming Actions</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
            {priorities.map((item: PriorityItem, idx: number) => {
              const uColor = item.urgency === "critical" ? "#ff4d4d" : item.urgency === "high" ? "#ff9933" : "var(--gold-300)";
              return (
                <div key={idx} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${uColor}40`, borderLeft: `4px solid ${uColor}`, borderRadius: "12px", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>{item.title}</span>
                    <span style={{ fontSize: "0.6rem", textTransform: "uppercase", padding: "0.15rem 0.4rem", borderRadius: "4px", background: `${uColor}20`, color: uColor, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace" }}>{item.urgency}</span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", margin: "0 0 0.75rem", lineHeight: 1.5 }}>{item.reason}</p>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "0.65rem 0.85rem", fontSize: "0.825rem", color: "var(--gold-300)", fontWeight: 600 }}>
                    👉 Action: {item.recommended_action}
                  </div>
                  <div style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.3)", marginTop: "0.5rem", textAlign: "right", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                    Source: {item.source}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 3. Active Farmer Alerts & Weather-to-Action ── */}
        {(alerts.length > 0 || weatherActs.length > 0) && (
          <section style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🌧</span>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#fff" }}>Weather & Field Risk Alerts</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
              {alerts.map((al: FarmerAlert, idx: number) => (
                <div key={idx} style={{ background: "rgba(220,53,69,0.12)", border: "1px solid rgba(220,53,69,0.3)", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#ff8080", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.3rem" }}>
                    <span>⚠</span> [{al.type}] {al.title}
                  </div>
                  <div style={{ fontSize: "0.825rem", color: "rgba(255,255,255,0.75)", marginBottom: "0.5rem" }}>{al.message}</div>
                  <div style={{ fontSize: "0.8rem", color: "#ffb3b3", fontWeight: 600 }}>Nudge: {al.action}</div>
                </div>
              ))}
              {weatherActs.map((wa: { condition: string; action: string; urgency: string }, idx: number) => (
                <div key={idx} style={{ background: "rgba(200,137,58,0.12)", border: "1px solid rgba(200,137,58,0.3)", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ color: "var(--gold-300)", fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.3rem" }}>🌧 {wa.condition}</div>
                  <div style={{ fontSize: "0.825rem", color: "rgba(255,255,255,0.8)" }}>{wa.action}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. Farming Season Timeline ── */}
        <section style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🗓</span>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#fff" }}>Season Progress Timeline</h2>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem", overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: "700px" }}>
              {(insight?.timeline?.all_phases || []).map((step: string, idx: number) => {
                const isCompleted = insight?.timeline?.completed_steps?.includes(step);
                const isCurrent = step === currentPhase;
                return (
                  <div key={step} style={{ flex: 1, textAlign: "center", opacity: isCompleted || isCurrent ? 1 : 0.4 }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: isCurrent ? "var(--gold-500)" : isCompleted ? "var(--green-300)" : "rgba(255,255,255,0.1)", color: isCurrent || isCompleted ? "var(--green-900)" : "#fff", fontWeight: 700, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.4rem" }}>
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <div style={{ fontSize: "0.65rem", fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "var(--gold-300)" : "#fff", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{step}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 5. Crop Decision Card & Trust Badges ── */}
        {cropDec?.recommended_crop && (
          <section style={{ marginBottom: "2.5rem" }}>
            <div style={{ background: "rgba(107,174,133,0.08)", border: "1px solid rgba(107,174,133,0.3)", borderRadius: "14px", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--green-300)", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "var(--font-jetbrains-mono), monospace" }}>⭐ Recommended Crop Choice</span>
                  <h3 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.2rem 0", color: "#fff" }}>{cropDec.recommended_crop}</h3>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>Variety: {(cropDec.varieties || []).join(" · ")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Suitability Index</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--gold-300)" }}>{Math.round((cropDec.suitability_score || 0.85) * 100)}%</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>Duration: {cropDec.expected_duration_days || 120} Days</div>
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

        {/* ── 6. Market & Selling Decision + Financial Snapshot ── */}
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
                <p style={{ fontSize: "0.825rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5, margin: 0 }}>{marketDec.reasoning}</p>
              </div>
            ) : (
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>Run Market Intelligence to see live APMC Mandi trends.</div>
            )}
          </div>

          {/* Financial Snapshot Card */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.1rem" }}>💰</span>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#fff" }}>Financial & Credit Snapshot</h3>
            </div>
            {finSnap ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.65rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Est. Input Cost</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginTop: "0.15rem" }}>₹{finSnap.estimated_input_cost_inr.toLocaleString()}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.65rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Est. Margin</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--green-300)", marginTop: "0.15rem" }}>₹{finSnap.expected_net_margin_inr.toLocaleString()}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.65rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>KCC Credit Offer</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--gold-300)", marginTop: "0.15rem" }}>Up to ₹{(finSnap.kcc_credit_available_inr || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "0.65rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>PMFBY Insurance</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginTop: "0.15rem" }}>{finSnap.pmfby_eligible ? "✓ Eligible (2%)" : "Check details"}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── 7. Farmer Feedback Loop Section ── */}
        <section style={{ marginBottom: "3rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "1.25rem" }}>📝</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "#fff" }}>Farmer Season Feedback</h2>
          </div>

          {fbSubmitted ? (
            <div style={{ background: "rgba(107,174,133,0.15)", border: "1px solid rgba(107,174,133,0.3)", borderRadius: "8px", padding: "1rem", color: "var(--green-300)", fontSize: "0.9rem" }}>
              ✓ Thank you! Your feedback has been logged to continuously improve recommendations.
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>Were these recommendations helpful?</span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFbRating(star)}
                      style={{ background: "transparent", border: "none", fontSize: "1.25rem", cursor: "pointer", opacity: star <= fbRating ? 1 : 0.3 }}
                    >⭐</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="fbUsedCheck"
                  checked={fbUsed}
                  onChange={(e) => setFbUsed(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="fbUsedCheck" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", cursor: "pointer" }}>
                  I followed these farming recommendations in my field.
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <input
                  type="number"
                  placeholder="Actual Yield (quintals/acre)"
                  value={fbYield}
                  onChange={(e) => setFbYield(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.65rem", color: "#fff", fontSize: "0.85rem" }}
                />
                <input
                  type="number"
                  placeholder="Actual Selling Price (INR/quintal)"
                  value={fbPrice}
                  onChange={(e) => setFbPrice(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.65rem", color: "#fff", fontSize: "0.85rem" }}
                />
              </div>

              <textarea
                placeholder="Additional notes or observation for this season..."
                value={fbNotes}
                onChange={(e) => setFbNotes(e.target.value)}
                rows={2}
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "0.65rem", color: "#fff", fontSize: "0.85rem", resize: "vertical" }}
              />

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

        {/* ── 8. Collapsible Advanced Technical Agent Drawer (14 Agents) ── */}
        <section>
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "1rem", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>🤖 Agronomist Diagnostic View (All 14 AI Agents)</span>
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
                      <button
                        onClick={() => handleRunAgent(agent.key)}
                        disabled={st.status === "running"}
                        style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "0.35rem 0.75rem", fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        {st.status === "running" ? "Running..." : "Execute Agent"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 9. Agricultural Safety & Advisory Disclaimer Footer ── */}
        <footer style={{ marginTop: "3.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)", textTransform: "none" }}>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, fontFamily: "var(--font-dm-sans), sans-serif", textAlign: "center", maxWidth: "900px", margin: "0 auto" }}>
            <strong>⚠️ Agricultural Advisory Disclaimer:</strong> Krishi Agent recommendations are generated using official government soil baselines, Open-Meteo micro-climate models, APMC mandi pricing feeds, and AI agronomic interpretations. Financial margins, yields, and credit limits are non-guaranteed estimates. Please consult your district Krishi Vigyan Kendra (KVK) extension officer or licensed agricultural officer prior to applying heavy fertilizer/chemical dosages or undertaking major capital investments.
          </div>
        </footer>

      </main>
    </div>
  );
}