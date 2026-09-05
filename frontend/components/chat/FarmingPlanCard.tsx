"use client";

import React, { useState } from "react";
import { FarmingPlanData } from "./types";

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

  return (
    <div className="bg-stone-50 border border-emerald-800/30 rounded-2xl p-4 sm:p-5 shadow-sm text-stone-900 space-y-4 my-2 max-w-xl w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white p-3.5 rounded-xl shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-lg shrink-0">
            🌾
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-amber-100 leading-snug">
              {plan.title || "Custom Farm Season Plan"}
            </h3>
            <p className="text-xs text-emerald-200/90 font-sans">
              Tailored Season Intelligence & AI Recommendations
            </p>
          </div>
        </div>
        <span className="bg-emerald-950/80 text-amber-300 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-amber-500/30">
          AI Verified
        </span>
      </div>

      {plan.summary && (
        <p className="text-xs text-stone-700 leading-relaxed font-sans px-1">
          {plan.summary}
        </p>
      )}

      {/* Accordion Sections */}
      <div className="space-y-2.5">
        {/* 1. Recommended Crops */}
        <div className="border border-stone-200 bg-white rounded-xl overflow-hidden transition shadow-2xs">
          <button
            type="button"
            onClick={() => toggleSection("crops")}
            className="w-full px-4 py-3 bg-stone-100/70 hover:bg-stone-100 flex items-center justify-between text-left font-semibold text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex items-center space-x-2">
              <span className="text-base">🌱</span>
              <span className="text-stone-900 font-bold">1. Recommended Crops ({plan.crops.length})</span>
            </div>
            <svg
              className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                openSection === "crops" ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openSection === "crops" && (
            <div className="p-4 space-y-3 border-t border-stone-200/80">
              {plan.crops.map((crop, idx) => (
                <div
                  key={idx}
                  className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-950">
                      {crop.name} {crop.variety ? `(${crop.variety})` : ""}
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      {crop.suitabilityScore}% Suitability
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 font-sans">
                    <span>⏱️ Duration: <strong>{crop.durationDays} days</strong></span>
                    <span>📦 Est. Yield: <strong>{crop.expectedYieldPerAcre}</strong></span>
                  </div>
                  <p className="text-xs text-stone-700 leading-normal pt-1 border-t border-amber-200/50">
                    💡 <em>{crop.whyCrop}</em>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Budget & Financial Snapshot */}
        <div className="border border-stone-200 bg-white rounded-xl overflow-hidden transition shadow-2xs">
          <button
            type="button"
            onClick={() => toggleSection("budget")}
            className="w-full px-4 py-3 bg-stone-100/70 hover:bg-stone-100 flex items-center justify-between text-left font-semibold text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex items-center space-x-2">
              <span className="text-base">💰</span>
              <span className="text-stone-900 font-bold">2. Estimated Budget & Expected Margin</span>
            </div>
            <svg
              className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                openSection === "budget" ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openSection === "budget" && plan.budget && (
            <div className="p-4 border-t border-stone-200/80">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <span className="text-[10px] uppercase text-stone-500 font-semibold block">Input Cost / Acre</span>
                  <span className="text-sm font-bold font-mono text-stone-900">
                    {formatCurrency(plan.budget.costPerAcreInr)}
                  </span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <span className="text-[10px] uppercase text-stone-500 font-semibold block">Total Estimated Cost</span>
                  <span className="text-sm font-bold font-mono text-stone-900">
                    {formatCurrency(plan.budget.inputCostInr)}
                  </span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-[10px] uppercase text-emerald-700 font-semibold block">Est. Revenue</span>
                  <span className="text-sm font-bold font-mono text-emerald-900">
                    {formatCurrency(plan.budget.expectedRevenueInr)}
                  </span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-300">
                  <span className="text-[10px] uppercase text-amber-800 font-semibold block">Est. Net Profit</span>
                  <span className="text-sm font-bold font-mono text-amber-950">
                    {formatCurrency(plan.budget.expectedNetMarginInr)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Irrigation Schedule */}
        <div className="border border-stone-200 bg-white rounded-xl overflow-hidden transition shadow-2xs">
          <button
            type="button"
            onClick={() => toggleSection("irrigation")}
            className="w-full px-4 py-3 bg-stone-100/70 hover:bg-stone-100 flex items-center justify-between text-left font-semibold text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex items-center space-x-2">
              <span className="text-base">💧</span>
              <span className="text-stone-900 font-bold">3. Irrigation & Water Management</span>
            </div>
            <svg
              className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                openSection === "irrigation" ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openSection === "irrigation" && plan.irrigation && (
            <div className="p-4 space-y-2.5 text-xs text-stone-800 border-t border-stone-200/80">
              <div className="flex items-center justify-between bg-sky-50 p-2.5 rounded-lg border border-sky-200">
                <span>Water Source: <strong>{plan.irrigation.source}</strong></span>
                <span>Frequency: <strong>{plan.irrigation.frequency}</strong></span>
              </div>
              <div>
                <span className="font-semibold text-stone-700 block mb-1">Critical Crop Stages for Watering:</span>
                <ul className="list-disc list-inside space-y-1 text-stone-700 pl-1">
                  {plan.irrigation.criticalStages.map((stage, i) => (
                    <li key={i}>{stage}</li>
                  ))}
                </ul>
              </div>
              {plan.irrigation.tips && (
                <p className="text-stone-600 bg-stone-50 p-2 rounded border border-stone-200 text-[11px]">
                  💧 <strong>Water Saving Tip:</strong> {plan.irrigation.tips}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 4. Government Schemes & Subsidies */}
        <div className="border border-stone-200 bg-white rounded-xl overflow-hidden transition shadow-2xs">
          <button
            type="button"
            onClick={() => toggleSection("schemes")}
            className="w-full px-4 py-3 bg-stone-100/70 hover:bg-stone-100 flex items-center justify-between text-left font-semibold text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex items-center space-x-2">
              <span className="text-base">📜</span>
              <span className="text-stone-900 font-bold">4. Government Schemes & Insurance</span>
            </div>
            <svg
              className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                openSection === "schemes" ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openSection === "schemes" && plan.schemes && (
            <div className="p-4 space-y-2.5 border-t border-stone-200/80">
              {plan.schemes.map((s, idx) => (
                <div key={idx} className="bg-stone-50 p-3 rounded-lg border border-stone-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900">{s.schemeName}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                      Eligible
                    </span>
                  </div>
                  <p className="text-stone-700">{s.benefit}</p>
                  <p className="text-stone-500 text-[11px]">Criteria: {s.eligibility}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Operation Timeline */}
        <div className="border border-stone-200 bg-white rounded-xl overflow-hidden transition shadow-2xs">
          <button
            type="button"
            onClick={() => toggleSection("timeline")}
            className="w-full px-4 py-3 bg-stone-100/70 hover:bg-stone-100 flex items-center justify-between text-left font-semibold text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex items-center space-x-2">
              <span className="text-base">📅</span>
              <span className="text-stone-900 font-bold">5. Season Action Timeline</span>
            </div>
            <svg
              className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                openSection === "timeline" ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openSection === "timeline" && plan.timeline && (
            <div className="p-4 space-y-3 border-t border-stone-200/80 text-xs">
              {plan.timeline.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-bold text-stone-900">{item.phase}</span>{" "}
                    <span className="text-amber-800 font-mono text-[11px]">({item.timeframe})</span>
                    <p className="text-stone-600 mt-0.5">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
