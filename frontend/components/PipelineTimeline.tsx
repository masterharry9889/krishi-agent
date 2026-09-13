"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Database,
  Droplets,
  Layers,
  Network,
  RotateCcw,
  Shield,
  Sprout,
  TrendingUp,
  UserCheck,
  Wheat,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PhaseItem {
  step: string;
  label: string;
  agent: string;
  desc: string;
  output: string;
  icon: any;
  tag: string;
  isParallel?: boolean;
  image?: string;
  imageAlt?: string;
  disclaimer?: string;
}

const PHASES: PhaseItem[] = [
  {
    step: "01",
    label: "Farmer Profiling & Baseline",
    agent: "FarmerInterfaceAgent",
    desc: "Ingests location, total acreage, soil class, past crop history, irrigation source, and native dialect. Example: Ramesh Patil, Nashik dist., 4.2 acres, borewell irrigation, last 3 seasons — soybean → wheat → chickpea.",
    output: "FarmerProfile { lat: 20.0063, lon: 73.7630, land_acres: 4.2, water_type: 'borewell', language: 'mr' }",
    icon: UserCheck,
    tag: "Onboarding Node",
    image: "/images/farmer-phone.jpg",
    imageAlt: "Indian farmer using smartphone in field for baseline profile registration",
  },
  {
    step: "02",
    label: "Multi-Source Parallel Diagnostics",
    agent: "SoilAgent ∥ WeatherAgent ∥ MarketIntelligenceAgent",
    desc: "Concurrent fan-out execution. Queries Soil Health Card API for NPK, IMD for precipitation outlook, and Agmarknet for mandi spreads. Live example: N 284 kg/ha, P 18.2 kg/ha, K 312 kg/ha · pH 6.8 · 7-day rainfall forecast: 42mm.",
    output: "SoilReport { N: 284, P: 18.2, K: 312, pH: 6.8 } + WeatherOutlook { precip_7d: 42mm } + MandiSpread[3]",
    icon: Network,
    tag: "Parallel Fan-Out",
    isParallel: true,
    image: "/images/stage-diagnostics.jpg",
    imageAlt: "Agro-meteorological weather station and soil sensor measuring field parameters",
  },
  {
    step: "03",
    label: "Agronomic & Economic Crop Selection",
    agent: "CropRecommendationAgent",
    desc: "Cross-analyzes agronomic feasibility against projected mandi gross margins. Shortlists top 3 ranked crops with risk coefficients. Current ranking: #1 Soybean JS-9560 (87% fit, ₹19,400/acre margin), #2 Tur Dal (79%), #3 Maize (71%).",
    output: "CropShortlist { ranked: ['Soybean JS-9560', 'Tur Dal', 'Maize'], suitability: [0.87, 0.79, 0.71] }",
    icon: Sprout,
    tag: "Fan-In Synthesis",
    image: "/images/stage-crop-selection.jpg",
    imageAlt: "Agronomist inspecting diversified soybean and chickpea crops in rural field",
  },
  {
    step: "04",
    label: "Resource Allocation & Input Costing",
    agent: "ResourceIrrigationAgent → BudgetEstimatorAgent → InputVerificationAgent",
    desc: "Calculates precise water budget, fertilizer requirements, and authentic seed/fertilizer dealer costs. Computed: 380mm seasonal water requirement, DAP 50kg + Urea 75kg, total input cost ₹8,240/acre from 2 verified dealers within 12km.",
    output: "InputSchedule { water_mm: 380, DAP_kg: 50, Urea_kg: 75 } + WorkingCapital: ₹8,240/acre",
    icon: Coins,
    tag: "Chained Pipeline",
    image: "/images/irrigation.jpg",
    imageAlt: "Smart precision drip irrigation system hydrating crop rows efficiently",
  },
  {
    step: "05",
    label: "Risk Hedging & Liquidity Bridge",
    agent: "SchemeInsuranceAgent → CreditAgent",
    desc: "Verifies PMFBY insurance cutoff dates and actuarial premiums. Conditionally routes to Kisan Credit Card if deficit occurs. Nashik dist. Kharif cutoff: 15 Jul 2026, premium 2% of sum insured (₹620/acre). Deficit detected → KCC ₹24,000 pre-qualified.",
    output: "InsuranceCoverage { premium: ₹620/acre, cutoff: '15-Jul-2026' } + KCC: ₹24,000",
    disclaimer: "Illustrative data for demonstration — PMFBY premium, KCC limits, and cutoff dates shown are simulated sample values, not official financial advice.",
    icon: Shield,
    tag: "Conditional Edge",
    image: "/images/stage-risk-insurance.jpg",
    imageAlt: "Farmer and rural banking officer reviewing PMFBY crop insurance and credit documentation",
  },
  {
    step: "06",
    label: "In-Season Vegetative Monitoring",
    agent: "CropMonitoringAgent → AdvisoryAgent",
    desc: "Periodic Sentinel-2 NDVI telemetry checks and disease vision scans. Generates proactive micro-climate advisories. Latest reading: NDVI 0.74 (healthy), +0.04 from last pass. Yellow mosaic risk flagged at southeast plot boundary.",
    output: "TelemetryLog[12] + ActionableNudges[2] { 'Yellow Mosaic Alert', 'Zinc Deficiency' }",
    icon: Cpu,
    tag: "Event-Driven Daemon",
    image: "/images/satellite-ndvi.jpg",
    imageAlt: "Sentinel-2 multi-spectral NDVI satellite false-color imagery of farm vegetation",
  },
  {
    step: "07",
    label: "Harvest Window & Sell-Timing Optimization",
    agent: "StorageSellTimingAgent",
    desc: "Monitors commodity price curves vs. certified cold storage rental fees to issue sell-now or hold recommendations. Current: Soybean ₹4,860/qtl at Latur APMC, 14-day projected ₹5,000/qtl. Storage cost ₹28/qtl/mo → net upside ₹112/qtl. HOLD.",
    output: "SellRecommendation { decision: 'HOLD', target_mandi: 'Latur APMC', upside: ₹112/qtl }",
    icon: TrendingUp,
    tag: "Decision Gate",
    image: "/images/stage-storage-timing.jpg",
    imageAlt: "Agricultural commodity storage warehouse preserving crop quality before market sale",
  },
  {
    step: "08",
    label: "Direct Market Linkage & Settlement",
    agent: "DirectMarketLinkageAgent",
    desc: "Matches harvest volume with local FPOs and verified e-NAM institutional buyers to eliminate middleman commission. Matched: 18.5 quintals to Nashik FPO Collective at ₹5,020/qtl, 0% broker levy, pickup from Sinnar logistics hub.",
    output: "SaleContract { buyer: 'Nashik FPO', price: ₹5,020/qtl, hub: 'Sinnar' }",
    icon: Wheat,
    tag: "Settlement Node",
    image: "/images/mandi-market.jpg",
    imageAlt: "Bustling agricultural APMC mandi wholesale produce market",
  },
  {
    step: "09",
    label: "Autonomous Feedback & Memory Propagation",
    agent: "FeedbackAgent",
    desc: "Logs actual yield and realization against pipeline predictions, updating state memory for subsequent season optimization. Kharif 2025 delta: predicted 18.5 qtl/acre vs. realized 19.2 qtl/acre (+3.7%). Model recalibrated for Rabi 2025-26.",
    output: "SeasonDeltaMemory { predicted: 18.5, realized: 19.2, delta: +3.7%, propagated: true }",
    icon: RotateCcw,
    tag: "State Checkpointer",
    image: "/images/harvest-calibrate.jpg",
    imageAlt: "Farmer inspecting realized grain yield to calibrate next season memory model",
  },
];

export default function PipelineTimeline() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.08 }
    );
    ref.current?.querySelectorAll(".fade-up, .pipeline-node").forEach((el) => {
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="pipeline"
      ref={ref}
      aria-labelledby="pipeline-heading"
      className="py-16 sm:py-24 border-b border-border/80 bg-background relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 space-y-3">
          <div className="fade-up inline-flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
              Execution Architecture
            </span>
          </div>
          <h2
            id="pipeline-heading"
            className="fade-up delay-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          >
            A 9-stage stateful workflow. One continuous growing season.
          </h2>
          <p className="fade-up delay-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Built as a deterministic LangGraph state machine backed by Postgres checkpointing.
            State persists across weeks, surviving disconnections, background telemetry ticks,
            and intermittent mobile coverage.
          </p>
        </div>

        {/* Step-by-Step Architecture Pipeline */}
        <div className="space-y-8">
          {PHASES.map((item, idx) => {
            const Icon = item.icon;
            const isLast = idx === PHASES.length - 1;
            return (
              <div key={item.step} className="pipeline-node flex items-start gap-3 sm:gap-6">
                <div className="flex flex-col items-center w-8 sm:w-12 flex-shrink-0">
                  <div className="size-7 sm:size-9 rounded-md bg-secondary border border-border/60 flex items-center justify-center font-mono font-bold text-[11px] sm:text-xs text-foreground">
                    {item.step}
                  </div>
                  {!isLast && <div className="flex-1 w-px bg-muted mt-2 min-h-[40px]"></div>}
                </div>
                <motion.div
                  className="flex-1 min-w-0 rounded-xl border border-border/80 bg-card p-4 sm:p-6 hover:shadow-xl hover:scale-[1.01] transition-all overflow-hidden"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                >
                  {item.image && (
                    <div className="relative w-full aspect-video sm:h-48 rounded-lg overflow-hidden mb-4 sm:mb-5 border border-border/60">
                      <Image
                        src={item.image}
                        alt={item.imageAlt || item.label}
                        fill
                        sizes="(max-width: 768px) 100vw, 700px"
                        className="object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 p-1.5 sm:p-2 bg-primary/10 rounded-full">
                      <Icon className="size-4 sm:size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-lg font-semibold text-foreground">
                          {item.label}
                        </h3>
                        <Badge variant={item.isParallel ? "warning" : "secondary"} className="text-[10px] font-mono">
                          {item.tag}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        {item.desc}
                      </p>
                      <div className="mt-3 p-2 sm:p-2.5 rounded bg-secondary/50 border border-border/60 text-[11px] sm:text-xs font-mono text-primary break-words">
                        <span className="font-semibold text-foreground">{item.agent.split(' ')[0]}</span> → Output: {item.output}
                      </div>
                      {item.disclaimer && (
                        <p className="mt-2 text-[10px] sm:text-[11px] text-muted-foreground/80 italic flex items-center gap-1.5">
                          <span className="font-bold text-amber-600 dark:text-amber-400">*</span>
                          {item.disclaimer}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
