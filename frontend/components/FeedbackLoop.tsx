"use client";
import { useEffect, useRef } from "react";

function FeedbackDiagram() {
  return (
    <svg
      viewBox="0 0 480 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Feedback loop diagram: season_feedback flows from FeedbackAgent back into CropRecommendationAgent"
      style={{ width: "100%", height: "auto", maxWidth: "480px" }}
    >
      <defs>
        <marker id="arrowGold" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#C8893A" />
        </marker>
        <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#6BAE85" />
        </marker>
      </defs>

      {/* Background */}
      <rect width="480" height="260" rx="12" fill="rgba(26,48,32,0.04)" />

      {/* Top half — current season flow */}
      <text x="240" y="24" textAnchor="middle" fontSize="10" fill="#9A9490" fontFamily="JetBrains Mono, monospace" letterSpacing="2">SEASON N</text>

      {/* Nodes — top row */}
      {[
        { x: 20, label: "Onboarding", sub: "profile" },
        { x: 130, label: "Soil + Weather", sub: "diagnostics" },
        { x: 250, label: "Crop Pick", sub: "crop_shortlist" },
        { x: 360, label: "Harvest + Sell", sub: "sale_record" },
      ].map((n) => (
        <g key={n.x}>
          <rect x={n.x} y="38" width="96" height="44" rx="6" fill="rgba(45,90,61,0.12)" stroke="#3D7A52" strokeWidth="1.2" />
          <text x={n.x + 48} y="58" textAnchor="middle" fontSize="9.5" fill="#1A3020" fontWeight="600" fontFamily="DM Sans, sans-serif">{n.label}</text>
          <text x={n.x + 48} y="72" textAnchor="middle" fontSize="8" fill="#5A5550" fontFamily="JetBrains Mono, monospace">{n.sub}</text>
        </g>
      ))}

      {/* Horizontal arrows between top nodes */}
      <path d="M116 60 L130 60" stroke="#6BAE85" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
      <path d="M226 60 L250 60" stroke="#6BAE85" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
      <path d="M346 60 L360 60" stroke="#6BAE85" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />

      {/* Feedback arc — bottom */}
      <text x="240" y="130" textAnchor="middle" fontSize="10" fill="#9A9490" fontFamily="JetBrains Mono, monospace" letterSpacing="2">season_feedback</text>

      {/* FeedbackAgent node */}
      <rect x="170" y="148" width="140" height="44" rx="6" fill="rgba(200,137,58,0.12)" stroke="#C8893A" strokeWidth="1.5" />
      <text x="240" y="168" textAnchor="middle" fontSize="9.5" fill="#9A6420" fontWeight="600" fontFamily="DM Sans, sans-serif">FeedbackAgent</text>
      <text x="240" y="182" textAnchor="middle" fontSize="8" fill="#7A4F2D" fontFamily="JetBrains Mono, monospace">actual_yield · price_realized · lessons</text>

      {/* Arrow: sale_record → feedback agent */}
      <path d="M408 82 Q430 115 310 148" stroke="#C8893A" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrowGold)" />

      {/* Season N+1 label */}
      <text x="240" y="222" textAnchor="middle" fontSize="10" fill="#9A9490" fontFamily="JetBrains Mono, monospace" letterSpacing="2">SEASON N+1</text>

      {/* CropRecommendation node — next season */}
      <rect x="150" y="234" width="180" height="20" rx="4" fill="rgba(45,90,61,0.08)" stroke="#2D5A3D" strokeWidth="1" />
      <text x="240" y="248" textAnchor="middle" fontSize="8.5" fill="#2D5A3D" fontFamily="DM Sans, sans-serif">CropRecommendationAgent context</text>

      {/* Arrow: feedback → next season crop */}
      <path d="M240 192 L240 234" stroke="#C8893A" strokeWidth="1.5" markerEnd="url(#arrowGold)" />

      {/* Annotation */}
      <text x="248" y="212" fontSize="8" fill="#C8893A" fontFamily="JetBrains Mono, monospace">writes back →</text>
    </svg>
  );
}

export default function FeedbackLoop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.2 }
    );
    ref.current?.querySelectorAll(".fade-up").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${i * 0.1}s`;
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="feedback-loop"
      ref={ref}
      aria-labelledby="feedback-heading"
      style={{
        background: "var(--dawn-100)",
        padding: "5rem 0 6rem",
        borderTop: "1px solid rgba(74,46,26,0.1)",
        borderBottom: "1px solid rgba(74,46,26,0.1)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4rem",
          alignItems: "center",
        }}
        className="feedback-grid"
      >
        {/* Diagram — left */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "center" }}>
          <FeedbackDiagram />
        </div>

        {/* Copy — right */}
        <div>
          <div
            className="fade-up"
            style={{
              fontSize: "0.6875rem",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.12em",
              color: "var(--gold-500)",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            Phase 8 — season memory
          </div>

          <h2
            id="feedback-heading"
            className="fade-up"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              color: "var(--green-900)",
              lineHeight: 1.2,
              marginBottom: "1.125rem",
            }}
          >
            Each harvest
            <br />
            <em style={{ color: "var(--gold-500)", fontStyle: "italic" }}>
              sharpens the next one.
            </em>
          </h2>

          <p
            className="fade-up"
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.75,
              color: "var(--ink-muted)",
              marginBottom: "1.5rem",
              maxWidth: "44ch",
            }}
          >
            After every sale,{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 600 }}>FeedbackAgent</strong> logs
            the actual yield, price realised, and input costs — not generic survey data, but the
            specific numbers from{" "}
            <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "0.875rem", color: "var(--soil-600)" }}>
              sale_record
            </span>
            . That{" "}
            <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "0.875rem", color: "var(--soil-600)" }}>
              season_feedback
            </span>{" "}
            dict is written back into the next season&apos;s{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 600 }}>CropRecommendationAgent</strong>{" "}
            context before the pipeline runs again.
          </p>

          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {[
              {
                field: "actual_yield",
                note: "Tons per acre — compared against pre-season projection",
                color: "var(--green-700)",
              },
              {
                field: "price_realized",
                note: "₹/ton at point of sale — vs. the mandi forecast at crop selection",
                color: "var(--gold-700)",
              },
              {
                field: "input_costs",
                note: "₹/acre actual — calibrates budget estimates for next season",
                color: "var(--soil-600)",
              },
              {
                field: "lessons[]",
                note: 'e.g. "Used too much fertilizer", "Irrigation timing was good"',
                color: "var(--green-500)",
              },
            ].map((item) => (
              <div
                key={item.field}
                style={{
                  display: "flex",
                  gap: "0.875rem",
                  alignItems: "flex-start",
                  padding: "0.75rem 1rem",
                  background: "#fff",
                  borderRadius: "8px",
                  border: "1px solid rgba(74,46,26,0.08)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: "0.75rem",
                    color: item.color,
                    fontWeight: 500,
                    minWidth: "110px",
                    flexShrink: 0,
                  }}
                >
                  {item.field}
                </span>
                <span style={{ fontSize: "0.8125rem", color: "var(--ink-muted)", lineHeight: 1.5 }}>
                  {item.note}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .feedback-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </section>
  );
}
