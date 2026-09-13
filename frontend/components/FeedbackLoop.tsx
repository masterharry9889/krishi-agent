"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  History,
  Layers,
  LineChart,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FeedbackLoop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.1 }
    );
    ref.current?.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="feedback-loop"
      ref={ref}
      aria-labelledby="feedback-heading"
      className="py-16 sm:py-24 border-b border-border/80 bg-background relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Theoretical Rigor */}
          <div className="lg:col-span-6 space-y-6">
            <div className="fade-up inline-flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
                Multi-Season Memory
              </span>
            </div>

            <h2
              id="feedback-heading"
              className="fade-up delay-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            >
              Every harvest calibrates next season&apos;s recommendations.
            </h2>

            <p className="fade-up delay-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Standard agricultural apps provide static advisory sheets that never adapt.
              Krishi Agent closes the loop: when Ramesh Patil logged 19.2 qtl/acre actual soybean harvest
              against an 18.5 qtl/acre model projection (+3.7% realized gain), the <span className="font-mono text-foreground font-medium">FeedbackAgent</span>{" "}
              computed the positive soil nitrogen residual and automatically recalibrated his district baseline for the subsequent Rabi 2026-27 chickpea cycle.
            </p>

            <div className="fade-up delay-3 space-y-3 pt-2">
              {[
                {
                  title: "Yield Variance Calibration",
                  desc: "Compares projected 18.5 qtl/acre against 19.2 qtl/acre weighbridge receipts to refine micro-climate soil models.",
                },
                {
                  title: "Mandi Price Spread Correction",
                  desc: "Measures local trader deduction vs. APMC electronic auction bids (₹4,860 vs. ₹5,020/qtl) to adjust market opportunity scores.",
                },
                {
                  title: "Input Efficiency Ledger",
                  desc: "Logs that 25 kg/ha ZnSO4 application delivered 94% disease suppression, reducing subsequent fungicide budget by ₹450/acre.",
                },
              ].map((point) => (
                <div key={point.title} className="flex items-start gap-3">
                  <div className="size-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 text-primary">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{point.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{point.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Architectural Feedback Visual */}
          <div className="lg:col-span-6 fade-up delay-2 space-y-4">
            {/* Contextual Harvest Calibration Photo */}
            <div className="relative w-full aspect-video sm:aspect-[2/1] rounded-xl overflow-hidden border border-border/80 shadow-xs">
              <Image
                src="/images/harvest-calibrate.jpg"
                alt="Indian farmer inspecting freshly harvested grain yield to calibrate next season predictions"
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 text-white text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    Weighbridge Ground-Truth · Plot #MH-NSK-0847
                  </span>
                  <span className="font-mono text-[10px] bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded border border-white/20 text-emerald-300 w-fit">
                    19.2 qtl/acre Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="size-3.5 text-primary" />
                  LangGraph Memory Propagation
                </span>
                <Badge variant="neutral" className="text-[10px] font-mono">
                  Postgres Checkpoint
                </Badge>
              </div>

              {/* Season N Box */}
              <div className="p-3.5 rounded-md border border-border/60 bg-secondary/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-mono text-foreground">
                    Season N (Kharif 2026 · Plot #MH-NSK-0847)
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">Status: Completed</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-background border border-border/40">
                    <span className="text-[10px] text-muted-foreground block">Predicted Yield (Soybean)</span>
                    <span className="font-mono font-semibold text-foreground">18.5 qtl/acre</span>
                  </div>
                  <div className="p-2 rounded bg-background border border-border/40">
                    <span className="text-[10px] text-muted-foreground block">Realized Harvest</span>
                    <span className="font-mono font-semibold text-primary">19.2 qtl/acre (+3.7%)</span>
                  </div>
                </div>
              </div>

              {/* Transition Indicator */}
              <div className="flex items-center justify-center -my-2 relative z-10">
                <div className="px-3 py-1 rounded-full bg-background border border-border text-[11px] font-mono font-medium text-foreground flex items-center gap-1.5 shadow-2xs">
                  <BrainCircuit className="size-3.5 text-primary" />
                  <span>FeedbackAgent delta computed: +3.7% yield variance (+0.7 qtl/acre)</span>
                </div>
              </div>

              {/* Season N+1 Box */}
              <div className="p-3.5 rounded-md border border-primary/40 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-mono text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3 text-primary" />
                    Season N+1 (Rabi 2026-27 · Chickpea)
                  </span>
                  <Badge variant="success" className="text-[10px] font-mono">
                    Prior Model Recalibrated
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Crop recommendation weights for high-protein chickpea (Digvijay) automatically elevated based
                  on confirmed residual soil nitrogen (284 kg/ha) post-soybean harvest.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
