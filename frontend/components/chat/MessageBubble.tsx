"use client";

import React, { useState } from "react";
import { ChatMessage } from "./types";
import { FarmingPlanCard } from "./FarmingPlanCard";
import { DiagnosisCard } from "./DiagnosisCard";
<<<<<<< HEAD
import { SchemeCard } from "./SchemeCard";
import { MarketCard } from "./MarketCard";
import { WeatherCard } from "./WeatherCard";
import { SoilCard } from "./SoilCard";
import { ValidationBadge } from "./ValidationBadge";
=======
import { Wheat, User, FileText, X, AlertTriangle, RotateCcw } from "lucide-react";
>>>>>>> 8914a1b (Full UI Transformation)

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
      className={`flex items-start gap-2.5 sm:gap-3 my-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`size-7 sm:size-8 rounded-md flex items-center justify-center shrink-0 border ${
          isUser
            ? "bg-secondary border-border/80 text-foreground"
            : "bg-primary border-primary text-primary-foreground shadow-2xs"
        }`}
      >
        {isUser ? (
          <User className="size-3.5 text-foreground" />
        ) : (
          <Wheat className="size-4 text-primary-foreground" />
        )}
      </div>

      {/* Message Container */}
      <div className={`flex flex-col max-w-[88%] sm:max-w-[82%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Role Name & Time */}
        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {isUser ? "You" : "Krishi AI Agent"}
          </span>
          <span>•</span>
          <span className="font-mono text-[10px]">{message.timestamp}</span>
        </div>

        {/* Attachment Thumbnails */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att) => (
              <div key={att.id} className="relative group rounded-md overflow-hidden border border-border/80">
                {att.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-32 h-32 object-cover cursor-pointer hover:opacity-90 transition"
                    onClick={() => setSelectedImage(att.url)}
                  />
                ) : (
                  <div className="p-2.5 bg-secondary flex items-center gap-2 text-xs text-foreground">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="truncate max-w-[140px] font-mono">{att.name}</span>
                  </div>
                )}
                {att.caption && (
                  <div className="bg-foreground/90 text-background text-[10px] p-1 px-2 truncate">
                    {att.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Analyzing / Attachment Processing Indicator */}
        {message.type === "attachment_analyzing" && (
          <div className="bg-secondary/60 border border-border/80 text-foreground p-3 rounded-md text-xs flex items-center gap-2.5">
            <svg className="size-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Analyzing leaf pathology & querying ICAR disease database...</span>
          </div>
        )}

        {/* Message Bubble Content */}
        {message.content && (
          <div
            className={`p-3.5 rounded-lg text-xs sm:text-sm leading-relaxed ${
              isUser
                ? "bg-primary text-primary-foreground shadow-2xs"
                : isError
                ? "bg-destructive/10 border border-destructive/20 text-destructive"
                : "bg-card border border-border/80 text-card-foreground shadow-2xs"
            }`}
          >
            <div className="whitespace-pre-wrap break-words">{message.content}</div>

            {/* Streaming Cursor */}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse" />
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
          <div className="mt-1.5 flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="size-3.5" />
            <span>{message.errorMessage || "Failed to deliver message."}</span>
            {onRetry && (
              <button
                onClick={() => onRetry(message.id)}
                className="underline font-semibold hover:text-destructive/80 focus:outline-none flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3" /> Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-black"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
