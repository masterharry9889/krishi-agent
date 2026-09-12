"use client";

import React, { useState } from "react";
import { ValidationInfo } from "./types";

interface ValidationBadgeProps {
  validation?: ValidationInfo;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({ validation }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!validation) return null;

  const isVerified = validation.status === "verified";
  const hasWarnings = validation.warnings && validation.warnings.length > 0;

  return (
    <div className="mt-2 text-xs font-sans">
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition cursor-pointer text-[11px] font-medium shadow-2xs ${
          isVerified
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
            : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
        }`}
        title="Verified by Information Validation Agent"
      >
        <span>{isVerified ? "🛡️" : "⚠️"}</span>
        <span className="font-semibold">
          {isVerified ? "AI Information Validated" : "Validation Caution Active"}
        </span>
        <span className="text-[10px] text-stone-500 font-mono">
          ({validation.validation_score}%)
        </span>
        <svg
          className={`w-3 h-3 text-stone-500 transition-transform ${showDetails ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDetails && (
        <div className="mt-2 bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2 text-stone-800 max-w-lg shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <span className="font-bold text-[11px] text-stone-900 uppercase tracking-wider">
              Information Validation Report
            </span>
            <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded font-mono">
              Score: {validation.validation_score}%
            </span>
          </div>

          {/* Checks passed */}
          {validation.checks_passed && validation.checks_passed.length > 0 && (
            <div>
              <span className="font-semibold text-emerald-800 text-[10px] uppercase block mb-1">
                ✓ Verified Checks ({validation.checks_passed.length})
              </span>
              <ul className="space-y-1 text-[11px] text-stone-700">
                {validation.checks_passed.map((chk, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{chk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="bg-amber-50/80 border border-amber-200 p-2 rounded-lg text-amber-900 text-[11px]">
              <span className="font-bold text-[10px] uppercase block mb-0.5">⚠️ Cautionary Notes</span>
              <ul className="space-y-0.5 list-disc list-inside">
                {validation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Safety notices */}
          {validation.safety_notices && validation.safety_notices.length > 0 && (
            <div className="text-[10px] text-stone-500 font-sans border-t border-stone-200 pt-1.5">
              {validation.safety_notices.map((sn, i) => (
                <p key={i}>📌 {sn}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
