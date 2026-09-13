"use client";

import React, { useState } from "react";
import { FarmingPlanData } from "./types";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplets,
  IndianRupee,
  Package,
  ScrollText,
  ShieldCheck,
  Sprout,
  Wheat,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FarmingPlanCardProps {
  plan: FarmingPlanData;
}

export const FarmingPlanCard: React.FC<FarmingPlanCardProps> = ({ plan }) => {
  const [openSection, setOpenSection] = useState<string | null>("crops");

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: plan.budget?.currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const sections = [
    {
      key: "crops",
      icon: <Sprout className="size-3.5 text-primary" />,
      label: `Recommended Crops (${plan.crops.length})`,
    },
    {
      key: "budget",
      icon: <IndianRupee className="size-3.5 text-amber-600 dark:text-amber-400" />,
      label: "Estimated Working Capital & Profit",
    },
    {
      key: "irrigation",
      icon: <Droplets className="size-3.5 text-blue-600 dark:text-blue-400" />,
      label: "Irrigation & Water Schedule",
    },
    {
      key: "schemes",
      icon: <ScrollText className="size-3.5 text-primary" />,
      label: "PMFBY Insurance & Schemes",
    },
    {
      key: "timeline",
      icon: <CalendarDays className="size-3.5 text-foreground" />,
      label: "Operational Field Timeline",
    },
  ];

  return (
    <div className="rounded-lg border border-border/80 bg-card overflow-hidden my-2 max-w-xl w-full shadow-2xs">
      {/* Header Banner */}
      <div className="bg-secondary/60 border-b border-border/60 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground shrink-0 shadow-2xs">
            <Wheat className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground leading-snug truncate">
              {plan.title || "Custom Farm Season Plan"}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              Generated via LangGraph multi-agent diagnostic synthesis
            </p>
          </div>
        </div>

        <Badge variant="success" className="text-[10px] font-mono shrink-0">
          <ShieldCheck className="size-3 mr-1" />
          AI Verified
        </Badge>
      </div>

      <div className="p-4 space-y-3 text-xs">
        {plan.summary && (
          <p className="text-muted-foreground leading-relaxed">
            {plan.summary}
          </p>
        )}

        {/* Accordion Sections */}
        <div className="space-y-2">
          {sections.map((section) => {
            const isOpen = openSection === section.key;
            return (
              <div
                key={section.key}
                className="rounded-md border border-border/70 bg-card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="w-full p-3 flex items-center justify-between bg-secondary/30 hover:bg-secondary/60 transition-colors text-left font-semibold text-foreground cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-xs">
                    {section.icon}
                    {section.label}
                  </span>
                  {isOpen ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="p-3.5 pt-2 border-t border-border/50 space-y-3">
                    {/* 1. Crops Section */}
                    {section.key === "crops" && (
                      <div className="space-y-2.5">
                        {plan.crops.map((c, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-md bg-secondary/20 border border-border/60 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-foreground text-xs">{c.name}</span>
                              <Badge variant="neutral" className="font-mono text-[10px] text-primary">
                                {c.suitabilityScore}% Suitability
                              </Badge>
                            </div>
                            {c.variety && (
                              <div className="text-[11px] text-muted-foreground">
                                Recommended Variety: <span className="font-medium text-foreground">{c.variety}</span>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                              <div className="text-muted-foreground">
                                Duration: <span className="font-mono text-foreground font-medium">{c.durationDays} days</span>
                              </div>
                              <div className="text-muted-foreground">
                                Target Yield: <span className="font-mono text-foreground font-medium">{c.expectedYieldPerAcre}</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                              {c.whyCrop}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 2. Budget Section */}
                    {section.key === "budget" && plan.budget && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            Total Input Cost
                          </span>
                          <div className="font-mono font-bold text-foreground num-tabular">
                            {formatCurrency(plan.budget.inputCostInr)}
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            Cost Per Acre
                          </span>
                          <div className="font-mono font-bold text-foreground num-tabular">
                            {formatCurrency(plan.budget.costPerAcreInr)}
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            Gross Revenue
                          </span>
                          <div className="font-mono font-bold text-foreground num-tabular">
                            {formatCurrency(plan.budget.expectedRevenueInr)}
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-secondary/30 border border-border/60 space-y-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            Net Profit Margin
                          </span>
                          <div className="font-mono font-bold text-primary num-tabular">
                            {formatCurrency(plan.budget.expectedNetMarginInr)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Irrigation Section */}
                    {section.key === "irrigation" && plan.irrigation && (
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded bg-secondary/20 border border-border/60 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Water Source:</span>
                            <span className="font-medium text-foreground">{plan.irrigation.source}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Frequency:</span>
                            <span className="font-medium text-foreground">{plan.irrigation.frequency}</span>
                          </div>
                        </div>
                        {plan.irrigation.criticalStages && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-semibold uppercase text-foreground">
                              Critical Moisture Stages:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1">
                              {plan.irrigation.criticalStages.map((stage, i) => (
                                <li key={i}>{stage}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {plan.irrigation.tips && (
                          <p className="text-[11px] text-muted-foreground italic leading-relaxed pt-1">
                            Tip: {plan.irrigation.tips}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 4. Schemes Section */}
                    {section.key === "schemes" && plan.schemes && (
                      <div className="space-y-2 text-xs">
                        {plan.schemes.map((s, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-secondary/20 border border-border/60 space-y-1"
                          >
                            <div className="font-bold text-foreground">{s.schemeName}</div>
                            <p className="text-muted-foreground">{s.benefit}</p>
                            <span className="text-[10px] text-primary block font-mono">
                              Eligibility: {s.eligibility}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 5. Timeline Section */}
                    {section.key === "timeline" && plan.timeline && (
                      <div className="space-y-2 text-xs">
                        {plan.timeline.map((t, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-secondary/20 border border-border/40 flex items-start gap-2.5"
                          >
                            <div className="font-mono text-[10px] text-muted-foreground shrink-0 w-20">
                              {t.timeframe}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{t.phase}</div>
                              <p className="text-muted-foreground mt-0.5">{t.action}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
