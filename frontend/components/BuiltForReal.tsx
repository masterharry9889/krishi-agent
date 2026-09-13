"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  Globe,
  Languages,
  Mic,
  Network,
  Radio,
  Server,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LANGUAGES = [
  { code: "hi", name: "हिन्दी", romanized: "Hindi", region: "North India" },
  { code: "mr", name: "मराठी", romanized: "Marathi", region: "Maharashtra" },
  { code: "ta", name: "தமிழ்", romanized: "Tamil", region: "Tamil Nadu" },
  { code: "te", name: "తెలుగు", romanized: "Telugu", region: "Andhra / Telangana" },
  { code: "kn", name: "ಕನ್ನಡ", romanized: "Kannada", region: "Karnataka" },
  { code: "pa", name: "ਪੰਜਾਬੀ", romanized: "Punjabi", region: "Punjab" },
  { code: "gu", name: "ગુજરાતી", romanized: "Gujarati", region: "Gujarat" },
  { code: "bn", name: "বাংলা", romanized: "Bengali", region: "West Bengal" },
];

const ARCHITECTURAL_PILLARS = [
  {
    id: "voice",
    title: "Voice-First Multilingual Interface",
    body: "Farmers speak naturally in their regional dialect. Sub-800ms speech-to-text transcribes across 8 Indic languages, localized agent schemas process agronomic queries, and TTS delivers clear audio advisory with zero literacy barrier.",
    tag: "Sub-800ms STT · 8 Languages",
    icon: Mic,
  },
  {
    id: "bandwidth",
    title: "Low-Bandwidth Server Architecture",
    body: "Heavy multi-agent orchestration, satellite inference, and LLM reasoning run entirely server-side. The farmer device only exchanges gzip payloads under 42KB — fully functional on patchy 2G/EDGE networks.",
    tag: "<42KB Payloads · 2G Compatible",
    icon: WifiOff,
  },
  {
    id: "persistence",
    title: "Stateful Season Checkpointing",
    body: "Farmers never re-explain their land profile or previous advice. Postgres checkpoints persist every agent decision, soil test, and disease diagnosis across 120+ day season cycles without session loss.",
    tag: "120-Day Persistence · Postgres",
    icon: Server,
  },
  {
    id: "offline",
    title: "Intermittent Connectivity Resilience",
    body: "When mobile coverage drops in rural fields, transactions and voice recordings queue in browser IndexedDB and sync automatically with exponential backoff once reconnected — 0% packet or diagnostic loss.",
    tag: "IndexedDB Queue · 0% Loss",
    icon: Radio,
  },
];

export default function BuiltForReal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.1 }
    );
    ref.current?.querySelectorAll(".fade-up, .pipeline-node").forEach((el) => {
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="built-for-real"
      ref={ref}
      aria-labelledby="built-heading"
      className="py-16 sm:py-24 border-b border-border/80 bg-background relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 space-y-3">
          <div className="fade-up inline-flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
              Rural Field Architecture
            </span>
          </div>
          <h2
            id="built-heading"
            className="fade-up delay-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          >
            Engineered for real Indian farms, not silicon valley demos.
          </h2>
          <p className="fade-up delay-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Agricultural intelligence fails if it assumes high-speed 5G, English literacy, or
            high-end smartphones. Krishi Agent is designed from the soil up for rural ground reality.
          </p>
        </div>

        {/* Field Reality Photographic Banner */}
        <div className="fade-up relative w-full aspect-video sm:aspect-[21/9] lg:h-72 rounded-2xl overflow-hidden border border-border/80 mb-10 shadow-sm">
          <Image
            src="/images/rural-field.jpg"
            alt="Agricultural advisor and Indian farmer in rural field verifying crop recommendations on mobile device"
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/55 sm:to-transparent flex items-end sm:items-center p-5 sm:p-8">
            <div className="max-w-xl space-y-2 text-white">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D8A94F]/20 text-[#D8A94F] border border-[#D8A94F]/30 text-[11px] font-mono font-semibold">
                Field-Tested Under Ground Realities
              </span>
              <h3 className="text-base sm:text-xl md:text-2xl font-serif font-bold text-white leading-snug">
                Built for patchy 2G/3G connectivity, regional dialects, and real soil variability.
              </h3>
              <p className="text-xs sm:text-sm text-white/85 line-clamp-2 sm:line-clamp-none leading-relaxed">
                Agri-tech that requires continuous 5G fails when farmers step beyond the village center. Krishi Agent runs stateful multi-agent decision engines server-side, syncing asynchronously.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {ARCHITECTURAL_PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="pipeline-node rounded-lg border border-border/80 bg-card p-5 sm:p-6 space-y-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="size-8 rounded-md bg-secondary border border-border/60 flex items-center justify-center text-primary">
                    <Icon className="size-4" />
                  </div>
                  <Badge variant="neutral" className="text-[10px] font-mono">
                    {item.tag}
                  </Badge>
                </div>
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>

        {/* Language Grid Banner */}
        <div className="fade-up rounded-lg border border-border/80 bg-secondary/40 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Languages className="size-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Supported Native Indic Languages
              </span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              Direct localization via prompt schema
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.code}
                className="p-2 rounded bg-background border border-border/60 text-center"
              >
                <div className="text-xs font-semibold text-foreground">{lang.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{lang.romanized}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
