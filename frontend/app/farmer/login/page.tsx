"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { farmerLogin, setupFarmerPassword, ApiError } from "@/lib/api";
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
          setError("This account requires initial password setup. Enter your new password below.");
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
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <div className="size-7 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <Wheat className="size-4" />
          </div>
          <span>Krishi Agent</span>
        </Link>
        <Link href="/admin/login">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            Admin Access →
          </Button>
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="rounded-lg border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-[10px] font-mono">
                Farmer Authentication
              </Badge>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {needsPasswordSetup ? "Set Account Password" : "Sign In to Farm Dashboard"}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {needsPasswordSetup
                ? "Enter an 8+ character password to complete your account setup."
                : "Enter your registered 10-digit mobile number and password."}
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
              <label htmlFor="login-phone" className="text-xs font-medium text-foreground">
                Mobile Number
              </label>
              <div className="relative">
                <Input
                  id="login-phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  pattern="[0-9]{10}"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-foreground">
                {needsPasswordSetup ? "New Password (8+ characters)" : "Password"}
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={needsPasswordSetup ? 8 : undefined}
                  required
                  disabled={loading}
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

            {needsPasswordSetup && (
              <div className="space-y-1.5">
                <label htmlFor="login-confirm-password" className="text-xs font-medium text-foreground">
                  Confirm Password
                </label>
                <Input
                  id="login-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full font-semibold mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {needsPasswordSetup ? "Save Password & Sign In" : "Sign In to Farm"}
                  <ArrowRight className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-border/60 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an acreage profile yet?{" "}
              <Link href="/#cta" className="text-primary font-medium hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="max-w-6xl w-full mx-auto text-center text-muted-foreground text-[11px] font-mono">
        Krishi Agent Multi-Agent Telemetry • Protected by Encrypted JWT Session
      </div>
    </div>
  );
}
