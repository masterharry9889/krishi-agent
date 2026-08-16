"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  adminLogin,
  getAdminToken,
  AdminLoginResponse,
  ApiError,
} from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      router.replace("/admin");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp: AdminLoginResponse = await adminLogin(username, password);
      // Store token and redirect
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_token", resp.access_token);
      }
      router.replace("/admin");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(170deg, var(--green-900) 0%, var(--soil-900) 100%)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "12px",
          padding: "2.5rem",
          backdropFilter: "blur(8px)",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-instrument-serif), Georgia, serif",
            fontSize: "1.5rem",
            color: "#fff",
            marginBottom: "0.25rem",
          }}
        >
          Admin Login
        </h1>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "rgba(255, 255, 255, 0.5)",
            marginBottom: "1.5rem",
          }}
        >
          Enter your credentials to access the farmer registry.
        </p>

        {error && (
          <div
            style={{
              background: "rgba(220, 53, 69, 0.15)",
              border: "1px solid rgba(220, 53, 69, 0.4)",
              borderRadius: "6px",
              padding: "0.625rem 0.875rem",
              fontSize: "0.8125rem",
              color: "#ff8080",
              marginBottom: "1rem",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              htmlFor="admin-username"
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.55)",
                marginBottom: "0.35rem",
                display: "block",
              }}
            >
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              required
              disabled={loading}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "7px",
                fontSize: "0.875rem",
                color: "#fff",
                outline: "none",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="admin-password"
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.55)",
                marginBottom: "0.35rem",
                display: "block",
              }}
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "7px",
                fontSize: "0.875rem",
                color: "#fff",
                outline: "none",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "var(--gold-700)" : "var(--gold-500)",
              color: "var(--green-900)",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {loading ? "Logging in..." : "Login →"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            fontSize: "0.6875rem",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            color: "rgba(255, 255, 255, 0.3)",
          }}
        >
          Protected admin area — Krishi Agent v0.1
        </div>
      </div>
    </div>
  );
}
