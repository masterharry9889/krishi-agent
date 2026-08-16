"use client";
import { useEffect, useRef } from "react";

const LANGUAGES = [
  { code: "hi", name: "हिन्दी", romanized: "Hindi", region: "North India" },
  { code: "mr", name: "मराठी", romanized: "Marathi", region: "Maharashtra" },
  { code: "ta", name: "தமிழ்", romanized: "Tamil", region: "Tamil Nadu" },
  { code: "te", name: "తెలుగు", romanized: "Telugu", region: "Andhra / Telangana" },
  { code: "kn", name: "ಕನ್ನಡ", romanized: "Kannada", region: "Karnataka" },
  { code: "pa", name: "ਪੰਜਾਬੀ", romanized: "Punjabi", region: "Punjab" },
  { code: "gu", name: "ગુજરાતી", romanized: "Gujarati", region: "Gujarat" },
  { code: "bn", name: "বাংলা", romanized: "Bengali", region: "West Bengal" },
];

const REAL_CONDITIONS = [
  {
    id: "voice",
    title: "Voice-first interface",
    body: "Farmers speak in their language — the system transcribes (STT), processes, and responds in speech (TTS). No app download, no literacy requirement. The i18n layer in locale_prompts/ maps every agent prompt to the farmer's selected language, stored in their FarmerState profile.",
    tag: "i18n · STT/TTS",
    color: "var(--green-700)",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="36" height="36" aria-hidden="true">
        <circle cx="20" cy="16" r="6" stroke="#2D5A3D" strokeWidth="1.8" />
        <path d="M10 26 Q10 34 20 34 Q30 34 30 26" stroke="#2D5A3D" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M20 34 v4" stroke="#2D5A3D" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="16" y1="38" x2="24" y2="38" stroke="#2D5A3D" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "lowbandwidth",
    title: "Low-bandwidth by design",
    body: "The pipeline runs server-side. The farmer's device only needs to send a short voice clip or a few taps. No large model downloads, no client-side ML. Designed for 2G/3G rural connectivity — the FarmerState travels over minimal JSON payloads.",
    tag: "server-side · minimal payload",
    color: "var(--gold-700)",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="36" height="36" aria-hidden="true">
        <path d="M6 28 Q6 20 14 20" stroke="#C8893A" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 28 Q6 12 20 12" stroke="#C8893A" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <path d="M6 28 Q6 6 26 6" stroke="#C8893A" strokeWidth="1.8" strokeLinecap="round" opacity="0.25" />
        <circle cx="6" cy="28" r="3" fill="#C8893A" />
      </svg>
    ),
  },
  {
    id: "stateful",
    title: "Stateful across the season",
    body: "A farmer doesn't need to re-explain their situation each conversation. The Postgres checkpointer persists every FarmerState field — soil report, selected crop, insurance enrollment — so the agent picks up exactly where it left off, even weeks later.",
    tag: "Postgres checkpointer",
    color: "var(--green-500)",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="36" height="36" aria-hidden="true">
        <ellipse cx="20" cy="12" rx="12" ry="5" stroke="#3D7A52" strokeWidth="1.8" />
        <path d="M8 12 Q8 20 20 20 Q32 20 32 12" stroke="#3D7A52" strokeWidth="1.8" fill="none" />
        <path d="M8 20 Q8 28 20 28 Q32 28 32 20" stroke="#3D7A52" strokeWidth="1.8" fill="none" />
      </svg>
    ),
  },
  {
    id: "confirmation",
    title: "Human confirmation gates",
    body: "High-stakes decisions — crop selection, sell-now vs. hold — set needs_human_confirmation: true in FarmerState. The pipeline pauses at pending_confirmation_type and waits for the farmer's explicit input before continuing. The agent never autonomously commits to an irreversible action.",
    tag: "needs_human_confirmation",
    color: "var(--soil-600)",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="36" height="36" aria-hidden="true">
        <rect x="8" y="8" width="24" height="24" rx="5" stroke="#7A4F2D" strokeWidth="1.8" />
        <path d="M14 20 L18 24 L26 16" stroke="#7A4F2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function BuiltForReal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.15 }
    );
    ref.current?.querySelectorAll(".fade-up, .pipeline-node").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${i * 0.07}s`;
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="built-for-real"
      ref={ref}
      aria-labelledby="real-heading"
      style={{
        background: "var(--green-900)",
        padding: "5rem 0 6rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 80% 80%, rgba(200,137,58,0.06) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.5rem",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div
          className="fade-up"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            marginBottom: "3.5rem",
            maxWidth: "600px",
          }}
        >
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
            Real conditions
          </div>
          <h2
            id="real-heading"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              color: "#fff",
              lineHeight: 1.2,
              marginBottom: "1rem",
            }}
          >
            Built for the field,
            <br />
            <em style={{ color: "var(--gold-300)", fontStyle: "italic" }}>
              not the demo room.
            </em>
          </h2>
          <p
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.5)",
              maxWidth: "48ch",
            }}
          >
            Most &ldquo;AI for agriculture&rdquo; products assume a smartphone, reliable internet, and
            an English-literate user. Krishi Agent was designed for a farmer in a Punjab
            village with a 3G signal and a preferred language that isn&apos;t English.
          </p>
        </div>

        {/* Two-column layout: cards left, language grid right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "3rem",
            alignItems: "start",
          }}
          className="real-grid"
        >
          {/* Condition cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {REAL_CONDITIONS.map((item) => (
              <div
                key={item.id}
                className="pipeline-node"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: "10px",
                  padding: "1.375rem",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      color: "#fff",
                      marginBottom: "0.375rem",
                    }}
                  >
                    {item.title}
                  </div>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      lineHeight: 1.65,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {item.body}
                  </p>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: "0.6875rem",
                      color: item.color,
                      background: `${item.color}18`,
                      border: `1px solid ${item.color}35`,
                      borderRadius: "4px",
                      padding: "0.15rem 0.5rem",
                    }}
                  >
                    {item.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Language support */}
          <div>
            <div
              className="fade-up"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#fff",
                  marginBottom: "0.375rem",
                }}
              >
                Local-language voice interface
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.6,
                  marginBottom: "1.5rem",
                }}
              >
                STT/TTS pipeline in{" "}
                <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", color: "var(--gold-300)", fontSize: "0.8125rem" }}>
                  backend/app/i18n/locale_prompts/
                </span>
                . The farmer&apos;s preferred language is stored in their{" "}
                <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", color: "var(--gold-300)", fontSize: "0.8125rem" }}>
                  profile.language
                </span>{" "}
                field.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.625rem",
                }}
              >
                {LANGUAGES.map((lang) => (
                  <div
                    key={lang.code}
                    className="pipeline-node"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      padding: "0.625rem 0.75rem",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-instrument-serif), Georgia, serif",
                        fontSize: "1.125rem",
                        color: "var(--gold-300)",
                        lineHeight: 1.2,
                        marginBottom: "2px",
                      }}
                    >
                      {lang.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        color: "rgba(255,255,255,0.45)",
                        fontWeight: 500,
                      }}
                    >
                      {lang.romanized}
                    </div>
                    <div
                      style={{
                        fontSize: "0.625rem",
                        color: "rgba(255,255,255,0.3)",
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        marginTop: "1px",
                      }}
                    >
                      {lang.region}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .real-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
