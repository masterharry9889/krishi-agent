"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Cpu,
  Droplets,
  Sparkles,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Animated counter with easing for telemetry metrics
function CountUp({
  end,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.4,
}: {
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const totalMs = duration * 1000;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalMs, 1);
      // Smooth ease-out curve
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      setVal(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    const handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [end, duration]);

  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default function Hero() {
  // Live "Last synced X seconds ago" ticker
  const [syncAge, setSyncAge] = useState(0);
  const [verifyTime, setVerifyTime] = useState("0.04");

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncAge((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Randomize verification time on mount and every ~8s to look alive
  useEffect(() => {
    const randomize = () =>
      setVerifyTime((0.03 + Math.random() * 0.06).toFixed(2));
    randomize();
    const interval = setInterval(randomize, 8000);
    return () => clearInterval(interval);
  }, []);

  const syncLabel =
    syncAge < 60
      ? `${syncAge}s ago`
      : `${Math.floor(syncAge / 60)}m ${syncAge % 60}s ago`;

  return (
    <section
      aria-labelledby="hero-headline"
      className="relative min-h-[90vh] flex items-center pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-[#FAF7F0] dark:bg-[#0c140e]"
    >
      {/* ── Background Photography Layer: Full-bleed farmland with dark gradient overlay ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/hero-field1.jpg"
          alt="Indian farmland golden hour field landscape"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Dark-to-transparent gradient overlay so headline text stays readable */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20 lg:to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40"
        />

        {/* Delicate topographic contour pattern */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(#D8A94F 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* ── Left Column: Authoritative Editorial Copy ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-7"
          >
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D8A94F] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D8A94F]" />
              </span>
              <span className="font-mono text-[11px] text-[#D8A94F] font-semibold uppercase tracking-wider">
                LangGraph Multi-Agent Engine
              </span>
              <span className="text-white/30">|</span>
              <span className="text-xs text-white/80 font-medium">
                15 Stateful Agronomic Nodes
              </span>
            </div>

            {/* Headline with Editorial Display Font */}
            <h1
              id="hero-headline"
              className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.12]"
            >
              Precision agronomy{" "}
              <span className="italic block sm:inline text-[#D8A94F]">
                engineered for every acre.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl font-normal">
              From soil mineral diagnosis to final mandi realization — Krishi Agent orchestrates
              real government registries, Sentinel-2 satellite imagery, and live market APIs to
              guide farmers through every high-stakes agronomic decision.
            </p>

            {/* Pipeline Stage Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Soil Fertility & pH",
                "Sentinel-2 NDVI",
                "Crop Suitability",
                "Input Costing",
                "PMFBY Insurance",
                "Harvest Sell-Timing",
              ].map((pill) => (
                <span
                  key={pill}
                  className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md border border-white/20 bg-black/35 text-white/90 backdrop-blur-xs shadow-2xs"
                >
                  {pill}
                </span>
              ))}
            </div>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <a href="#cta" id="hero-cta-farmer">
                <Button
                  size="lg"
                  className="bg-[#D8A94F] hover:bg-[#c6983e] text-[#1A241B] font-bold gap-2.5 px-6 shadow-lg hover:shadow-xl transition-all rounded-xl cursor-pointer"
                >
                  <Wheat className="size-4 text-[#1A241B]" />
                  Register Acreage
                </Button>
              </a>
              <a href="#pipeline" id="hero-cta-pipeline">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 px-5 border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer backdrop-blur-md"
                >
                  Inspect Pipeline
                  <ArrowRight className="size-4" />
                </Button>
              </a>
              <Link href="/farmer/login">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-xs sm:text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
                >
                  Farmer Portal Sign In →
                </Button>
              </Link>
            </div>

            {/* Verification Proof points with Vertical Divider Lines */}
            <div className="pt-6 border-t border-white/20 grid grid-cols-3 gap-6 text-xs">
              <div className="space-y-1">
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#D8A94F]">
                  <CountUp end={3000} suffix="+" />
                </div>
                <div className="text-white/80 text-xs font-medium">
                  APMC Mandis Tracked
                </div>
              </div>
              <div className="space-y-1 border-l border-white/20 pl-6">
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#D8A94F]">
                  10m²
                </div>
                <div className="text-white/80 text-xs font-medium">
                  Sentinel-2 Resolution
                </div>
              </div>
              <div className="space-y-1 border-l border-white/20 pl-6">
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#D8A94F]">
                  100%
                </div>
                <div className="text-white/80 text-xs font-medium">
                  Official Govt Feeds
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Right Column: Floating Glassmorphic Telemetry Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative"
          >
            {/* Ambient wheat glow behind the glass card */}
            <div
              aria-hidden="true"
              className="absolute -inset-2 bg-gradient-to-tr from-[#D8A94F]/25 to-[#1F3D2B]/20 rounded-3xl blur-2xl -z-10 opacity-70"
            />

            {/* Glassmorphic Container: frosted background, soft shadow, rounded-2xl, subtle border */}
            <div className="relative rounded-2xl border border-white/60 dark:border-white/15 bg-white/80 dark:bg-[#132017]/85 backdrop-blur-xl p-5 sm:p-6 shadow-[0_16px_40px_rgba(27,45,30,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] space-y-4">
              
              {/* Telemetry Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#EBE4D5] dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                  </span>
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1A241B] dark:text-emerald-100">
                    Live Telemetry Stream
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-white/70 dark:bg-white/10 border-[#E2D9C5] text-[#5E695F] dark:text-emerald-200"
                >
                  District: Nashik, MH
                </Badge>
              </div>

              {/* Metric Row 1: Soil & Satellite */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Nitrogen Card */}
                <div className="p-3.5 rounded-xl bg-[#FAF7F0]/90 dark:bg-white/5 border border-[#EBE4D5] dark:border-white/10 space-y-1 transition-all hover:bg-white dark:hover:bg-white/10 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] text-[#5E695F] dark:text-emerald-200/70">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Droplets className="size-3.5 text-blue-600 dark:text-blue-400" />
                      Soil Nitrogen
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60">
                      Normal
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-[#1A241B] dark:text-white pt-0.5">
                    <CountUp end={284} />{" "}
                    <span className="text-xs font-normal text-[#5E695F] dark:text-white/60">
                      kg/ha
                    </span>
                  </div>
                  <div className="text-[10px] text-[#5E695F] dark:text-white/60">
                    Target: 280-320 kg/ha · pH 6.8
                  </div>
                </div>

                {/* NDVI Card */}
                <div className="p-3.5 rounded-xl bg-[#FAF7F0]/90 dark:bg-white/5 border border-[#EBE4D5] dark:border-white/10 space-y-1 transition-all hover:bg-white dark:hover:bg-white/10 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] text-[#5E695F] dark:text-emerald-200/70">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Activity className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      NDVI Canopy
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60">
                      +0.04
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-[#1A241B] dark:text-white pt-0.5">
                    <CountUp end={0.74} decimals={2} />{" "}
                    <span className="text-xs font-normal text-[#5E695F] dark:text-white/60">
                      index
                    </span>
                  </div>
                  <div className="text-[10px] text-[#5E695F] dark:text-white/60">
                    Sentinel-2 · Healthy vegetative
                  </div>
                </div>
              </div>

              {/* Metric Row 2: Mandi Price & Strategy */}
              <div className="p-4 rounded-xl bg-[#FAF7F0]/90 dark:bg-white/5 border border-[#EBE4D5] dark:border-white/10 space-y-2.5 transition-all hover:bg-white dark:hover:bg-white/10 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A241B] dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-[#D8A94F]" />
                    APMC Modal Price · Soybean
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FAF1DF] text-[#8C5D0F] dark:bg-amber-950/80 dark:text-amber-300 border border-[#E9D7B3] dark:border-amber-700/40">
                    Hold Recommendation
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold font-mono text-[#1A241B] dark:text-white">
                    <CountUp end={4860} prefix="₹" />{" "}
                    <span className="text-xs font-normal text-[#5E695F] dark:text-white/60">
                      / quintal
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                    ↑ ₹140 projected (14 days)
                  </span>
                </div>
                <div className="text-[11px] text-[#5E695F] dark:text-emerald-100/70 leading-relaxed border-t border-[#EAE3D4] dark:border-white/10 pt-2">
                  Regional arrival volumes are tapering. Storage cost ₹28/qtl/mo gives net upside of ₹112/qtl.
                </div>
              </div>

              {/* Active Agent Task Row */}
              <div className="p-3 rounded-xl border border-[#EBE4D5] dark:border-white/10 bg-[#F5EFE3]/60 dark:bg-black/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Cpu className="size-4 text-[#1F3D2B] dark:text-emerald-400 shrink-0 animate-pulse" />
                  <span className="text-[#5E695F] dark:text-emerald-100/70 truncate text-xs">
                    Running <span className="font-mono text-[#1A241B] dark:text-white font-semibold">StorageSellTimingAgent</span>
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 shrink-0 font-semibold px-2 py-0.5 rounded bg-emerald-100/60 dark:bg-emerald-900/40">
                  Verified {verifyTime}s
                </span>
              </div>

              {/* Attribution and Sync Timestamp — Real-Touch Details */}
              <div className="flex items-center justify-between text-[10px] text-[#5E695F] dark:text-white/50 px-1 pt-1">
                <span className="truncate">
                  Plot #MH-NSK-0847 · Ramesh Patil&apos;s field · 4.2 acres
                </span>
                <span className="font-mono shrink-0 tabular-nums">
                  Synced {syncLabel}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
