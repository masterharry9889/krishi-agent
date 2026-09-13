"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  Database,
  Satellite,
  TrendingUp,
  Globe,
  Shield,
  CreditCard,
  Users,
  Warehouse,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DATA_SOURCES = [
  {
    id: "shc",
    name: "Soil Health Card Scheme",
    short: "SHC API",
    ministry: "Dept. of Agriculture & Farmers Welfare, MoA&FW",
    what: "pH, electrical conductivity, NPK macronutrients, and micro-nutrient deficiencies fetched per farmer registration.",
    usedBy: "SoilAgent",
    status: "Active Feed",
    lastSynced: "Synced today, 06:12 AM IST",
    icon: Database,
  },
  {
    id: "agmarknet",
    name: "Agmarknet Mandi Feed",
    short: "AGMK",
    ministry: "Directorate of Marketing & Inspection, MoA&FW",
    what: "Mandi-level commodity prices, arrival volumes, modal prices, and demand-supply gap signals across 3,000+ regulated APMC markets.",
    usedBy: "MarketIntelligenceAgent",
    status: "Daily Modal",
    lastSynced: "Synced today, 05:45 AM IST",
    icon: TrendingUp,
  },
  {
    id: "enam",
    name: "e-NAM National Portal",
    short: "e-NAM",
    ministry: "Small Farmers Agribusiness Consortium (SFAC)",
    what: "Electronic trading portal connecting farmers directly with inter-state institutional buyers, bypassing local cartels.",
    usedBy: "DirectMarketLinkageAgent",
    status: "National Grid",
    lastSynced: "Synced today, 08:30 AM IST",
    icon: Globe,
  },
  {
    id: "ndvi",
    name: "Sentinel-2 Multi-Spectral NDVI",
    short: "ISRO / ESA",
    ministry: "Copernicus Earth Observation Mesh",
    what: "Normalised Difference Vegetation Index scored at 10m resolution. Autonomous alerts trigger if canopy health dips below stage baselines.",
    usedBy: "CropMonitoringAgent + price_watcher",
    status: "5-day Cadence",
    lastSynced: "Pass verified, 11 Sep 10:42 AM IST",
    icon: Satellite,
  },
  {
    id: "pmfby",
    name: "PMFBY Insurance Registry",
    short: "PMFBY",
    ministry: "Pradhan Mantri Fasal Bima Yojana, MoA&FW",
    what: "Scheme eligibility checks, district-specific actuarial premium subsidies, and strict enrollment cut-off tracking.",
    usedBy: "SchemeInsuranceAgent",
    status: "Cutoff Monitored",
    lastSynced: "Synced today, 04:00 AM IST",
    icon: Shield,
  },
  {
    id: "credit",
    name: "Kisan Credit Network",
    short: "KCC / NABARD",
    ministry: "NABARD & Scheduled Bank Gateway",
    what: "Short-term subsidized credit and KCC facilities surfaced only when budget shortfall is calculated — zero predatory lending.",
    usedBy: "CreditAgent (Conditional)",
    status: "Event-Driven",
    lastSynced: "Synced today, 07:15 AM IST",
    icon: CreditCard,
  },
  {
    id: "fpo",
    name: "FPO Buyer Consortium",
    short: "FPO / NAFED",
    ministry: "SFAC & NAFED Institutional Aggregator",
    what: "Verified FPO and aggregator bulk procurement contracts matched by crop variety and district transit radius.",
    usedBy: "DirectMarketLinkageAgent",
    status: "Verified Only",
    lastSynced: "Synced today, 08:00 AM IST",
    icon: Users,
  },
  {
    id: "coldstorage",
    name: "National Cold Chain Registry",
    short: "NCCD",
    ministry: "National Centre for Cold-chain Development & NHB",
    what: "Geo-located warehouse locations with verified cold chain capacity, triggered when storage upside exceeds holding cost.",
    usedBy: "StorageSellTimingAgent",
    status: "Geo-Filtered",
    lastSynced: "Synced 10 Sep, 06:20 PM IST",
    icon: Warehouse,
  },
];

export default function DataSources() {
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
      id="data-sources"
      ref={ref}
      aria-labelledby="data-heading"
      className="py-16 sm:py-24 border-b border-border/80 bg-background relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16 space-y-3">
          <div className="fade-up inline-flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
              Integration Architecture
            </span>
          </div>
          <h2
            id="data-heading"
            className="fade-up delay-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          >
            Zero synthetic data. Official government registries and satellite meshes.
          </h2>
          <p className="fade-up delay-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Every agronomic recommendation in Krishi Agent is grounded in authoritative sources.
            No hallucinated market prices, no generic crop advice — validated against 3,000+ regulated APMC mandis,
            ISRO/ESA Copernicus 10m bands, and official district Soil Health Card datasets.
          </p>
        </div>

        {/* Structured 4-Column Integration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DATA_SOURCES.map((src) => {
            const Icon = src.icon;
            return (
              <div
                key={src.id}
                className="pipeline-node rounded-lg border border-border/80 bg-card p-4 sm:p-5 flex flex-col justify-between transition-colors hover:border-primary/50 space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-md bg-secondary flex items-center justify-center text-foreground shrink-0 border border-border/60">
                        <Icon className="size-4 text-primary" />
                      </div>
                      {src.id === "shc" && (
                        <div className="relative size-8 rounded-md overflow-hidden border border-border/60 shrink-0">
                          <Image
                            src="/images/soil-hands.jpg"
                            alt="Farmer hands testing nutrient-rich dark soil"
                            fill
                            sizes="32px"
                            className="object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {src.id === "agmarknet" && (
                        <div className="relative size-8 rounded-md overflow-hidden border border-border/60 shrink-0">
                          <Image
                            src="/images/mandi-market.jpg"
                            alt="Mandi wholesale agricultural market"
                            fill
                            sizes="32px"
                            className="object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {src.id === "ndvi" && (
                        <div className="relative size-8 rounded-md overflow-hidden border border-border/60 shrink-0">
                          <Image
                            src="/images/satellite-ndvi.jpg"
                            alt="Sentinel-2 multi-spectral NDVI canopy data"
                            fill
                            sizes="32px"
                            className="object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                    <Badge variant="neutral" className="text-[10px] font-mono">
                      {src.short}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-semibold text-foreground leading-snug">
                    {src.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {src.ministry}
                  </p>

                  <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
                    {src.what}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="font-mono text-muted-foreground">
                      Agent: <span className="text-foreground font-medium">{src.usedBy.split(" ")[0]}</span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {src.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/80 flex items-center gap-1.5">
                    <span className="size-1 rounded-full bg-primary/60 shrink-0" />
                    <span>{src.lastSynced}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
