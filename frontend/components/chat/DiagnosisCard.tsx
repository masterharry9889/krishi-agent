"use client";

import React from "react";
import { DiseaseDiagnosisData } from "./types";

interface DiagnosisCardProps {
  diagnosis: DiseaseDiagnosisData;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ diagnosis }) => {
  const isHighConfidence = diagnosis.confidencePct >= 85;

  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 my-2 max-w-xl w-full">
      {/* Header Badge */}
      <div className="bg-rose-950 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 font-bold text-lg shrink-0">
            🔍
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-rose-100 leading-snug">
              {diagnosis.diseaseName}
            </h3>
            <p className="text-xs text-rose-300/90 font-sans">
              Crop: <strong className="text-white">{diagnosis.affectedCrop}</strong>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              isHighConfidence
                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                : "bg-amber-950 text-amber-300 border-amber-500/40"
            }`}
          >
            {diagnosis.confidencePct}% Match
          </span>
        </div>
      </div>

      {/* Matched Symptoms */}
      {diagnosis.symptomsMatched && diagnosis.symptomsMatched.length > 0 && (
        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-800 space-y-1.5">
          <span className="font-bold text-stone-900 uppercase tracking-wider text-[10px] block">
            Matched Symptoms from Photo:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-stone-700">
            {diagnosis.symptomsMatched.map((symptom, idx) => (
              <li key={idx}>{symptom}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Treatment Plan */}
      <div className="space-y-3 pt-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center space-x-1.5">
          <span>🩺</span>
          <span>Recommended Treatment Plan</span>
        </h4>

        {diagnosis.treatment.summary && (
          <p className="text-xs text-stone-700 leading-relaxed font-sans">
            {diagnosis.treatment.summary}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Organic Control */}
          {diagnosis.treatment.organicControl && (
            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 space-y-1">
              <span className="font-bold text-emerald-900 text-[11px] block flex items-center space-x-1">
                <span>🍃</span>
                <span>Organic Control</span>
              </span>
              <p className="text-emerald-950 text-[11px] leading-relaxed">
                {diagnosis.treatment.organicControl}
              </p>
            </div>
          )}

          {/* Chemical Control */}
          {diagnosis.treatment.chemicalControl && (
            <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-1">
              <span className="font-bold text-amber-900 text-[11px] block flex items-center space-x-1">
                <span>🧪</span>
                <span>Chemical Control</span>
              </span>
              <p className="text-amber-950 text-[11px] leading-relaxed">
                {diagnosis.treatment.chemicalControl}
              </p>
            </div>
          )}
        </div>

        {diagnosis.treatment.preventativeSteps && (
          <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-xs text-stone-700">
            <strong>Prevention:</strong> {diagnosis.treatment.preventativeSteps}
          </div>
        )}
      </div>

      {/* Source & Citation */}
      {diagnosis.citationSource && (
        <div className="text-[10px] text-stone-500 font-mono pt-1">
          Source: {diagnosis.citationSource}
        </div>
      )}

      {/* Visible Mandatory Disclaimer */}
      <div className="bg-amber-100/70 border border-amber-300 text-amber-900 text-xs rounded-xl p-3 flex items-start space-x-2">
        <span className="text-base font-bold shrink-0">⚠️</span>
        <span className="text-[11px] font-medium leading-snug">
          <strong>AI-assisted diagnosis:</strong> Confirm with your local Krishi Vigyan Kendra (KVK) or agriculture officer before applying treatments.
        </span>
      </div>
    </div>
  );
};
