"use client";

import React from "react";
import { WeatherData } from "./types";

interface WeatherCardProps {
  weatherData: WeatherData;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weatherData }) => {
  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 my-2 max-w-xl w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-950 to-stone-900 text-white p-3.5 rounded-xl shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 font-bold text-lg shrink-0">
            🌤️
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-sky-100 leading-snug">
              {weatherData.location} Weather Forecast
            </h3>
            <p className="text-xs text-stone-300 font-sans">
              7-Day Outlook & Farm Advisories
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold font-mono text-amber-200">
            {weatherData.currentTemp}°C
          </span>
          <span className="text-[10px] text-stone-300 block font-sans">
            Humidity {weatherData.humidityPct}%
          </span>
        </div>
      </div>

      {/* 7-Day Micro Forecast Table */}
      <div className="overflow-x-auto pb-1">
        <div className="flex space-x-2 min-w-[480px]">
          {weatherData.forecast.map((day, idx) => (
            <div
              key={idx}
              className={`flex-1 p-2 rounded-xl text-center border text-xs ${
                day.rainMm > 5
                  ? "bg-sky-50 border-sky-300 text-sky-950 font-medium"
                  : "bg-stone-50 border-stone-200 text-stone-800"
              }`}
            >
              <span className="font-bold block text-[11px] text-stone-700">{day.day}</span>
              <span className="text-base my-0.5 block">
                {day.rainMm > 8 ? "🌧️" : day.rainMm > 0 ? "🌦️" : "☀️"}
              </span>
              <span className="font-mono text-[11px] block font-bold">
                {day.tempMax}° / {day.tempMin}°
              </span>
              <span className="text-[10px] text-stone-500 block font-mono">
                {day.rainMm > 0 ? `${day.rainMm}mm` : "0mm"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weather Alerts & Farm Nudges */}
      {weatherData.alerts && weatherData.alerts.length > 0 && (
        <div className="space-y-2">
          <span className="font-bold text-stone-900 uppercase tracking-wider text-[10px] block">
            Agronomic Action Nudges:
          </span>
          {weatherData.alerts.map((alert, idx) => (
            <div
              key={idx}
              className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-950 flex items-start space-x-2"
            >
              <span className="text-sm shrink-0">⚠️</span>
              <p className="leading-snug">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Source */}
      {weatherData.source && (
        <div className="text-[10px] text-stone-500 font-mono pt-1">
          Source: {weatherData.source}
        </div>
      )}
    </div>
  );
};
