"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getFarmerToken,
  clearFarmerToken,
  getFarmerContext,
  getFarmerInsight,
  orchestrateFarmAnalysis,
  DASHBOARD_REQUIRED_AGENTS,
  submitFarmerFeedback,
  FarmerContextResponse,
  FarmerInsight,
  FarmerFeedbackPayload,
  ApiError,
} from "@/lib/api";
import { AGENT_REGISTRY } from "@/lib/agents";
import {
  Wheat,
  MessageCircle,
  LogOut,
  CalendarDays,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  TrendingUp,
  IndianRupee,
  Star,
  ChevronDown,
  ChevronUp,
  Bot,
  Loader2,
  CheckCircle2,
  CircleDot,
  MapPin,
  Droplets,
  Sun,
  BarChart3,
  Sprout,
  Send,
  ShieldCheck,
  ArrowRight,
  Camera,
  Activity,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AgentState {
  status: "idle" | "running" | "success" | "error" | "blocked";
  result: unknown | null;
  error: string | null;
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  soil: <Droplets className="size-3.5" />,
  weather: <Sun className="size-3.5" />,
  market_intelligence: <BarChart3 className="size-3.5" />,
  crop_recommendation: <Sprout className="size-3.5" />,
  irrigation: <Droplets className="size-3.5" />,
  budget_estimator: <IndianRupee className="size-3.5" />,
  input_verification: <ShieldCheck className="size-3.5" />,
  scheme_insurance: <ShieldCheck className="size-3.5" />,
  credit: <IndianRupee className="size-3.5" />,
  crop_monitoring: <Activity className="size-3.5" />,
  advisory: <Sparkles className="size-3.5" />,
  storage_sell_timing: <TrendingUp className="size-3.5" />,
  market_linkage: <BarChart3 className="size-3.5" />,
  feedback: <Star className="size-3.5" />,
};

const DEFAULT_PRIORITIES = [
  {
    title: "Soil Moisture at 14% — Below 22% Agronomic Threshold",
    reason: "Topsoil (0-15cm) moisture dropped to 14% across Plot #MH-NSK-0847. Critical moisture stress threshold for Kharif soybean in R3/R4 pod development is 22%.",
    recommended_action: "Initiate 2.5-hour scheduled drip cycle before 11:00 AM to prevent flower and pod abortion.",
    urgency: "critical",
    source: "IoT Sensor · SoilAgent",
  },
  {
    title: "Nitrogen Top-Dressing Window: 48h Before 32mm Rain",
    reason: "IMD Doppler radar forecasts 32mm rainfall event in Nashik within 48-72h. Current root-zone N is 284 kg/ha.",
    recommended_action: "Apply urea @ 35 kg/acre + 25 kg/ha ZnSO4 prior to rainfall for maximum root uptake without burn.",
    urgency: "high",
    source: "IMD Radar · WeatherAgent",
  },
  {
    title: "APMC Lasalgaon Modal Price ₹4,850/qtl Exceeds Target",
    reason: "Lasalgaon APMC auction modal price has crossed the ₹4,600/qtl seasonal trigger threshold (+5.4% week-on-week).",
    recommended_action: "Dispatch 40% batch (7.5 quintals) via Sinnar FPO logistics hub to capture peak price spread.",
    urgency: "medium",
    source: "Agmarknet · MarketAgent",
  },
];

function getNudgeImage(item: { title: string; reason: string; source: string }) {
  const text = (item.title + " " + item.reason + " " + item.source).toLowerCase();
  if (text.includes("soil") || text.includes("nitrogen") || text.includes("npk") || text.includes("fertilizer") || text.includes("urea")) {
    return "/images/soil-hands.jpg";
  }
  if (text.includes("market") || text.includes("mandi") || text.includes("price") || text.includes("apmc")) {
    return "/images/mandi-market.jpg";
  }
  if (text.includes("satellite") || text.includes("ndvi") || text.includes("canopy")) {
    return "/images/satellite-ndvi.jpg";
  }
  if (text.includes("water") || text.includes("irrigation") || text.includes("rain") || text.includes("drip") || text.includes("moisture")) {
    return "/images/irrigation.jpg";
  }
  if (text.includes("zinc") || text.includes("micronutrient") || text.includes("crop") || text.includes("disease")) {
    return "/images/stage-crop-selection.jpg";
  }
  return "/images/rural-field.jpg";
}

export default function FarmerDashboardPage() {
  const router = useRouter();

  const [context, setContext] = useState<FarmerContextResponse | null>(null);
  const [insight, setInsight] = useState<FarmerInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Orchestrating state
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestrationStep, setOrchestrationStep] = useState("Checking soil & weather...");

  // Collapsible states
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Agent states for technical drawer
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});

  // Feedback form state
  const [feedback, setFeedback] = useState<FarmerFeedbackPayload>({
    rating: 5,
    used_recommendation: true,
    actual_yield: undefined,
    actual_price: undefined,
    notes: "",
  });
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSuccess, setFbSuccess] = useState<string | null>(null);

  // 1. Initial Load: Auth check and fetch context
  useEffect(() => {
    const activeToken = getFarmerToken();
    if (!activeToken) {
      router.push("/farmer/login");
      return;
    }

    let ignore = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const token = getFarmerToken();
        if (!token) {
          router.push("/farmer/login");
          return;
        }

        const payloadBase64 = token.split(".")[1];
        const decoded = JSON.parse(atob(payloadBase64));
        const farmerId = decoded.farmer_id || decoded.sub;

        if (!farmerId) {
          clearFarmerToken();
          router.push("/farmer/login");
          return;
        }

        const [ctx, insRes] = await Promise.all([
          getFarmerContext(farmerId),
          getFarmerInsight(farmerId).catch(() => null),
        ]);

        if (ignore) return;
        setContext(ctx);

        if (insRes?.insight) {
          setInsight(insRes.insight);
        }

        // Initialize agent states from stored outputs
        const initStates: Record<string, AgentState> = {};
        for (const a of AGENT_REGISTRY) {
          initStates[a.key] = { status: "idle", result: null, error: null };
        }
        if (ctx.agent_outputs && Array.isArray(ctx.agent_outputs)) {
          for (const entry of ctx.agent_outputs) {
            const key = entry.agent;
            if (initStates[key]) {
              initStates[key] = {
                status: "success",
                result: { agent: key, status: "success", output: entry.output, timestamp: entry.timestamp },
                error: null,
              };
            }
          }
        }
        if (!ignore) setAgentStates(initStates);
      } catch (err: unknown) {
        if (!ignore) {
          let message = "Failed to load farmer dashboard.";
          if (err instanceof ApiError) {
            if (err.status === 401 || err.status === 403) {
              clearFarmerToken();
              router.push("/farmer/login");
              return;
            }
            message = err.message;
          } else if (err instanceof Error) {
            message = err.message;
          }
          setError(message);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [router]);

  const handleLogout = () => {
    clearFarmerToken();
    router.push("/farmer/login");
  };

  const handleAnalyzeMyFarm = async () => {
    if (!context) return;
    setOrchestrating(true);
    setError(null);

    try {
      const steps = [
        "Analyzing soil fertility & nutrient status...",
        "Checking weather & precipitation outlook...",
        "Scanning APMC mandi prices & trends...",
        "Computing optimal crop recommendations...",
        "Formulating irrigation & input budget...",
      ];

      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < steps.length) {
          setOrchestrationStep(steps[stepIdx]);
          stepIdx++;
        }
      }, 1000);

      const res = await orchestrateFarmAnalysis(
        context.farmer_id,
        context.season_id,
        true,
        DASHBOARD_REQUIRED_AGENTS
      );
      clearInterval(interval);

      setInsight(res.insight);
      setContext(res.context);

      if (res.context?.agent_outputs) {
        const nextStates: Record<string, AgentState> = {};
        for (const a of AGENT_REGISTRY) {
          nextStates[a.key] = { status: "idle", result: null, error: null };
        }
        for (const entry of res.context.agent_outputs) {
          const key = entry.agent;
          if (nextStates[key]) {
            nextStates[key] = {
              status: "success",
              result: { agent: key, status: "success", output: entry.output, timestamp: entry.timestamp },
              error: null,
            };
          }
        }
        setAgentStates(nextStates);
      }
    } catch (err: unknown) {
      let message = "Farm analysis failed. Please try again.";
      if (err instanceof ApiError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setOrchestrating(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setFbSubmitting(true);
    setFbSuccess(null);
    try {
      const res = await submitFarmerFeedback(context.farmer_id, context.season_id, feedback);
      setFbSuccess(res.message || "Thank you! Your feedback has been recorded.");
    } catch (err: unknown) {
      let message = "Feedback submission failed.";
      if (err instanceof ApiError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setFbSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            Synchronizing farm telemetry & state...
          </p>
        </div>
      </div>
    );
  }

  if (error && !context) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="size-10 text-destructive mx-auto" />
            <h2 className="text-base font-bold text-foreground">Dashboard Synchronization Error</h2>
            <p className="text-xs text-destructive">{error}</p>
            <Button variant="default" onClick={() => router.push("/farmer/login")}>
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = context?.profile;
  const cropDec = insight?.crop_decision;
  const marketDec = insight?.market_decision;
  const finSnap = insight?.financial_snapshot;
  const activePriorities =
    insight?.priorities && insight.priorities.length > 0
      ? insight.priorities
      : DEFAULT_PRIORITIES;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Sticky Header */}
      <header className="bg-background/90 backdrop-blur-md border-b border-border/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="size-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0"
              title="Return to Home"
            >
              <Wheat className="size-4.5" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
                  {profile?.name || "Ramesh Patil"}
                </h1>
                <Badge variant="neutral" className="text-[10px] font-mono hidden sm:inline-flex">
                  Plot #{context?.farmer_id || "MH-NSK-0847"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                <MapPin className="size-3 shrink-0 text-primary" />
                <span>{profile?.district || "Nashik"}, Maharashtra</span>
                <span>•</span>
                <span className="font-mono">{profile?.land_size || 4.2} Acres</span>
                <span>•</span>
                <span className="uppercase font-mono">{profile?.language || "mr"} (Marathi)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="hidden sm:inline-flex text-xs font-medium">
              <CalendarDays className="size-3 mr-1.5" />
              Kharif 2026
            </Badge>

            <Link href={context ? `/farmer/${context.farmer_id}/chat` : "/farmer/login"}>
              <Button size="sm" variant="accent" className="font-semibold text-xs">
                <MessageCircle className="size-3.5" />
                <span className="hidden sm:inline">AI Advisory Chat</span>
                <span className="sm:hidden">Chat</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              title="Sign Out"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Season Lifecycle Stage Counter */}
        <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <span className="text-xs sm:text-sm font-bold text-foreground">
                Season Lifecycle: Day 68 of 120 · Pod Development & Grain Filling Stage
              </span>
              <Badge variant="warning" className="text-[10px] font-mono uppercase">
                Kharif 2026
              </Badge>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              57% Completed · Est. Harvest: 15–20 Oct 2026
            </span>
          </div>

          {/* Visual Progress Bar with Milestones */}
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden border border-border/60">
              <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: "57%" }} />
            </div>
            <div className="grid grid-cols-4 text-[10px] sm:text-[11px] font-mono text-muted-foreground">
              <div>
                <span className="text-foreground font-semibold">Day 1 (05 Jun)</span>
                <span className="block text-[9px] text-muted-foreground/80">Sowing & Soil Prep</span>
              </div>
              <div>
                <span className="text-foreground font-semibold">Day 25 (30 Jun)</span>
                <span className="block text-[9px] text-muted-foreground/80">Vegetative (V4)</span>
              </div>
              <div className="text-primary font-bold">
                <span>Day 68 (Today)</span>
                <span className="block text-[9px] text-primary/80">Pod Fill (R4)</span>
              </div>
              <div className="text-right">
                <span className="text-foreground font-semibold">Day 120 (05 Oct)</span>
                <span className="block text-[9px] text-muted-foreground/80">Mandi Harvest</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Farmland Command Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-border/80 shadow-md">
          <Image
            src="/images/hero-field.jpg"
            alt="Farmland golden hour field landscape"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/45"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30"
          />

          <div className="relative z-10 p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[#D8A94F] text-[10px] font-mono font-semibold uppercase tracking-wider">
                  <Sparkles className="size-3 text-[#D8A94F]" />
                  Multi-Agent Pipeline
                </span>
                <span className="text-[11px] font-mono text-white/70">
                  Season ID: {context?.season_id || "KH-2026-NSK-0847"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold tracking-tight text-white leading-tight">
                Instant Agronomic & Market Diagnostic
              </h2>
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                Triggers synchronous pipeline execution across Soil Health Card data, 7-day IMD forecasts,
                and live APMC mandi arrival volumes to recalculate optimal crop and input recommendations.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button
                onClick={handleAnalyzeMyFarm}
                disabled={orchestrating}
                size="lg"
                className="bg-[#D8A94F] hover:bg-[#c6983e] text-[#1A241B] font-bold shadow-lg transition-all rounded-xl cursor-pointer"
              >
                {orchestrating ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    <span className="text-xs truncate max-w-[160px]">{orchestrationStep}</span>
                  </>
                ) : (
                  <>
                    <Wheat className="size-4 mr-2 text-[#1A241B]" />
                    Analyze My Farm
                  </>
                )}
              </Button>

              <Link href={context ? `/farmer/${context.farmer_id}/chat` : "/farmer/login"}>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto font-medium border-white/30 bg-white/15 hover:bg-white/25 text-white rounded-xl backdrop-blur-md cursor-pointer"
                >
                  <Camera className="size-4 mr-2 text-white" />
                  Leaf Photo Scan
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Today's Actionable Nudges */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              Priorities & Actionable Field Nudges
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground">
              {activePriorities.length} active alerts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePriorities.map((item, idx) => {
              const isCritical = item.urgency === "critical";
              const isHigh = item.urgency === "high";
              const img = getNudgeImage(item);
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  {/* Visual Nudge Thumbnail */}
                  <div className="relative w-full h-32 overflow-hidden border-b border-border/60">
                    <Image
                      src={img}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
                      className="object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-3">
                      <div className="flex items-center justify-between w-full">
                        <Badge
                          variant={isCritical ? "destructive" : isHigh ? "warning" : "success"}
                          className="text-[10px] font-mono uppercase font-semibold shadow-xs"
                        >
                          {item.urgency} Urgency
                        </Badge>
                        <span className="text-[10px] font-mono text-white/90 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded border border-white/20 truncate max-w-[140px]">
                          {item.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.reason}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-secondary/60 border border-border/60 text-xs flex items-start gap-2 mt-2">
                      <ArrowRight className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground font-medium">{item.recommended_action}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Recommended Crop Decision */}
        {cropDec?.recommended_crop && (
          <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/60">
                  <div className="space-y-1">
                    <Badge variant="neutral" className="text-[10px] font-mono text-primary border-primary/30 bg-primary/5">
                      <Sprout className="size-3 mr-1 text-primary" />
                      Optimal Agronomic Match
                    </Badge>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                      {cropDec.recommended_crop}
                      {cropDec.varieties && cropDec.varieties.length > 0 && (
                        <span className="text-xs font-normal font-sans text-muted-foreground ml-2">
                          Varieties: {cropDec.varieties.join(", ")}
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-primary num-tabular">
                      {Math.round((cropDec.suitability_score || 0.85) * 100)}%
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      Est. Lifecycle: {cropDec.expected_duration_days || 120} days
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {cropDec.why_crop}
                </p>
              </div>

              {/* Crop Photographic Showcase */}
              <div className="lg:col-span-4 relative aspect-video lg:aspect-[4/3] rounded-xl overflow-hidden border border-border/70 shadow-2xs">
                <Image
                  src="/images/stage-crop-selection.jpg"
                  alt={`Thriving field crops matching ${cropDec.recommended_crop}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 400px"
                  className="object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3.5">
                  <div className="text-white text-xs w-full flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      Field-Verified Variety
                    </span>
                    <span className="text-[10px] font-mono bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded border border-white/20 text-emerald-300">
                      High Yield Potential
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Factor breakdown toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setWhyExpanded(!whyExpanded)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                {whyExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {whyExpanded ? "Collapse Factor Weights" : "Inspect Factor Weight Breakdown"}
              </button>

              {whyExpanded && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60">
                  <div className="p-3 rounded-md bg-secondary/50 border border-border/60 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1.5">
                      <Droplets className="size-3 text-blue-600 dark:text-blue-400" />
                      Soil Compatibility
                    </div>
                    <p className="text-xs text-foreground font-medium">{cropDec.factors?.soil}</p>
                  </div>

                  <div className="p-3 rounded-md bg-secondary/50 border border-border/60 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1.5">
                      <Sun className="size-3 text-amber-600 dark:text-amber-400" />
                      Precipitation / Weather Fit
                    </div>
                    <p className="text-xs text-foreground font-medium">{cropDec.factors?.weather}</p>
                  </div>

                  <div className="p-3 rounded-md bg-secondary/50 border border-border/60 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />
                      APMC Market Realization
                    </div>
                    <p className="text-xs text-foreground font-medium">{cropDec.factors?.market}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Asymmetric Bento: Market & Financial Realization with Photography */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Market Intelligence Box (7 cols) */}
          <div className="lg:col-span-7 rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs flex flex-col justify-between">
            {/* Contextual Market Photo Header */}
            <div className="relative w-full h-32 overflow-hidden border-b border-border/60">
              <Image
                src="/images/mandi-market.jpg"
                alt="Agricultural APMC Mandi wholesale market trading"
                fill
                sizes="(max-width: 1024px) 100vw, 700px"
                className="object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex items-end p-3.5">
                <div className="flex items-center justify-between w-full text-white">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-[#D8A94F]" />
                    APMC Market Realization & Sell-Timing
                  </span>
                  {marketDec?.recommendation_type && (
                    <Badge className="bg-[#D8A94F] text-[#1A241B] font-mono text-[10px] font-bold">
                      {marketDec.recommendation_type}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 flex-1">
              {marketDec?.mandi ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground">Primary Benchmark Mandi:</span>
                      <h4 className="text-base font-bold text-foreground">{marketDec.mandi}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-bold font-mono text-foreground num-tabular">
                        ₹{marketDec.modal_price_inr}
                        <span className="text-xs font-normal text-muted-foreground">/qtl</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        Live Modal Price
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {marketDec.reasoning}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Run farm analysis to sync APMC mandi modal prices.
                </p>
              )}
            </div>
          </div>

          {/* Financial Ledger Snapshot (5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs flex flex-col justify-between">
            {/* Contextual Financial Ledger Photo Header */}
            <div className="relative w-full h-32 overflow-hidden border-b border-border/60">
              <Image
                src="/images/irrigation.jpg"
                alt="Precision agricultural resource allocation"
                fill
                sizes="(max-width: 1024px) 100vw, 500px"
                className="object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex items-end p-3.5">
                <div className="flex items-center justify-between w-full text-white">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <IndianRupee className="size-3.5 text-emerald-400" />
                    Input Costing & Margin Ledger
                  </span>
                  <Badge className="bg-black/50 backdrop-blur-xs text-white border border-white/20 font-mono text-[10px]">
                    Working Capital
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 flex-1">
              {finSnap ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/60 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      Est. Input Cost
                    </span>
                    <div className="text-lg font-bold font-mono text-foreground num-tabular">
                      ₹{finSnap.estimated_input_cost_inr?.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Seeds, fertilizers, diesel
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/60 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      Expected Margin
                    </span>
                    <div className="text-lg font-bold font-mono text-primary num-tabular">
                      ₹{finSnap.expected_net_margin_inr?.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Net after input overhead
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Run analysis to formulate working capital estimates.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 5. Farmer Season Feedback & Harvest Logging */}
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            <div className="lg:col-span-4 relative aspect-video lg:aspect-auto min-h-[160px] overflow-hidden border-b lg:border-b-0 lg:border-r border-border/60">
              <Image
                src="/images/harvest-calibrate.jpg"
                alt="Farmer holding harvested crop grains"
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 flex items-end p-4">
                <div className="text-white space-y-1">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Star className="size-3.5 text-[#D8A94F]" />
                    Harvest Calibration Ground-Truth
                  </span>
                  <p className="text-[11px] text-white/80 leading-relaxed">
                    Recording actual harvested yield and weighbridge realization updates the district checkpointer baseline for next season.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  Log Season Harvest & Actual Realization
                </h3>
                <p className="text-xs text-muted-foreground">
                  Directly calibrates the <span className="font-mono text-foreground font-semibold">FeedbackAgent</span>{" "}
                  model for your land and district in next season&apos;s recommendations.
                </p>
              </div>

              {fbSuccess ? (
                <div className="p-4 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{fbSuccess}</span>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Recommendation Rating (1 to 5 Stars)
                      </label>
                      <select
                        value={feedback.rating}
                        onChange={(e) => setFeedback((f) => ({ ...f, rating: Number(e.target.value) }))}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                      >
                        {[5, 4, 3, 2, 1].map((r) => (
                          <option key={r} value={r}>
                            {r} Stars {r === 5 ? "(Highly Accurate)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Actual Harvested Yield (Quintals/Acre)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 22"
                        value={feedback.actual_yield ?? ""}
                        onChange={(e) =>
                          setFeedback((f) => ({
                            ...f,
                            actual_yield: e.target.value ? Number(e.target.value) : undefined,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Field Observations / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Note pest outbreaks, rainfall variations, or mandi broker commissions..."
                      value={feedback.notes}
                      onChange={(e) => setFeedback((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring/25 resize-vertical"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={fbSubmitting}
                    size="sm"
                    className="font-medium bg-primary text-primary-foreground"
                  >
                    {fbSubmitting ? (
                      <>
                        <Loader2 className="size-3.5 mr-2 animate-spin" />
                        Saving Harvest Records...
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5 mr-2" />
                        Submit Harvest Log
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* 6. Agronomist Diagnostic View Drawer */}
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full rounded-lg border border-border/80 bg-card p-3.5 text-xs text-muted-foreground font-medium flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 text-foreground font-semibold">
              <Bot className="size-4 text-primary" />
              Agronomist State Monitor ({AGENT_REGISTRY.length} Integrated Node Checkpoints)
            </span>
            {showTechnicalDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showTechnicalDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {AGENT_REGISTRY.map((agent) => {
                const st = agentStates[agent.key] || { status: "idle", result: null, error: null };
                return (
                  <div
                    key={agent.key}
                    className="p-3 rounded-md border border-border/60 bg-secondary/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-7 rounded bg-secondary flex items-center justify-center text-foreground shrink-0 border border-border/60">
                        {AGENT_ICONS[agent.key] || <CircleDot className="size-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {agent.display_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {agent.description}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={st.status === "success" ? "success" : st.status === "running" ? "warning" : "neutral"}
                      className="text-[10px] font-mono shrink-0 uppercase"
                    >
                      {st.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 7. Advisory Compliance Disclaimer */}
        <footer className="pt-6 border-t border-border/60">
          <div className="flex items-start gap-2.5 text-[11px] text-muted-foreground leading-relaxed max-w-4xl">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
            <p>
              <strong>Official Agricultural Advisory Disclaimer:</strong> Krishi Agent recommendations
              synthesize official Soil Health Cards, Open-Meteo micro-climate feeds, APMC mandi arrivals,
              and AI agronomic heuristics. Financial margins and yield targets are non-binding estimates.
              Always consult your local Krishi Vigyan Kendra (KVK) extension officer prior to undertaking
              major capital investments or applying restricted chemical dosages.
            </p>
          </div>
        </footer>
      </main>

      {/* Floating Action Button (Mobile Only) */}
      {context && (
        <Link
          href={`/farmer/${context.farmer_id}/chat`}
          className="fixed bottom-5 right-5 z-40 bg-primary text-primary-foreground rounded-full p-3.5 shadow-md flex items-center justify-center sm:hidden active:scale-95 transition-transform"
          title="Open AI Chat"
        >
          <MessageCircle className="size-5" />
        </Link>
      )}
    </div>
  );
}
