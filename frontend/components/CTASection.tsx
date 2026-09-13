"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  onboardFarmer,
  OnboardPayload,
  OnboardResponse,
  ApiError,
} from "@/lib/api";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
      { threshold: 0.1 }
    );
    ref.current?.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));
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
        setError("Registration failed. Please check network connection.");
      }
      setState("error");
    }
  };

  return (
    <section
      id="cta"
      ref={ref}
      aria-labelledby="cta-heading"
      className="py-16 sm:py-24 bg-background relative border-b border-border/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Value Proposition & Security Guarantees */}
          <div className="lg:col-span-6 space-y-6">
            <div className="fade-up inline-flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
                Acreage Registration
              </span>
            </div>

            <h2
              id="cta-heading"
              className="fade-up delay-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            >
              Start season-long multi-agent advisory today.
            </h2>

            <p className="fade-up delay-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Register your land in under 60 seconds. Our agents will query your district&apos;s Soil
              Health Card baseline, cross-reference upcoming Kharif mandi forecasts, and generate
              your personalized agronomic plan.
            </p>

            <div className="fade-up delay-3 space-y-3 pt-2">
              {[
                {
                  title: "Direct Government Registry Sync",
                  desc: "Automatic linking with 3,000+ APMC mandis, Soil Health Card API, and official PMFBY cutoff dates.",
                },
                {
                  title: "Strict Data Confidentiality",
                  desc: "Zero commercial data brokering; ISO 27001 & Digital Personal Data Protection (DPDP) Act 2023 compliant encrypted storage.",
                },
                {
                  title: "Zero Setup Cost",
                  desc: "100% subsidized open access for smallholder farmers under 5 acres and registered FPO member collectives.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="size-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 text-primary">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Acreage Trust Card */}
            <div className="fade-up pt-3">
              <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[16/9] rounded-xl overflow-hidden border border-border/80 shadow-xs">
                <Image
                  src="/images/farmer-thriving.jpg"
                  alt="Indian farmer holding healthy harvested produce in sunny agricultural field"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                  className="object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex items-end p-4 sm:p-5">
                  <div className="text-white space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-white">Empowering Smallholder Acreages</span>
                      <Badge className="bg-[#D8A94F] text-[#1A241B] text-[10px] font-mono font-bold">12 Agronomic Zones</Badge>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      From Nashik onions to Malwa soybeans — autonomous agronomic guidance across every harvest milestone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Registration Card */}
          <div className="lg:col-span-6 fade-up delay-2">
            <div className="rounded-lg border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
              {state === "success" && result ? (
                <div className="space-y-4 py-3">
                  <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 mx-auto">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold text-foreground">
                      Registration Complete!
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Your farmer account is initialized and authenticated.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-md bg-secondary/50 border border-border/60 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Farmer Name:</span>
                      <span className="font-semibold text-foreground">{form.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Farmer ID:</span>
                      <span className="font-mono font-semibold text-primary">{result.farmer_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">District:</span>
                      <span className="text-foreground">{form.district}</span>
                    </div>
                  </div>

                  <Link href="/farmer/dashboard" className="block w-full">
                    <Button size="lg" className="w-full font-semibold gap-2">
                      Enter Farm Dashboard
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">
                      Register Farmer Profile
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      All fields are required to calibrate agronomic calculations.
                    </p>
                  </div>

                  {state === "error" && error && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="farmer-name" className="text-xs font-medium text-foreground">
                        Full Name
                      </label>
                      <Input
                        id="farmer-name"
                        placeholder="e.g. Ramesh Patil"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="farmer-phone" className="text-xs font-medium text-foreground">
                        Mobile Number (10 digits)
                      </label>
                      <Input
                        id="farmer-phone"
                        type="tel"
                        placeholder="9876543210"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        pattern="[0-9]{10}"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="farmer-district" className="text-xs font-medium text-foreground">
                        District
                      </label>
                      <Input
                        id="farmer-district"
                        placeholder="e.g. Nashik"
                        value={form.district}
                        onChange={(e) => setForm({ ...form, district: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="farmer-language" className="text-xs font-medium text-foreground">
                        Preferred Language
                      </label>
                      <select
                        id="farmer-language"
                        value={form.language}
                        onChange={(e) => setForm({ ...form, language: e.target.value })}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                      >
                        <option value="hi">हिन्दी (Hindi)</option>
                        <option value="mr">मराठी (Marathi)</option>
                        <option value="ta">தமிழ் (Tamil)</option>
                        <option value="te">తెలుగు (Telugu)</option>
                        <option value="kn">ಕನ್ನಡ (Kannada)</option>
                        <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                        <option value="gu">ગુજરાતી (Gujarati)</option>
                        <option value="bn">বাংলা (Bengali)</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="farmer-password" className="text-xs font-medium text-foreground">
                        Password (8+ characters)
                      </label>
                      <div className="relative">
                        <Input
                          id="farmer-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Min. 8 characters"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          minLength={8}
                          required
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

                    <div className="space-y-1.5">
                      <label htmlFor="farmer-confirm-password" className="text-xs font-medium text-foreground">
                        Confirm Password
                      </label>
                      <Input
                        id="farmer-confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={form.confirm_password}
                        onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                        minLength={8}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    id="cta-submit"
                    size="lg"
                    disabled={state === "submitting"}
                    className="w-full font-semibold mt-2"
                  >
                    {state === "submitting" ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Initializing Agronomic State...
                      </>
                    ) : (
                      <>
                        Complete Acreage Registration
                        <ArrowRight className="size-4 ml-1" />
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-1">
                    <Link
                      href="/farmer/login"
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Already registered? Sign in to your Farm Dashboard →
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
