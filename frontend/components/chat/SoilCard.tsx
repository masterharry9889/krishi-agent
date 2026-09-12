"use client";

import React from "react";
import { SoilData } from "./types";

interface SoilCardProps {
  soilData: SoilData;
}

export const SoilCard: React.FC<SoilCardProps> = ({ soilData }) => {
  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 my-2 max-w-xl w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 to-stone-900 text-white p-3.5 rounded-xl shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-lg shrink-0">
            🌱
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-amber-100 leading-snug">
              Soil Health & Fertility Report
            </h3>
            <p className="text-xs text-stone-300 font-sans">
              {soilData.soilType} • {soilData.location}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-base font-bold font-mono text-amber-300 block">
            pH {soilData.ph}
          </span>
          <span className="text-[10px] text-stone-300 font-sans block">
            {soilData.phStatus}
          </span>
        </div>
      </div>

      {/* Primary Nutrients (NPK + OC) Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-stone-50 p-2 rounded-xl border border-stone-200">
          <span className="text-[10px] uppercase text-stone-500 font-bold block">Organic Carbon</span>
          <span className="text-xs font-bold text-stone-900 font-mono block mt-0.5">
            {soilData.organicCarbon}
          </span>
        </div>
        <div className="bg-stone-50 p-2 rounded-xl border border-stone-200">
          <span className="text-[10px] uppercase text-stone-500 font-bold block">Nitrogen (N)</span>
          <span className="text-xs font-bold text-stone-900 font-mono block mt-0.5">
            {soilData.nitrogen}
          </span>
        </div>
        <div className="bg-stone-50 p-2 rounded-xl border border-stone-200">
          <span className="text-[10px] uppercase text-stone-500 font-bold block">Phosphorus (P)</span>
          <span className="text-xs font-bold text-stone-900 font-mono block mt-0.5">
            {soilData.phosphorus}
          </span>
        </div>
        <div className="bg-stone-50 p-2 rounded-xl border border-stone-200">
          <span className="text-[10px] uppercase text-stone-500 font-bold block">Potassium (K)</span>
          <span className="text-xs font-bold text-stone-900 font-mono block mt-0.5">
            {soilData.potassium}
          </span>
        </div>
      </div>

      {/* Micronutrients */}
      {soilData.micronutrients && soilData.micronutrients.length > 0 && (
        <div className="space-y-1.5">
          <span className="font-bold text-stone-900 uppercase tracking-wider text-[10px] block">
            Micronutrients Status:
          </span>
          <div className="space-y-1 text-xs">
            {soilData.micronutrients.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-stone-50 rounded-lg border border-stone-200"
              >
                <div>
                  <span className="font-bold text-stone-900">{item.nutrient}</span>
                  <span className="text-[11px] text-stone-600 block">{item.recommendation}</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    item.status.toLowerCase().includes("defic")
                      ? "bg-rose-100 text-rose-900"
                      : "bg-emerald-100 text-emerald-900"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corrective Soil Health Actions */}
      {soilData.correctiveActions && soilData.correctiveActions.length > 0 && (
        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
          <span className="font-bold text-amber-950 uppercase tracking-wider text-[10px] block">
            Recommended Soil Actions:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-amber-900 text-[11px] leading-relaxed">
            {soilData.correctiveActions.map((act, idx) => (
              <li key={idx}>{act}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Source */}
      {soilData.source && (
        <div className="text-[10px] text-stone-500 font-mono pt-1">
          Source: {soilData.source}
        </div>
      )}
    </div>
  );
};
