"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminLogin, getAdminToken, setAdminToken, ApiError } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect if already logged in
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
      const resp = await adminLogin(username, password);
      if (resp.access_token) {
        setAdminToken(resp.access_token);
        router.replace("/admin");
      } else {
        setError("Invalid token received from server.");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-800 via-stone-900 to-black flex items-center justify-center p-4 font-sans text-stone-100">
      <div className="w-full max-w-md bg-stone-900/90 border border-amber-900/40 rounded-2xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-emerald-600 to-amber-500" />

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-900/80 border border-amber-500/30 flex items-center justify-center shadow-inner">
            <svg
              className="w-7 h-7 text-amber-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-serif font-bold text-amber-100 tracking-tight">
            Krishi Agent Admin
          </h1>
          <p className="text-xs text-stone-400 mt-1 font-sans">
            Farmer Registry & Onboarding Portal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start space-x-2.5 animate-in fade-in duration-150">
            <svg
              className="w-4 h-4 text-rose-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="admin-username"
              className="block text-xs font-medium uppercase tracking-wider text-amber-200/80 mb-1.5"
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
              className="w-full px-4 py-2.5 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
              placeholder="Enter admin username"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-medium uppercase tracking-wider text-amber-200/80 mb-1.5"
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
              className="w-full px-4 py-2.5 bg-stone-800/80 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
              placeholder="Enter admin password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm rounded-xl transition duration-150 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin text-stone-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            <span>{loading ? "Authenticating..." : "Sign in →"}</span>
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-stone-800 text-center text-[11px] text-stone-500 font-mono">
          Protected System — Krishi Agent Admin v1.0
        </div>
      </div>
    </div>
  );
}
