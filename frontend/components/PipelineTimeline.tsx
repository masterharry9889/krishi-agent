"use client";
import { useEffect, useRef } from "react";

// Pipeline phases directly from build_graph.py edges
const PHASES = [
  {
    id: "onboarding",
    label: "Onboarding",
    agent: "FarmerInterfaceAgent",
    output: "profile: location, land_size, water_source, past_crops, budget, language",
    icon: "👤",
    color: "#2D5A3D",
    phase: "Phase 1",
  },
  {
    id: "parallel",
    label: "Diagnostics",
    agent: "SoilAgent ∥ WeatherAgent ∥ MarketIntelligenceAgent",
    output: "soil_report · weather_outlook · demand_supply gap (Agmarknet)",
    icon: "⟡",
    color: "#C8893A",
    phase: "Phase 2 — parallel fan-out",
    isParallel: true,
  },
  {
    id: "crop_recommendation",
    label: "Crop Recommendation",
    agent: "CropRecommendationAgent",
    output: "crop_shortlist: ranked crops w/ agronomic_fit + market_opportunity scores",
    icon: "🌱",
    color: "#2D5A3D",
    phase: "Phase 3 — fan-in",
  },
  {
    id: "planning",
    label: "Resource & Budget",
    agent: "ResourceIrrigationAgent → BudgetEstimatorAgent → InputVerificationAgent",
    output: "input_plan · budget_estimate · verified_dealers",
    icon: "📋",
    color: "#7A4F2D",
    phase: "Phase 4",
  },
  {
    id: "scheme_insurance",
    label: "Scheme & Credit",
    agent: "SchemeInsuranceAgent → CreditAgent (if shortfall)",
    output: "insurance_status (PMFBY) · credit_offers (Rural/Co-op Bank)",
    icon: "🏦",
    color: "#2D5A3D",
    phase: "Phase 5 — conditional edge",
    isConditional: true,
  },
  {
    id: "monitoring",
    label: "Season Monitoring",
    agent: "CropMonitoringAgent → AdvisoryAgent",
    output: "monitoring_alerts[] · advisory_log[] — append-only, event-driven via workers",
    icon: "📡",
    color: "#C8893A",
    phase: "Phase 6 — background workers",
  },
  {
    id: "harvest",
    label: "Harvest Decision",
    agent: "StorageSellTimingAgent",
    output: "sell_recommendation: sell_now ∨ hold — shelf life, price trend, cold storage options",
    icon: "🌾",
    color: "#2D5A3D",
    phase: "Phase 7 — price trigger re-entry",
  },
  {
    id: "market_linkage",
    label: "Market Linkage",
    agent: "DirectMarketLinkageAgent",
    output: "sale_record — e-NAM, local FPO, verified buyers",
    icon: "🏪",
    color: "#7A4F2D",
    phase: "Phase 8",
  },
  {
    id: "feedback",
    label: "Feedback Loop",
    agent: "FeedbackAgent",
    output: "season_feedback → written back into next season's crop_recommendation context",
    icon: "↺",
    color: "#2D5A3D",
    phase: "Phase 8 — season memory",
  },
];

// Parallel branch nodes
const PARALLEL_NODES = [
  { id: "soil", label: "Soil Agent", api: "Soil Health Card (SHC) API", color: "#7A4F2D" },
  { id: "weather", label: "Weather Agent", api: "IMD 7-day forecast", color: "#3D7A52" },
  { id: "market_intel", label: "Market Intel Agent", api: "Agmarknet mandi API", color: "#C8893A" },
];

function ParallelBranch() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        position: "relative",
        padding: "1rem 0",
      }}
    >
      {/* Branching header */}
      <div
        style={{
          background: "rgba(200,137,58,0.1)",
          border: "1.5px solid rgba(200,137,58,0.35)",
          borderRadius: "8px",
          padding: "0.35rem 0.875rem",
          fontSize: "0.6875rem",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          color: "var(--gold-700)",
          letterSpacing: "0.06em",
          marginBottom: "1rem",
        }}
      >
        add_edge([&quot;soil&quot;, &quot;weather&quot;, &quot;market_intel&quot;], &quot;crop_recommendation&quot;)
      </div>

      {/* Three parallel cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0.75rem",
          width: "100%",
        }}
        className="parallel-grid"
      >
        {PARALLEL_NODES.map((node) => (
          <div
            key={node.id}
            className="pipeline-node"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(8px)",
              border: `1.5px solid ${node.color}30`,
              borderRadius: "10px",
              padding: "1rem",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: node.color,
                marginBottom: "0.5rem",
              }}
            />
            <div
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: "0.25rem",
              }}
            >
              {node.label}
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                color: "var(--ink-muted)",
                lineHeight: 1.4,
              }}
            >
              {node.api}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PipelineTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );

    const nodes = containerRef.current?.querySelectorAll(".pipeline-node, .fade-up");
    nodes?.forEach((n, i) => {
      (n as HTMLElement).style.transitionDelay = `${i * 0.07}s`;
      observer.observe(n);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="pipeline"
      ref={containerRef}
      aria-labelledby="pipeline-heading"
      style={{
        background: "var(--green-900)",
        position: "relative",
        overflow: "hidden",
        padding: "5rem 0 6rem",
      }}
    >
      {/* Background pattern */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 15% 50%, rgba(200,137,58,0.07) 0%, transparent 50%), radial-gradient(circle at 85% 20%, rgba(107,174,133,0.07) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "0 1.5rem",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Section header */}
        <div className="fade-up" style={{ marginBottom: "3.5rem" }}>
          <div
            style={{
              fontSize: "0.6875rem",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.12em",
              color: "var(--gold-500)",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            15-node StateGraph · LangGraph
          </div>
          <h2
            id="pipeline-heading"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              color: "#ffffff",
              lineHeight: 1.2,
              marginBottom: "0.875rem",
            }}
          >
            One pipeline.
            <br />
            <span style={{ color: "var(--gold-300)", fontStyle: "italic" }}>An entire season.</span>
          </h2>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.7,
              maxWidth: "52ch",
            }}
          >
            Each node is an agent with its own LLM + tools. The graph persists your{" "}
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                color: "var(--gold-300)",
                fontSize: "0.875rem",
              }}
            >
              FarmerState
            </span>{" "}
            across weeks using a Postgres checkpointer, resuming on real-world triggers.
          </p>
        </div>

        {/* Vertical timeline */}
        <div
          style={{
            position: "relative",
            paddingLeft: "2.5rem",
          }}
        >
          {/* Vertical connector line */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "11px",
              top: 0,
              bottom: 0,
              width: "1.5px",
              background: "linear-gradient(to bottom, var(--gold-500), var(--green-500) 50%, var(--gold-500))",
              opacity: 0.4,
            }}
          />

          {PHASES.map((phase, idx) => (
            <div
              key={phase.id}
              style={{ marginBottom: idx < PHASES.length - 1 ? "2rem" : 0, position: "relative" }}
            >
              {/* Dot on timeline */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-2.5rem",
                  top: "1.25rem",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: phase.color,
                  border: "2px solid rgba(255,255,255,0.2)",
                  boxShadow: `0 0 0 3px ${phase.color}30`,
                }}
              />

              {/* Node card */}
              <div
                className="pipeline-node"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderLeft: `3px solid ${phase.color}`,
                  borderRadius: "10px",
                  padding: "1.25rem 1.5rem",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    marginBottom: "0.625rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.625rem",
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        color: "rgba(255,255,255,0.38)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {phase.phase}
                    </div>
                    <h3
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "#fff",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {phase.label}
                    </h3>
                  </div>
                  <span
                    aria-hidden="true"
                    style={{ fontSize: "1.25rem", opacity: 0.8, flexShrink: 0 }}
                  >
                    {phase.icon}
                  </span>
                </div>

                {/* Agent name */}
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: "0.6875rem",
                    color: phase.color === "#C8893A" ? "var(--gold-300)" : "var(--green-300)",
                    marginBottom: "0.5rem",
                    opacity: 0.85,
                  }}
                >
                  {phase.agent}
                </div>

                {/* Output */}
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.5,
                    fontStyle: "italic",
                  }}
                >
                  → {phase.output}
                </div>

                {/* Parallel branch inlined */}
                {phase.isParallel && (
                  <div style={{ marginTop: "1rem" }}>
                    <ParallelBranch />
                  </div>
                )}

                {/* Conditional badge */}
                {phase.isConditional && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      background: "rgba(200,137,58,0.15)",
                      border: "1px dashed rgba(200,137,58,0.4)",
                      borderRadius: "4px",
                      padding: "0.25rem 0.625rem",
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      color: "var(--gold-300)",
                    }}
                  >
                    <span>⋯</span>
                    <span>needs_credit router · conditional edge</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* LangGraph note */}
        <div
          className="fade-up"
          style={{
            marginTop: "3rem",
            background: "rgba(200,137,58,0.06)",
            border: "1px solid rgba(200,137,58,0.18)",
            borderRadius: "10px",
            padding: "1.25rem 1.5rem",
            display: "flex",
            gap: "1rem",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "rgba(200,137,58,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
            }}
          >
            ⟳
          </div>
          <div>
            <div
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--gold-300)",
                marginBottom: "0.25rem",
              }}
            >
              Event-driven resumption
            </div>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              The graph doesn&apos;t run once and exit. Background workers watch NDVI imagery,
              mandi price feeds, and PMFBY deadlines. When a threshold is crossed — a price
              spike, a pest alert, an insurance deadline — they resume the graph thread at
              the correct node using the Postgres checkpointer.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .parallel-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
