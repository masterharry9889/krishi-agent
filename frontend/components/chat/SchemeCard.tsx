"use client";

import React, { useState } from "react";
import { SchemeData } from "./types";
import { ValidationBadge } from "./ValidationBadge";

interface SchemeCardProps {
  schemeData: SchemeData;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({ schemeData }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleScheme = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 my-2 max-w-xl w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-amber-950 text-white p-3.5 rounded-xl shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-lg shrink-0">
            📜
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-amber-100 leading-snug">
              {schemeData.title || "Government Schemes Match"}
            </h3>
            <p className="text-xs text-stone-300 font-sans">
              {schemeData.district ? `${schemeData.district} District • ` : ""}
              Subsidies & Protection
            </p>
          </div>
        </div>
        <span className="bg-emerald-950 text-emerald-300 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/30">
          Govt Verified
        </span>
      </div>

      {schemeData.summary && (
        <p className="text-xs text-stone-700 leading-relaxed font-sans px-1">
          {schemeData.summary}
        </p>
      )}

      {/* Schemes Accordion */}
      <div className="space-y-2.5">
        {schemeData.schemes.map((s, idx) => {
          const schemeTitle = s.schemeName || s.name || "Government Scheme";
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={idx}
              className="border border-stone-200 bg-stone-50/50 rounded-xl overflow-hidden transition shadow-2xs"
            >
              <button
                type="button"
                onClick={() => toggleScheme(idx)}
                className="w-full px-4 py-3 bg-stone-100/70 hover:bg-stone-100 flex items-center justify-between text-left font-semibold text-xs text-stone-900 focus:outline-none"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-800 text-amber-200 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-stone-900 block">{schemeTitle}</span>
                    {s.category && (
                      <span className="text-[10px] text-emerald-700 font-normal">
                        {s.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold hidden sm:inline-block">
                    Eligible
                  </span>
                  <svg
                    className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 space-y-2.5 bg-white border-t border-stone-200 text-xs text-stone-800">
                  <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80">
                    <span className="font-bold text-emerald-950 text-[11px] block">
                      🎁 Subsidy / Financial Benefit:
                    </span>
                    <p className="text-emerald-900 mt-0.5 leading-relaxed">{s.benefit}</p>
                  </div>

                  <div>
                    <span className="font-bold text-stone-700 text-[11px] block">
                      📋 Eligibility Criteria:
                    </span>
                    <p className="text-stone-600 mt-0.5">{s.eligibility}</p>
                  </div>

                  {s.howToApply && (
                    <div>
                      <span className="font-bold text-stone-700 text-[11px] block">
                        🚀 How to Apply:
                      </span>
                      <p className="text-stone-600 mt-0.5">{s.howToApply}</p>
                    </div>
                  )}

                  {s.link && (
                    <div className="pt-1">
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs text-amber-800 hover:text-amber-950 font-bold underline"
                      >
                        <span>Official Portal: {s.link}</span>
                        <span>↗</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Official disclaimer note */}
      <div className="text-[10px] text-stone-500 font-sans bg-stone-100 p-2.5 rounded-xl border border-stone-200">
        💡 <strong>Official Portal Reminder:</strong> Schemes, subsidy percentages, and cutoff dates are subject to seasonal revisions by central/state departments. Always verify and register at official government portals.
      </div>
    </div>
  );
};
