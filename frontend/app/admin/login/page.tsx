"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminLogin, getAdminToken, setAdminToken, ApiError } from "@/lib/api";
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
  User,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        setError("Invalid token received from authentication server.");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid administrator username or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-foreground">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
          <div className="size-7 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-2xs">
            <Wheat className="size-4" />
          </div>
          <span>Krishi Agent</span>
        </Link>
        <Link href="/farmer/login">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            Farmer Portal →
          </Button>
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="rounded-lg border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-[10px] font-mono">
                <ShieldCheck className="size-3 mr-1 text-primary" />
                Administrative Access
              </Badge>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Sign In to Admin Portal
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Restricted portal for agronomists, KVK coordinators, and district registry officers.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-username" className="text-xs font-medium text-foreground">
                Administrator Username
              </label>
              <Input
                id="admin-username"
                type="text"
                required
                disabled={loading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-xs font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full font-semibold mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  Enter Admin Workspace
                  <ArrowRight className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-border/60 text-center">
            <span className="text-[11px] text-muted-foreground font-mono">
              Role-Based Access Controlled • Session Activity Audited
            </span>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="max-w-6xl w-full mx-auto text-center text-muted-foreground text-[11px] font-mono">
        Krishi Agent Enterprise Security • Authorized Personnel Only
      </div>
    </div>
  );
}
