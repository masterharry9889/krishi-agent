"use client";

import React, { useState } from "react";
import { ChatMessage } from "./types";
import { FarmingPlanCard } from "./FarmingPlanCard";
import { DiagnosisCard } from "./DiagnosisCard";
import { SchemeCard } from "./SchemeCard";
import { MarketCard } from "./MarketCard";
import { WeatherCard } from "./WeatherCard";
import { SoilCard } from "./SoilCard";
import { ValidationBadge } from "./ValidationBadge";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetry }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isStreaming = message.status === "streaming";

  return (
    <div
      className={`flex items-start space-x-2.5 sm:space-x-3 my-3.5 ${
        isUser ? "flex-row-reverse space-x-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
          isUser
            ? "bg-emerald-800 text-amber-200 border border-emerald-600/40"
            : "bg-stone-900 text-amber-300 border border-amber-900/50"
        }`}
      >
        {isUser ? "F" : "🌾"}
      </div>

      {/* Message Container */}
      <div className={`flex flex-col max-w-[88%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Role Name & Time */}
        <div className="flex items-center space-x-2 mb-1 px-1 text-[11px] text-stone-500 font-sans">
          <span className="font-semibold text-stone-700">
            {isUser ? "You" : "Krishi AI Agent"}
          </span>
          <span>•</span>
          <span className="font-mono">{message.timestamp}</span>
        </div>

        {/* Attachment Thumbnails */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att) => (
              <div key={att.id} className="relative group rounded-xl overflow-hidden border border-stone-300 shadow-2xs">
                {att.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-36 h-36 object-cover cursor-pointer hover:opacity-90 transition"
                    onClick={() => setSelectedImage(att.url)}
                  />
                ) : (
                  <div className="p-3 bg-stone-100 flex items-center space-x-2 text-xs text-stone-800">
                    <span>📄</span>
                    <span className="truncate max-w-[140px] font-mono">{att.name}</span>
                  </div>
                )}
                {att.caption && (
                  <div className="bg-stone-900/80 text-white text-[10px] p-1 px-2 font-sans truncate">
                    {att.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Analyzing / Attachment Processing Indicator */}
        {message.type === "attachment_analyzing" && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-2xl text-xs flex items-center space-x-2.5 animate-pulse">
            <svg className="w-4 h-4 animate-spin text-amber-700" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Analyzing crop photo & matching disease database...</span>
          </div>
        )}

        {/* Message Bubble Content */}
        {message.content && (
          <div
            className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed font-sans shadow-2xs ${
              isUser
                ? "bg-emerald-800 text-white rounded-tr-xs"
                : isError
                ? "bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-xs"
                : "bg-white border border-stone-200 text-stone-900 rounded-tl-xs"
            }`}
          >
            <div className="whitespace-pre-wrap break-words">{message.content}</div>

            {/* Streaming Cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-amber-500 animate-pulse" />
            )}
          </div>
        )}

        {/* Structured Farming Plan Card */}
        {message.type === "plan" && message.planData && (
          <FarmingPlanCard plan={message.planData} />
        )}

        {/* Structured Disease Diagnosis Card */}
        {message.type === "diagnosis" && message.diagnosisData && (
          <DiagnosisCard diagnosis={message.diagnosisData} />
        )}

        {/* Structured Government Scheme Card */}
        {message.type === "scheme" && message.schemeData && (
          <SchemeCard schemeData={message.schemeData} />
        )}

        {/* Structured Market Mandi Card */}
        {message.type === "market" && message.marketData && (
          <MarketCard marketData={message.marketData} />
        )}

        {/* Structured Weather Forecast Card */}
        {message.type === "weather" && message.weatherData && (
          <WeatherCard weatherData={message.weatherData} />
        )}

        {/* Structured Soil Fertility Card */}
        {message.type === "soil" && message.soilData && (
          <SoilCard soilData={message.soilData} />
        )}

        {/* Information Validation Badge for Assistant Responses */}
        {!isUser && message.validation && (
          <ValidationBadge validation={message.validation} />
        )}

        {/* Error Retry Affordance */}
        {isError && (
          <div className="mt-1.5 flex items-center space-x-2 text-xs text-rose-700">
            <span>⚠️ {message.errorMessage || "Failed to deliver message."}</span>
            {onRetry && (
              <button
                onClick={() => onRetry(message.id)}
                className="underline font-bold hover:text-rose-900 focus:outline-none"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-stone-900/80 text-white p-2 rounded-full hover:bg-stone-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
