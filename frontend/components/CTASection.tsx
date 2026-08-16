"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  onboardFarmer,
  OnboardPayload,
  OnboardResponse,
  ApiError,
} from "@/lib/api";

type RegistrationState = "idle" | "submitting" | "success" | "error";

export default function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RegistrationState>("idle");
  const [result, setResult] = useState<OnboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<OnboardPayload>({
    name: "",
    phone: "",
    district: "",
    language: "hi",
    password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.15 }
    );
    ref.current?.querySelectorAll(".fade-up").forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = `${i * 0.1}s`;
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.password || form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setState("error");
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Password and Confirm Password do not match.");
      setState("error");
      return;
    }

    setState("submitting");
    setError(null);
    try {
      const response = await onboardFarmer(form);
      setResult(response);
      setState("success");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
      setState("error");
    }
  };

  const languages = [
    { code: "hi", name: "Hindi" },
    { code: "mr", name: "Marathi" },
    { code: "ta", name: "Tamil" },
    { code: "te", name: "Telugu" },
    { code: "kn", name: "Kannada" },
    { code: "pa", name: "Punjabi" },
    { code: "gu", name: "Gujarati" },
    { code: "bn", name: "Bengali" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.625rem 0.875rem",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "7px",
    fontSize: "0.875rem",
    color: "#fff",
    outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "var(--font-dm-sans), sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "rgba(255,255,255,0.55)",
    marginBottom: "0.35rem",
    display: "block",
    letterSpacing: "0.03em",
  };

  return (
    <section
      id="cta"
      ref={ref}
      aria-labelledby="cta-heading"
      style={{
        background: "linear-gradient(170deg, var(--green-900) 0%, var(--soil-900) 100%)",
        padding: "5.5rem 0 6rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative grain */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,137,58,0.08), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4rem",
          alignItems: "start",
          position: "relative",
          zIndex: 2,
        }}
        className="cta-grid"
      >
        {/* Left: farmer CTA */}
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
            For farmers
          </div>

          <h2
            id="cta-heading"
            className="fade-up"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)",
              color: "#fff",
              lineHeight: 1.25,
              marginBottom: "1rem",
            }}
          >
            Register your
            <br />
            <em style={{ color: "var(--gold-300)", fontStyle: "italic" }}>
              farming plot
            </em>
          </h2>

          <p
            className="fade-up"
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.5)",
              marginBottom: "2rem",
              maxWidth: "42ch",
            }}
          >
            Enter your details to register. Your farmer ID and season ID will be
            generated and stored securely in our database.
          </p>

          {state === "success" && result ? (
            <div
              style={{
                background: "rgba(107,174,133,0.12)",
                border: "1px solid rgba(107,174,133,0.3)",
                borderRadius: "10px",
                padding: "1.75rem",
                textAlign: "left",
                opacity: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <span style={{ fontSize: "1.5rem", color: "var(--green-300)" }}>✓</span>
                <span
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "var(--green-300)",
                  }}
                >
                  Registration successful!
                </span>
              </div>

              <p
                style={{
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: "1.25rem",
                }}
              >
                Welcome, <strong>{form.name}</strong>! Your farm plot in {form.district} has been registered. You can now view personalized agricultural decisions, monsoon weather alerts, and crop market guidance.
              </p>

              <div
                style={{
                  fontSize: "0.85rem",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  padding: "0.85rem 1rem",
                  color: "var(--gold-300)",
                  marginBottom: "1.25rem",
                }}
              >
                <div><strong style={{ color: "#fff" }}>Profile:</strong> Active Registered Farm</div>
                <div><strong style={{ color: "#fff" }}>District:</strong> {form.district}</div>
                <div><strong style={{ color: "#fff" }}>Active Season:</strong> Kharif 2026</div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                }}
              >
                <Link
                  href="/farmer/dashboard"
                  id="cta-go-to-dashboard"
                  style={{
                    display: "block",
                    textAlign: "center",
                    background: "var(--gold-500)",
                    color: "var(--green-900)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.75rem 1rem",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    textDecoration: "none",
                    transition: "background 0.2s, transform 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--gold-300)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--gold-500)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  Go to My Farm →
                </Link>

                <button
                  onClick={() => {
                    setResult(null);
                    setError(null);
                    setState("idle");
                    setForm({ name: "", phone: "", district: "", language: "hi", password: "", confirm_password: "" });
                  }}
                  style={{
                    background: "transparent",
                    color: "var(--green-300)",
                    border: "1px solid var(--green-300)",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = "rgba(107,174,133,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = "transparent";
                  }}
                >
                  Register another farmer
                </button>
                <Link
                  href="/admin/login"
                  style={{
                    display: "block",
                    textAlign: "center",
                    background: "transparent",
                    color: "var(--gold-300)",
                    border: "1px solid var(--gold-300)",
                    borderRadius: "6px",
                    padding: "0.5rem 1rem",
                    fontSize: "0.8125rem",
                    textDecoration: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(218, 165, 63, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  Go to Admin Dashboard →
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="fade-up"
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
              aria-label="Farmer registration form"
            >
              {(error || state === "error") && (
                <div
                  style={{
                    background: "rgba(220, 53, 69, 0.15)",
                    border: "1px solid rgba(220, 53, 69, 0.4)",
                    borderRadius: "6px",
                    padding: "0.75rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "#ff8080",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                  }}
                >
                  ⚠️ Registration failed. Please try again.
                  {error && (
                    <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "#ffa0a0" }}>
                      {error}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="farmer-name" style={labelStyle}>
                  Full name
                </label>
                <input
                  id="farmer-name"
                  type="text"
                  required
                  disabled={state === "submitting"}
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                  onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "var(--gold-500)")}
                  onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)")}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label htmlFor="farmer-phone" style={labelStyle}>
                    Mobile number
                  </label>
                  <input
                    id="farmer-phone"
                    type="tel"
                    required
                    disabled={state === "submitting"}
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    style={inputStyle}
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "var(--gold-500)")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)")}
                  />
                </div>
                <div>
                  <label htmlFor="farmer-district" style={labelStyle}>
                    District
                  </label>
                  <input
                    id="farmer-district"
                    type="text"
                    required
                    disabled={state === "submitting"}
                    placeholder="e.g. Nashik"
                    value={form.district}
                    onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                    style={inputStyle}
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "var(--gold-500)")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)")}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="farmer-language" style={labelStyle}>
                  Preferred language
                </label>
                <select
                  id="farmer-language"
                  disabled={state === "submitting"}
                  value={form.language}
                  onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "var(--gold-500)")}
                  onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)")}
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code} style={{ background: "var(--green-900)" }}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <label htmlFor="farmer-password" style={labelStyle}>
                      Password (min 8 chars)
                    </label>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      id="farmer-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      disabled={state === "submitting"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      style={{ ...inputStyle, paddingRight: "2.5rem" }}
                      onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "var(--gold-500)")}
                      onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "0.5rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="farmer-confirm-password" style={labelStyle}>
                    Confirm Password
                  </label>
                  <input
                    id="farmer-confirm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    disabled={state === "submitting"}
                    placeholder="••••••••"
                    value={form.confirm_password}
                    onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
                    style={inputStyle}
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "var(--gold-500)")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)")}
                  />
                </div>
              </div>
              <button
                type="submit"
                id="cta-farmer-submit"
                disabled={state === "submitting"}
                style={{
                  background: state === "submitting" ? "var(--gold-700)" : "var(--gold-500)",
                  color: "var(--green-900)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: state === "submitting" ? "wait" : "pointer",
                  transition: "background 0.2s, transform 0.15s",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  opacity: state === "submitting" ? 0.75 : 1,
                }}
                onMouseEnter={(e) => {
                  if (state !== "submitting") {
                    (e.target as HTMLElement).style.background = "var(--gold-300)";
                    (e.target as HTMLElement).style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (state !== "submitting") {
                    (e.target as HTMLElement).style.background = "var(--gold-500)";
                    (e.target as HTMLElement).style.transform = "translateY(0)";
                  }
                }}
              >
                {state === "submitting" ? "Registering..." : "Register your plot →"}
              </button>
            </form>
          )}
        </div>

        {/* Right: partner/FPO CTA */}
        <div>
          <div
            className="fade-up"
            style={{
              fontSize: "0.6875rem",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.12em",
              color: "var(--green-300)",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            For partners, FPOs & agri-ops
          </div>

          <h3
            className="fade-up"
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              color: "#fff",
              lineHeight: 1.25,
              marginBottom: "1rem",
            }}
          >
            Access the ops
            <br />
            <em style={{ color: "var(--green-300)", fontStyle: "italic" }}>
              dashboard and admin panel.
            </em>
          </h3>

          <p
            className="fade-up"
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.5)",
              marginBottom: "2rem",
              maxWidth: "40ch",
            }}
          >
            See the full farmer registry, filter by district or language, view
            individual farmer details, and manage registrations through the
            protected admin dashboard.
          </p>

          <div
            className="fade-up"
            style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
          >
            {[
              {
                id: "cta-dashboard",
                label: "Request dashboard access",
                sub: "For FPOs and agri-ops teams",
                primary: true,
              },
              {
                id: "cta-demo",
                label: "Schedule a demo",
                sub: "45-minute walkthrough with the engineering team",
                primary: false,
              },
            ].map((btn) => (
              <a
                key={btn.id}
                href={`mailto:partners@krishiagent.in?subject=${encodeURIComponent(btn.label)}`}
                id={btn.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                  padding: "1rem 1.25rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  border: btn.primary
                    ? "1.5px solid rgba(107,174,133,0.4)"
                    : "1.5px solid rgba(255,255,255,0.12)",
                  background: btn.primary
                    ? "rgba(107,174,133,0.08)"
                    : "rgba(255,255,255,0.04)",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = btn.primary
                    ? "rgba(107,174,133,0.7)"
                    : "rgba(255,255,255,0.25)";
                  el.style.background = btn.primary
                    ? "rgba(107,174,133,0.14)"
                    : "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = btn.primary
                    ? "rgba(107,174,133,0.4)"
                    : "rgba(255,255,255,0.12)";
                  el.style.background = btn.primary
                    ? "rgba(107,174,133,0.08)"
                    : "rgba(255,255,255,0.04)";
                }}
              >
                <span
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    color: btn.primary ? "var(--green-300)" : "#fff",
                  }}
                >
                  {btn.label} →
                </span>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.38)" }}>
                  {btn.sub}
                </span>
              </a>
            ))}
          </div>

          {/* Stack badges */}
          <div
            className="fade-up"
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: "0.6875rem",
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                marginBottom: "0.75rem",
              }}
            >
              Tech stack
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {["MongoDB", "FastAPI", "Next.js", "Python 3.12", "JWT Auth"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: "0.625rem",
                    color: "rgba(255,255,255,0.4)",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "4px",
                    padding: "0.2rem 0.5rem",
                    letterSpacing: "0.04em",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .cta-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
