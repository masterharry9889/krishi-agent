"use client";
import { useEffect, useRef } from "react";

const DATA_SOURCES = [
  {
    id: "shc",
    name: "Soil Health Card",
    short: "SHC",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    what: "pH, NPK, micro-nutrient deficiencies, and salinity levels — fetched per farmer by their state registration number.",
    usedBy: "SoilAgent",
    color: "#7A4F2D",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
        <rect x="4" y="4" width="24" height="24" rx="3" stroke="#7A4F2D" strokeWidth="1.5" />
        <path d="M8 12h16M8 16h12M8 20h8" stroke="#7A4F2D" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="20" r="5" fill="#7A4F2D" opacity="0.15" stroke="#7A4F2D" strokeWidth="1" />
        <path d="M22 20h4M24 18v4" stroke="#7A4F2D" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "agmarknet",
    name: "Agmarknet",
    short: "AGMK",
    ministry: "Directorate of Marketing & Inspection",
    what: "Mandi-level commodity prices, arrival volumes, and demand-supply gap signals across 3,000+ regulated markets.",
    usedBy: "MarketIntelligenceAgent",
    color: "#C8893A",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
        <path d="M4 24 L10 16 L16 20 L22 10 L28 14" stroke="#C8893A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="16" r="2" fill="#C8893A" />
        <circle cx="16" cy="20" r="2" fill="#C8893A" />
        <circle cx="22" cy="10" r="2" fill="#C8893A" />
      </svg>
    ),
  },
  {
    id: "enam",
    name: "e-NAM",
    short: "e-NAM",
    ministry: "Small Farmers Agribusiness Consortium",
    what: "National Agriculture Market — electronic trading portal connecting farmers directly with buyers across state borders.",
    usedBy: "DirectMarketLinkageAgent",
    color: "#3D7A52",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
        <circle cx="16" cy="16" r="11" stroke="#3D7A52" strokeWidth="1.5" />
        <path d="M8 16h16M16 5 Q12 16 16 27M16 5 Q20 16 16 27" stroke="#3D7A52" strokeWidth="1.2" fill="none" />
      </svg>
    ),
  },
  {
    id: "ndvi",
    name: "Satellite NDVI",
    short: "NDVI",
    ministry: "ISRO / Sentinel-2 imagery",
    what: "Normalised Difference Vegetation Index — crop canopy health scored 0–1. Alerts trigger when NDVI drops below season-stage thresholds.",
    usedBy: "CropMonitoringAgent + price_watcher worker",
    color: "#2D5A3D",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
        <rect x="4" y="14" width="24" height="14" rx="2" fill="#2D5A3D" opacity="0.15" stroke="#2D5A3D" strokeWidth="1.5" />
        <path d="M16 14 L16 4" stroke="#2D5A3D" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 8 L16 4 L20 8" stroke="#2D5A3D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="12" y="19" width="8" height="5" rx="1" fill="#2D5A3D" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "pmfby",
    name: "PMFBY",
    short: "PMFBY",
    ministry: "Pradhan Mantri Fasal Bima Yojana",
    what: "Crop insurance scheme eligibility check, state-specific actuarial premium rates, enrollment deadline monitoring.",
    usedBy: "SchemeInsuranceAgent + insurance_deadline_soon router",
    color: "#9A6420",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
        <path d="M16 4 L28 10 L28 20 Q28 26 16 30 Q4 26 4 20 L4 10 Z" stroke="#9A6420" strokeWidth="1.5" fill="#9A6420" fillOpacity="0.1" />
        <path d="M11 17 L14 20 L21 13" stroke="#9A6420" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "credit",
    name: "Credit Partners",
    short: "LOAN",
    ministry: "Rural & Co-operative Banks",
    what: "Kisan Credit Card and short-term crop loan offers surfaced only when BudgetEstimatorAgent detects a shortfall — no unsolicited lending.",
    usedBy: "CreditAgent (conditional)",
    color: "#4A2E1A",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
        <rect x="4" y="9" width="24" height="16" rx="3" stroke="#4A2E1A" strokeWidth="1.5" />
        <path d="M4 15h24" stroke="#4A2E1A" strokeWidth="1.5" />
        <rect x="8" y="19" width="6" height="2" rx="1" fill="#4A2E1A" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: "fpo",
    name: "FPO Buyer Directory",
    short: "FPO",
    ministry: "Farmer Producer Organisations",
    what: "Verified FPO and private buyer contacts matched by crop type and district, eliminating middlemen for direct price realisation.",
    usedBy: "DirectMarketLinkageAgent",
    color: "#3D7A52",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
        <circle cx="12" cy="12" r="5" stroke="#3D7A52" strokeWidth="1.5" />
        <circle cx="22" cy="12" r="5" stroke="#3D7A52" strokeWidth="1.5" />
        <path d="M4 26 Q8 20 12 20 Q17 20 17 20 Q22 20 22 20 Q26 20 28 26" stroke="#3D7A52" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "coldstorage",
    name: "Cold Storage Locator",
    short: "COLD",
    ministry: "NCCD / NHB registry",
    what: "Nearest warehouses and cold stores with available capacity, used when StorageSellTimingAgent recommends holding instead of selling.",
    usedBy: "StorageSellTimingAgent",
    color: "#2D5A3D",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
        <rect x="6" y="4" width="20" height="24" rx="2" stroke="#2D5A3D" strokeWidth="1.5" />
        <path d="M16 4 v24M10 10 h12M10 16 h12M10 22 h12" stroke="#2D5A3D" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <circle cx="16" cy="16" r="3" fill="#2D5A3D" opacity="0.3" />
        <path d="M14 16 h4M16 14 v4" stroke="#2D5A3D" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function DataSources() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    ref.current?.querySelectorAll(".fade-up, .pipeline-node").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${i * 0.06}s`;
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="data-sources"
      ref={ref}
      aria-labelledby="data-heading"
      style={{
        background: "var(--dawn-50)",
        padding: "5rem 0 6rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative line */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "1px",
          height: "100%",
          background: "linear-gradient(to bottom, transparent, rgba(200,137,58,0.15), transparent)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.5rem",
        }}
      >
        {/* Header — intentionally left-aligned, not centered */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "3rem",
            alignItems: "end",
            marginBottom: "3.5rem",
          }}
          className="sources-header-grid"
        >
          <div className="fade-up">
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
              Real integrations
            </div>
            <h2
              id="data-heading"
              style={{
                fontFamily: "var(--font-instrument-serif), Georgia, serif",
                fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                color: "var(--green-900)",
                lineHeight: 1.2,
              }}
            >
              Not synthetic data.
              <br />
              <em style={{ color: "var(--gold-500)", fontStyle: "italic" }}>
                Government APIs.
              </em>
            </h2>
          </div>
          <div className="fade-up">
            <p
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                color: "var(--ink-muted)",
                maxWidth: "44ch",
              }}
            >
              Every recommendation is grounded in the same data the government publishes.
              No hallucinated crop prices, no generic soil advice — each agent calls a specific
              API and writes the result into{" "}
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "0.875rem",
                  color: "var(--ink)",
                }}
              >
                FarmerState
              </span>
              .
            </p>
          </div>
        </div>

        {/* Staggered card grid — intentionally asymmetric layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {DATA_SOURCES.map((src, idx) => (
            <div
              key={src.id}
              className="pipeline-node"
              style={{
                background: "#fff",
                border: "1px solid rgba(74,46,26,0.1)",
                borderTop: `3px solid ${src.color}`,
                borderRadius: "10px",
                padding: "1.375rem",
                marginTop: idx % 3 === 1 ? "1.25rem" : 0,
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.875rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  {src.icon}
                  <div>
                    <div
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                        color: "var(--ink)",
                        lineHeight: 1.2,
                      }}
                    >
                      {src.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        color: "var(--ink-subtle)",
                        marginTop: "1px",
                      }}
                    >
                      {src.ministry}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: "0.625rem",
                    background: `${src.color}14`,
                    color: src.color,
                    border: `1px solid ${src.color}30`,
                    borderRadius: "4px",
                    padding: "0.15rem 0.4rem",
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                  }}
                >
                  {src.short}
                </span>
              </div>

              {/* What */}
              <p
                style={{
                  fontSize: "0.8125rem",
                  lineHeight: 1.65,
                  color: "var(--ink-muted)",
                  marginBottom: "0.875rem",
                }}
              >
                {src.what}
              </p>

              {/* Used by */}
              <div
                style={{
                  paddingTop: "0.75rem",
                  borderTop: "1px solid rgba(74,46,26,0.08)",
                  fontSize: "0.6875rem",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  color: "var(--ink-subtle)",
                }}
              >
                <span style={{ color: "var(--ink-muted)" }}>Used by: </span>
                <span style={{ color: src.color }}>{src.usedBy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sources-header-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
        }
      `}</style>
    </section>
  );
}
