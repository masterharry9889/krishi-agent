"use client";

import React from "react";
import { MarketData } from "./types";

interface MarketCardProps {
  marketData: MarketData;
}

export const MarketCard: React.FC<MarketCardProps> = ({ marketData }) => {
  const getTrendBadge = (trend: string, trendPct?: string) => {
    const t = trend.toLowerCase();
    if (t.includes("increase") || t.includes("bullish") || t.includes("firm")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          ▲ Rising {trendPct ? `(${trendPct})` : ""}
        </span>
      );
    }
    if (t.includes("decrease") || t.includes("bearish") || t.includes("down")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
          ▼ Softening {trendPct ? `(${trendPct})` : ""}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-300">
        ● Stable {trendPct ? `(${trendPct})` : ""}
      </span>
    );
  };

  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 my-2 max-w-xl w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-amber-900 text-white p-3.5 rounded-xl shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-lg shrink-0">
            📊
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-amber-100 leading-snug">
              {marketData.mandiName || "APMC Mandi Intelligence"}
            </h3>
            <p className="text-xs text-stone-300 font-sans">
              Live Mandi Modal Rates • Updated {marketData.updatedDate}
            </p>
          </div>
        </div>
        <span className="bg-emerald-950 text-emerald-300 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/30">
          Agmarknet
        </span>
      </div>

      {/* Commodity Cards Grid */}
      <div className="space-y-3">
        {marketData.commodities.map((item, idx) => (
          <div
            key={idx}
            className="border border-stone-200 bg-stone-50/60 rounded-xl p-3.5 space-y-2 hover:border-amber-300 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-stone-900 block">
                  {item.crop}
                </span>
                {item.variety && (
                  <span className="text-[11px] text-stone-500 font-sans">
                    Variety: {item.variety}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono text-emerald-950 block">
                  ₹{item.modalPriceInr.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  {item.unit}
                </span>
              </div>
            </div>

            {/* Price Range & Trend */}
            <div className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-stone-200/80">
              <div className="text-[11px] text-stone-600 font-mono">
                Range: <strong>₹{item.minPriceInr.toLocaleString("en-IN")}</strong> - <strong>₹{item.maxPriceInr.toLocaleString("en-IN")}</strong>
              </div>
              <div>{getTrendBadge(item.trend, item.trendPct)}</div>
            </div>

            {/* Sell timing recommendation */}
            {item.recommendation && (
              <p className="text-xs text-stone-700 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                💡 <strong>Sell Timing:</strong> {item.recommendation}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Selling Strategy */}
      {marketData.sellingStrategy && (
        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-800 space-y-1">
          <span className="font-bold text-stone-900 uppercase tracking-wider text-[10px] block">
            Recommended Selling Strategy:
          </span>
          <p className="text-stone-700 leading-relaxed">{marketData.sellingStrategy}</p>
        </div>
      )}

      {/* Attribution Source */}
      {marketData.source && (
        <div className="text-[10px] text-stone-500 font-mono pt-1">
          Source: {marketData.source}
        </div>
      )}
    </div>
  );
};
