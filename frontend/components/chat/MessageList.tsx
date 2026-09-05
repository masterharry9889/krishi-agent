"use client";

import React, { useRef, useEffect } from "react";
import { ChatMessage } from "./types";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onSuggestionClick: (prompt: string) => void;
  onRetryMessage?: (messageId: string) => void;
}

const SUGGESTIONS = [
  {
    icon: "🌾",
    label: "Ask for a season plan for your 2-acre plot",
    prompt: "Can you create a complete season plan for my 2-acre plot including crop recommendations, budget, and irrigation?",
  },
  {
    icon: "📸",
    label: "Upload a photo of an affected leaf for diagnosis",
    prompt: "I have a photo of my tomato leaf with dark spots. Can you analyze the disease and suggest organic treatment?",
  },
  {
    icon: "💰",
    label: "Check local mandi prices & market timing",
    prompt: "What are the latest mandi prices for Onion and Soybean in Nashik district, and when is the best time to sell?",
  },
  {
    icon: "📜",
    label: "Check eligibility for PMFBY crop insurance & SHC",
    prompt: "What government crop insurance schemes (PMFBY) and soil health card subsidies am I eligible for?",
  },
];

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isThinking,
  onSuggestionClick,
  onRetryMessage,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 font-sans">
      {messages.length === 0 ? (
        // Empty State
        <div className="max-w-xl mx-auto py-8 sm:py-12 text-center space-y-6 animate-in fade-in duration-300">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-900/10 border border-emerald-700/20 text-emerald-800 flex items-center justify-center text-3xl shadow-inner">
            👨‍🌾
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
              Namaste! How can Krishi Agent help your farm today?
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
              Ask any question about crops, irrigation, soil health, government schemes, or upload a photo of your leaf/crop for Instant Disease Diagnosis.
            </p>
          </div>

          {/* Suggestion Pills Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
            {SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSuggestionClick(item.prompt)}
                className="p-3.5 bg-white hover:bg-amber-50/60 border border-stone-200 hover:border-amber-300 rounded-xl transition duration-150 shadow-2xs group focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <div className="flex items-start space-x-3">
                  <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span className="text-xs font-medium text-stone-800 group-hover:text-amber-950 leading-snug">
                    {item.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Message Bubbles List
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onRetry={onRetryMessage} />
          ))}

          {/* Thinking / Processing State */}
          {isThinking && (
            <div className="flex items-center space-x-3 my-4">
              <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-300 border border-amber-900/50 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                🌾
              </div>
              <div className="bg-white border border-stone-200 p-3.5 rounded-2xl rounded-tl-xs shadow-2xs flex items-center space-x-2 text-xs text-stone-700 font-sans">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="font-medium text-stone-600">
                  Krishi AI is analyzing soil, weather & disease database...
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};
