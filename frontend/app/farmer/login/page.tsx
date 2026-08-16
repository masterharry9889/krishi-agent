"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { farmerLogin, setupFarmerPassword, ApiError } from "@/lib/api";

export default function FarmerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (needsPasswordSetup) {
        if (!password || password.length < 8) {
          setError("Password must be at least 8 characters long.");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Password and Confirm Password do not match.");
          setLoading(false);
          return;
        }
        await setupFarmerPassword(phone, password, confirmPassword);
      } else {
        await farmerLogin(phone, password);
      }
      router.push("/farmer/dashboard");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.message.includes("Password setup required")) {
          setNeedsPasswordSetup(true);
          setError("This account requires a password setup. Please set your new password below.");
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid mobile number or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, var(--green-900) 0%, var(--soil-900) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: "#fff",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "14px",
          padding: "2.25rem 2rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🌾</div>
          <h1
            style={{
              fontFamily: "var(--font-instrument-serif), Georgia, serif",
              fontSize: "1.875rem",
              margin: "0 0 0.4rem",
              fontWeight: 700,
            }}
          >
            {needsPasswordSetup ? "Set Up Account Password" : "Farmer Login"}
          </h1>
          <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)", margin: 0 }}>
            {needsPasswordSetup
              ? "Create a 8+ character password to secure your farm account."
              : "Enter your registered mobile number and password."}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: needsPasswordSetup ? "rgba(255, 193, 7, 0.15)" : "rgba(220, 53, 69, 0.15)",
              border: needsPasswordSetup ? "1px solid rgba(255, 193, 7, 0.4)" : "1px solid rgba(220, 53, 69, 0.4)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.85rem",
              color: needsPasswordSetup ? "#ffd54f" : "#ffa0a0",
              marginBottom: "1.25rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label
              htmlFor="mobile-phone"
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.6)",
                marginBottom: "0.4rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Registered Mobile Number
            </label>
            <input
              id="mobile-phone"
              type="tel"
              required
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                background: "rgba(255, 255, 255, 0.07)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.95rem",
                outline: "none",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label
                htmlFor="login-password"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {needsPasswordSetup ? "New Password (min 8 chars)" : "Password"}
              </label>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem 2.5rem 0.75rem 1rem",
                  background: "rgba(255, 255, 255, 0.07)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {needsPasswordSetup && (
            <div>
              <label
                htmlFor="confirm-login-password"
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.6)",
                  marginBottom: "0.4rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Confirm Password
              </label>
              <input
                id="confirm-login-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(255, 255, 255, 0.07)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "var(--gold-700)" : "var(--gold-500)",
              color: "var(--green-900)",
              border: "none",
              borderRadius: "8px",
              padding: "0.85rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              transition: "background 0.2s",
              fontFamily: "var(--font-dm-sans), sans-serif",
              marginTop: "0.5rem",
            }}
          >
            {loading ? "Authenticating..." : needsPasswordSetup ? "Save Password & Login →" : "Login →"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          New farmer?{" "}
          <Link href="/#cta" style={{ color: "var(--gold-300)", fontWeight: 600, textDecoration: "none" }}>
            Register your plot here →
          </Link>
        </div>
      </div>
    </div>
  );
}
