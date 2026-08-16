"use client";
import { useEffect, useRef } from "react";

// Inline SVG crop field illustration
function FieldIllustration() {
  return (
    <svg
      viewBox="0 0 640 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: "100%", height: "auto", maxWidth: "640px" }}
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0E8D8" />
          <stop offset="100%" stopColor="#E8B96A" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A4F2D" />
          <stop offset="100%" stopColor="#4A2E1A" />
        </linearGradient>
        <linearGradient id="stemGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6BAE85" />
          <stop offset="100%" stopColor="#2D5A3D" />
        </linearGradient>
      </defs>

      {/* Background sky */}
      <rect width="640" height="200" fill="url(#skyGrad)" />

      {/* Soil layers */}
      <rect y="200" width="640" height="120" fill="url(#soilGrad)" />
      {/* Soil horizon lines */}
      <line x1="0" y1="220" x2="640" y2="220" stroke="#9A6420" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="4 8" />
      <line x1="0" y1="250" x2="640" y2="250" stroke="#4A2E1A" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="2 10" />
      {/* Root structures */}
      {[80, 180, 280, 380, 480, 580].map((x) => (
        <g key={x}>
          <line x1={x} y1="200" x2={x - 18} y2="240" stroke="#C8893A" strokeWidth="1" strokeOpacity="0.5" />
          <line x1={x} y1="200" x2={x + 14} y2="238" stroke="#C8893A" strokeWidth="1" strokeOpacity="0.5" />
          <line x1={x} y1="200" x2={x + 5} y2="260" stroke="#C8893A" strokeWidth="0.8" strokeOpacity="0.4" />
        </g>
      ))}

      {/* Wheat stalks */}
      {[60, 120, 180, 240, 300, 360, 420, 480, 540, 600].map((x, i) => {
        const height = 110 + (i % 3) * 12;
        const cx = x + 20;
        return (
          <g key={x}>
            {/* Stem */}
            <path
              d={`M${cx} 200 Q${cx + 8} ${200 - height / 2} ${cx} ${200 - height}`}
              stroke="url(#stemGrad)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {/* Ear of wheat */}
            <ellipse cx={cx} cy={200 - height} rx="5" ry="18" fill="#C8893A" opacity="0.85" />
            <ellipse cx={cx - 5} cy={200 - height + 8} rx="3.5" ry="8" fill="#E8B96A" opacity="0.7" transform={`rotate(-20 ${cx - 5} ${200 - height + 8})`} />
            <ellipse cx={cx + 5} cy={200 - height + 8} rx="3.5" ry="8" fill="#E8B96A" opacity="0.7" transform={`rotate(20 ${cx + 5} ${200 - height + 8})`} />
            {/* Leaf */}
            <path
              d={`M${cx} ${200 - height / 2} Q${cx + 22} ${200 - height / 2 - 15} ${cx + 8} ${200 - height / 2 - 30}`}
              stroke="#6BAE85"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>
        );
      })}

      {/* Horizon treeline */}
      {[20, 65, 110, 500, 545, 595].map((x) => (
        <ellipse key={x} cx={x} cy="130" rx="28" ry="48" fill="#1A3020" opacity="0.7" />
      ))}

      {/* Data overlay dots — satellite ping */}
      {[180, 300, 420].map((x) => (
        <g key={x}>
          <circle cx={x} cy="90" r="4" fill="#C8893A" opacity="0.9" />
          <circle cx={x} cy="90" r="10" fill="none" stroke="#C8893A" strokeWidth="1" opacity="0.4" />
          <circle cx={x} cy="90" r="18" fill="none" stroke="#C8893A" strokeWidth="0.6" opacity="0.2" />
          <line x1={x} y1="98" x2={x} y2="200" stroke="#C8893A" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.35" />
        </g>
      ))}
    </svg>
  );
}

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".fade-up");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.15 }
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby="hero-headline"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
        background: "linear-gradient(160deg, var(--dawn-50) 0%, var(--gold-100) 60%, var(--green-100) 100%)",
        paddingTop: "80px",
      }}
    >
      {/* Grain overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "3rem 1.5rem 4rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3rem",
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
        className="hero-grid"
      >
        {/* Left: copy */}
        <div>
          {/* Eyebrow */}
          <div
            className="fade-up"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(45, 90, 61, 0.08)",
              border: "1px solid rgba(45, 90, 61, 0.2)",
              borderRadius: "100px",
              padding: "0.25rem 0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--green-500)",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--green-700)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              LangGraph multi-agent system
            </span>
          </div>

          {/* Headline */}
          <h1
            id="hero-headline"
            className="fade-up delay-1"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              lineHeight: 1.1,
              color: "var(--green-900)",
              marginBottom: "1.25rem",
              letterSpacing: "-0.01em",
            }}
          >
            Season-long intelligence
            <br />
            <em style={{ color: "var(--gold-500)", fontStyle: "italic" }}>
              for every acre.
            </em>
          </h1>

          {/* Sub */}
          <p
            className="fade-up delay-2"
            style={{
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              color: "var(--ink-muted)",
              maxWidth: "44ch",
              marginBottom: "2rem",
            }}
          >
            From the first soil reading to the last mandi sale — Krishi Agent runs
            a{" "}
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>
              15-node LangGraph pipeline
            </span>{" "}
            that tracks your{" "}
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>FarmerState</span>{" "}
            across the full growing season, calling real government and market APIs at each step.
          </p>

          {/* Phase tags */}
          <div
            className="fade-up delay-3"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.375rem",
              marginBottom: "2.5rem",
            }}
            aria-label="Pipeline phases"
          >
            {[
              "Onboarding",
              "Soil + Weather",
              "Crop Pick",
              "Budget",
              "PMFBY",
              "Monitoring",
              "Sell Timing",
              "Market Linkage",
              "Feedback Loop",
            ].map((phase) => (
              <span
                key={phase}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  color: "var(--soil-600)",
                  background: "rgba(122, 79, 45, 0.08)",
                  border: "1px solid rgba(122, 79, 45, 0.18)",
                  borderRadius: "4px",
                  padding: "0.2rem 0.5rem",
                  letterSpacing: "0.02em",
                }}
              >
                {phase}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div
            className="fade-up delay-4"
            style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}
          >
            <a
              href="#cta"
              id="hero-cta-farmer"
              style={{
                display: "inline-block",
                background: "var(--green-900)",
                color: "var(--gold-300)",
                textDecoration: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                fontWeight: 600,
                letterSpacing: "0.01em",
                transition: "background 0.2s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "var(--green-700)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "var(--green-900)";
                el.style.transform = "translateY(0)";
              }}
            >
              Register as a farmer
            </a>
            <a
              href="#pipeline"
              id="hero-cta-pipeline"
              style={{
                display: "inline-block",
                background: "transparent",
                color: "var(--green-800)",
                textDecoration: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                fontWeight: 500,
                border: "1.5px solid rgba(45, 90, 61, 0.35)",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "var(--green-500)";
                el.style.background = "rgba(45,90,61,0.04)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "rgba(45, 90, 61, 0.35)";
                el.style.background = "transparent";
              }}
            >
              See the pipeline →
            </a>
          </div>
        </div>

        {/* Right: illustration */}
        <div
          className="fade-up delay-2"
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          aria-hidden="true"
        >
          <div
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(4px)",
              borderRadius: "16px",
              border: "1px solid rgba(200, 137, 58, 0.2)",
              overflow: "hidden",
              boxShadow: "0 12px 48px rgba(45, 90, 61, 0.12), 0 2px 8px rgba(200,137,58,0.1)",
              width: "100%",
            }}
          >
            <FieldIllustration />
            {/* Floating data chip */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(26, 48, 32, 0.92)",
                backdropFilter: "blur(8px)",
                borderRadius: "8px",
                padding: "0.5rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "0.625rem",
                  color: "var(--gold-300)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                NDVI · live
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "1rem",
                  color: "#ffffff",
                  fontWeight: 500,
                }}
              >
                0.72
              </span>
              <span style={{ fontSize: "0.625rem", color: "var(--green-300)" }}>
                ↑ healthy canopy
              </span>
            </div>
            {/* Bottom stat bar */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "rgba(26,48,32,0.88)",
                backdropFilter: "blur(8px)",
                padding: "0.6rem 1rem",
                display: "flex",
                gap: "1.5rem",
              }}
            >
              {[
                { label: "Phase", value: "monitoring" },
                { label: "Mandi (₹/qtl)", value: "2,180" },
                { label: "Action", value: "hold — wait 12d" },
              ].map((item) => (
                <div key={item.label}>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: "0.6rem",
                      color: "var(--green-300)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: "0.8125rem",
                      color: "var(--gold-300)",
                      marginTop: "1px",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        className="fade-up"
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.375rem",
          zIndex: 2,
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: "0.6875rem", color: "var(--ink-subtle)", letterSpacing: "0.08em" }}>
          SCROLL
        </span>
        <div
          style={{
            width: "1px",
            height: "40px",
            background: "linear-gradient(to bottom, var(--gold-500), transparent)",
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
