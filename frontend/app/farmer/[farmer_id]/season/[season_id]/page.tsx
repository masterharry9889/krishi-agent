"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getFarmerContext,
  runAgent,
  orchestrateFarmAnalysis,
  DASHBOARD_REQUIRED_AGENTS,
  getFarmerInsight,
  submitFarmerFeedback,
  ApiError,
  FarmerContextResponse,
  FarmerInsight,
  PriorityItem,
  FarmerAlert,
} from "@/lib/api";
import { AGENT_REGISTRY } from "@/lib/agents";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  CloudRain,
  Coins,
  Droplets,
  IndianRupee,
  Loader2,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Sun,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi (हिंदी)",
  mr: "Marathi (मराठी)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
  kn: "Kannada (ಕನ್ನಡ)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  gu: "Gujarati (ગુજરાતી)",
  bn: "Bengali (বাংলা)",
  en: "English",
};

interface PageParams {
  farmer_id: string;
  season_id: string;
}

interface AgentState {
  status: "idle" | "running" | "success" | "error" | "blocked";
  result: Record<string, unknown> | null;
  error: string | null;
}

export default function FarmerSeasonDetailPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const { farmer_id: farmerId, season_id: seasonId } = resolvedParams;

  const [context, setContext] = useState<FarmerContextResponse | null>(null);
  const [insight, setInsight] = useState<FarmerInsight | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestratorStep, setOrchestratorStep] = useState<string>("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [whyExpanded, setWhyExpanded] = useState(false);

  // Feedback form state
  const [fbRating, setFbRating] = useState<number>(5);
  const [fbUsed, setFbUsed] = useState<boolean>(true);
  const [fbYield, setFbYield] = useState<string>("");
  const [fbPrice, setFbPrice] = useState<string>("");
  const [fbNotes, setFbNotes] = useState<string>("");
  const [fbSubmitted, setFbSubmitted] = useState<boolean>(false);
  const [fbSubmitting, setFbSubmitting] = useState<boolean>(false);

  // Agent states for technical drawer
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(() => {
    const init: Record<string, AgentState> = {};
    for (const a of AGENT_REGISTRY) {
      init[a.key] = { status: "idle", result: null, error: null };
    }
    return init;
  });

  const loadDashboardData = useCallback(async () => {
    setContextError(null);
    try {
      const [ctx, insData] = await Promise.all([
        getFarmerContext(farmerId),
        getFarmerInsight(farmerId).catch(() => null),
      ]);
      setContext(ctx);
      if (insData?.insight) setInsight(insData.insight);

      if (ctx.agent_outputs && Array.isArray(ctx.agent_outputs)) {
        const nextStates: Record<string, AgentState> = {};
        for (const a of AGENT_REGISTRY) {
          nextStates[a.key] = { status: "idle", result: null, error: null };
        }
        for (const entry of ctx.agent_outputs) {
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
    } catch (err) {
      let message = "Failed to load dashboard. Please try again.";
      if (err instanceof ApiError) message = err.message;
      else if (err instanceof Error) message = err.message;
      setContextError(message);
    } finally {
      setContextLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setContextError(null);
      try {
        const [ctx, insData] = await Promise.all([
          getFarmerContext(farmerId),
          getFarmerInsight(farmerId).catch(() => null),
        ]);
        if (!ignore) {
          setContext(ctx);
          if (insData?.insight) setInsight(insData.insight);

          if (ctx.agent_outputs && Array.isArray(ctx.agent_outputs)) {
            const nextStates: Record<string, AgentState> = {};
            for (const a of AGENT_REGISTRY) {
              nextStates[a.key] = { status: "idle", result: null, error: null };
            }
            for (const entry of ctx.agent_outputs) {
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
        }
      } catch (err) {
        if (!ignore) {
          let message = "Failed to load dashboard. Please try again.";
          if (err instanceof ApiError) message = err.message;
          else if (err instanceof Error) message = err.message;
          setContextError(message);
        }
      } finally {
        if (!ignore) setContextLoading(false);
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [farmerId]);

  const handleAnalyzeMyFarm = async () => {
    setOrchestrating(true);
    setOrchestratorStep("Analyzing Soil, Weather, Market & Crop Plan...");
    try {
      const res = await orchestrateFarmAnalysis(
        farmerId,
        seasonId,
        true,
        DASHBOARD_REQUIRED_AGENTS
      );
      setContext(res.context);
      setInsight(res.insight);

      if (res.context.agent_outputs) {
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
    } catch (err) {
      let msg = "Analysis failed. Please try again.";
      if (err instanceof ApiError) msg = err.message;
      else if (err instanceof Error) msg = err.message;
      alert(`Orchestration error: ${msg}`);
    } finally {
      setOrchestrating(false);
      setOrchestratorStep("");
    }
  };

  const handleRunAgent = async (agentKey: string) => {
    setAgentStates((prev) => ({ ...prev, [agentKey]: { status: "running", result: null, error: null } }));
    try {
      const res = await runAgent(farmerId, seasonId, agentKey);
      if (res.status === "error") {
        setAgentStates((prev) => ({ ...prev, [agentKey]: { status: "error", result: null, error: res.message || "Agent execution failed." } }));
      } else {
        setAgentStates((prev) => ({ ...prev, [agentKey]: { status: "success", result: res as unknown as Record<string, unknown>, error: null } }));
        const insData = await getFarmerInsight(farmerId).catch(() => null);
        if (insData?.insight) setInsight(insData.insight);
      }
    } catch (err) {
      let msg = "Analysis failed. Please try again.";
      if (err instanceof ApiError) msg = err.message;
      else if (err instanceof Error) msg = err.message;
      setAgentStates((prev) => ({ ...prev, [agentKey]: { status: "error", result: null, error: msg } }));
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbSubmitting(true);
    try {
      await submitFarmerFeedback(farmerId, seasonId, {
        rating: fbRating,
        used_recommendation: fbUsed,
        actual_yield: fbYield ? parseFloat(fbYield) : undefined,
        actual_price: fbPrice ? parseFloat(fbPrice) : undefined,
        notes: fbNotes,
      });
      setFbSubmitted(true);
    } catch {
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setFbSubmitting(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Loading season lifecycle records...</p>
        </div>
      </div>
    );
  }

  if (contextError || !context) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-destructive/30 bg-card p-6 text-center space-y-4 shadow-xs">
          <AlertTriangle className="size-10 text-destructive mx-auto" />
          <h2 className="text-base font-bold text-foreground">Unable to Load Season Data</h2>
          <p className="text-xs text-destructive">{contextError || "Farmer record not found."}</p>
          <Button variant="default" onClick={loadDashboardData}>
            Retry Synchronization
          </Button>
        </div>
      </div>
    );
  }

  const profile = context.profile;
  const currentPhase = insight?.timeline?.current_phase || "SOIL & WEATHER CHECK";
  const priorities = insight?.priorities || [];
  const alerts = insight?.alerts || [];
  const cropDec = insight?.crop_decision;
  const marketDec = insight?.market_decision;
  const finSnap = insight?.financial_snapshot;
  const weatherActs = insight?.weather_actions || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="bg-background/90 backdrop-blur-md border-b border-border/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/farmer/dashboard"
              className="size-8 rounded-md bg-secondary hover:bg-muted border border-border flex items-center justify-center text-foreground transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Season Intelligence</span>
              <Badge variant="neutral" className="text-[10px] font-mono">
                {seasonId}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground hidden sm:inline">📍 {profile.district}</span>
            <Link href="/farmer/dashboard">
              <Button size="sm" variant="outline" className="text-xs">
                Farm Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Farm Profile Header Card */}
        <div className="rounded-lg border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="neutral" className="text-[10px] font-mono">
                  District Agronomic Profile
                </Badge>
                <span className="text-[11px] font-mono text-primary font-medium">
                  {currentPhase}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Season Plan: {profile.name}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Stateful LangGraph orchestration record calibrated for {profile.district} district.
              </p>
            </div>

            <Button
              onClick={handleAnalyzeMyFarm}
              disabled={orchestrating}
              size="lg"
              className="font-semibold shrink-0 shadow-xs"
            >
              {orchestrating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  {orchestratorStep || "Analyzing..."}
                </>
              ) : (
                <>
                  <Wheat className="size-4 mr-2" />
                  Recalculate Plan
                </>
              )}
            </Button>
          </div>

          {/* Metadata Grid */}
          <div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">District</span>
              <div className="font-semibold text-foreground">{profile.district}</div>
            </div>
            <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Land Area</span>
              <div className="font-semibold font-mono text-foreground">{profile.land_size || 1.0} Acres</div>
            </div>
            <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Water Source</span>
              <div className="font-semibold text-foreground">{profile.water_source || "Rainfed"}</div>
            </div>
            <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Language</span>
              <div className="font-semibold text-foreground">{LANGUAGE_NAMES[profile.language] || profile.language}</div>
            </div>
            <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Active Phase</span>
              <div className="font-semibold text-primary truncate">{currentPhase}</div>
            </div>
            <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Farmer ID</span>
              <div className="font-semibold font-mono text-foreground truncate">{farmerId}</div>
            </div>
          </div>
        </div>

        {/* Season Progress Timeline */}
        <section className="space-y-3">
          <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            Season Progress Timeline
          </h2>
          <div className="rounded-lg border border-border/80 bg-card p-4 overflow-x-auto shadow-2xs">
            <div className="flex items-center gap-3 min-w-[680px]">
              {(insight?.timeline?.all_phases || []).map((step: string, idx: number) => {
                const isCompleted = insight?.timeline?.completed_steps?.includes(step);
                const isCurrent = step === currentPhase;
                return (
                  <div key={step} className={`flex-1 text-center ${isCompleted || isCurrent ? "opacity-100" : "opacity-40"}`}>
                    <div
                      className={`size-7 rounded-md font-mono font-bold text-xs flex items-center justify-center mx-auto mb-1.5 shadow-2xs ${
                        isCurrent
                          ? "bg-amber-600 text-white"
                          : isCompleted
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground border border-border"
                      }`}
                    >
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-foreground truncate">
                      {step}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Active Weather & Risk Alerts */}
        {(alerts.length > 0 || weatherActs.length > 0) && (
          <section className="space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <CloudRain className="size-4 text-amber-600 dark:text-amber-400" />
              Weather & Field Risk Alerts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alerts.map((al: FarmerAlert, idx: number) => (
                <div key={idx} className="p-3.5 rounded-lg border border-destructive/25 bg-destructive/10 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-destructive">
                    <AlertTriangle className="size-3.5" />
                    <span>[{al.type}] {al.title}</span>
                  </div>
                  <p className="text-foreground/90">{al.message}</p>
                  <span className="text-destructive font-semibold block text-[11px]">Nudge: {al.action}</span>
                </div>
              ))}
              {weatherActs.map((wa: { condition: string; action: string; urgency: string }, idx: number) => (
                <div key={idx} className="p-3.5 rounded-lg border border-border bg-secondary/40 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <CloudRain className="size-3.5 text-primary" />
                    <span>{wa.condition}</span>
                  </div>
                  <p className="text-muted-foreground">{wa.action}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommended Crop Decision */}
        {cropDec?.recommended_crop && (
          <div className="rounded-lg border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <Badge variant="neutral" className="text-[10px] font-mono text-primary mb-1">
                  <Sprout className="size-3 mr-1" />
                  Target Sowing Crop
                </Badge>
                <h3 className="text-xl font-bold text-foreground">{cropDec.recommended_crop}</h3>
                <p className="text-xs text-muted-foreground">
                  Varieties: {(cropDec.varieties || []).join(" · ")}
                </p>
              </div>

              <div className="sm:text-right">
                <div className="text-2xl font-bold font-mono text-primary num-tabular">
                  {Math.round((cropDec.suitability_score || 0.85) * 100)}%
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Lifecycle: {cropDec.expected_duration_days || 120} Days
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {cropDec.why_crop}
            </p>

            <button
              type="button"
              onClick={() => setWhyExpanded(!whyExpanded)}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              {whyExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {whyExpanded ? "Collapse Factor Weights" : "Inspect Factor Weight Breakdown"}
            </button>

            {whyExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60 text-xs">
                <div className="p-3 rounded-md bg-secondary/50 border border-border/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">Soil Compatibility</span>
                  <div className="font-medium text-foreground">{cropDec.factors?.soil}</div>
                </div>
                <div className="p-3 rounded-md bg-secondary/50 border border-border/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">Weather Fit</span>
                  <div className="font-medium text-foreground">{cropDec.factors?.weather}</div>
                </div>
                <div className="p-3 rounded-md bg-secondary/50 border border-border/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">Market Opportunity</span>
                  <div className="font-medium text-foreground">{cropDec.factors?.market}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Market & Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 rounded-lg border border-border/80 bg-card p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Mandi Benchmark Realization
              </span>
              {marketDec?.recommendation_type && (
                <Badge variant="neutral" className="text-[10px] font-mono">
                  {marketDec.recommendation_type}
                </Badge>
              )}
            </div>

            {marketDec?.mandi ? (
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-foreground">{marketDec.mandi}</span>
                  <div className="text-xl font-bold font-mono text-foreground num-tabular">
                    ₹{marketDec.modal_price_inr}
                    <span className="text-xs font-normal text-muted-foreground">/qtl</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{marketDec.reasoning}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-3 text-center">No mandi benchmark synced.</p>
            )}
          </div>

          <div className="lg:col-span-5 rounded-lg border border-border/80 bg-card p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <Coins className="size-4 text-primary" />
                Financial Snapshot
              </span>
              <Badge variant="neutral" className="text-[10px] font-mono">Working Capital</Badge>
            </div>

            {finSnap && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Est. Cost</span>
                  <div className="font-mono font-bold text-foreground num-tabular">
                    ₹{finSnap.estimated_input_cost_inr.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Net Margin</span>
                  <div className="font-mono font-bold text-primary num-tabular">
                    ₹{finSnap.expected_net_margin_inr.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Section */}
        <div className="rounded-lg border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-3">
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <Star className="size-4 text-amber-600 dark:text-amber-400" />
            Season Harvest Log
          </h3>

          {fbSubmitted ? (
            <div className="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Feedback logged. Model calibrated for next season.</span>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Rating (1 to 5)</label>
                  <select
                    value={fbRating}
                    onChange={(e) => setFbRating(Number(e.target.value))}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>{r} Stars</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Actual Yield (qtl/acre)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 20"
                    value={fbYield}
                    onChange={(e) => setFbYield(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Field Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes on pests, weather, or real prices..."
                  value={fbNotes}
                  onChange={(e) => setFbNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none resize-vertical"
                />
              </div>

              <Button type="submit" disabled={fbSubmitting} size="sm">
                {fbSubmitting ? "Submitting..." : "Submit Log"}
              </Button>
            </form>
          )}
        </div>

        {/* Collapsible Technical Drawer */}
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full rounded-lg border border-border/80 bg-card p-3.5 text-xs text-muted-foreground font-medium flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 text-foreground font-semibold">
              <Bot className="size-4 text-primary" />
              Agronomist Diagnostic View ({AGENT_REGISTRY.length} AI Agents)
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
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{agent.display_name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{agent.description}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="neutral" className="text-[10px] font-mono uppercase">
                        {st.status}
                      </Badge>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleRunAgent(agent.key)}
                        disabled={st.status === "running"}
                      >
                        {st.status === "running" ? "Running..." : "Run"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}