"use client";

import React, { useRef, useEffect } from "react";
import { ChatMessage } from "./types";
import { MessageBubble } from "./MessageBubble";
import { Wheat, Sprout, Camera, IndianRupee, ScrollText, Loader2, Sparkles } from "lucide-react";

interface MessageListProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onSuggestionClick: (prompt: string) => void;
  onRetryMessage?: (messageId: string) => void;
}

const SUGGESTIONS = [
  {
    icon: <Sprout className="size-4 text-primary" />,
    label: "Ask for a complete 2-acre season plan",
    prompt: "Can you create a complete season plan for my 2-acre plot including crop recommendations, budget, and irrigation?",
  },
  {
    icon: <Camera className="size-4 text-amber-600 dark:text-amber-400" />,
    label: "Upload a photo of an affected leaf for diagnosis",
    prompt: "I have a photo of my tomato leaf with dark spots. Can you analyze the disease and suggest organic treatment?",
  },
  {
    icon: <IndianRupee className="size-4 text-emerald-600 dark:text-emerald-400" />,
    label: "Check local APMC mandi prices & sell timing",
    prompt: "What are the latest mandi prices for Onion and Soybean in Nashik district, and when is the best time to sell?",
  },
  {
    icon: <ScrollText className="size-4 text-primary" />,
    label: "Verify PMFBY insurance & SHC subsidies",
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
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 bg-background">
      {messages.length === 0 ? (
        /* Empty State */
        <div className="max-w-xl mx-auto py-8 sm:py-16 text-center space-y-6">
          <div className="size-12 mx-auto rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
            <Wheat className="size-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Krishi Agent Agronomic Workspace
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Ask any diagnostic question regarding crop selection, soil chemistry, water requirements,
              or upload leaf photographs for instant disease pathology detection.
            </p>
          </div>

          {/* Suggestion Prompt Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-2">
            {SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSuggestionClick(item.prompt)}
                className="p-3.5 rounded-md border border-border/80 bg-card hover:border-primary/50 transition-all text-left group cursor-pointer shadow-2xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="shrink-0 mt-0.5">{item.icon}</span>
                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                    {item.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Messages Stream */
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onRetry={onRetryMessage} />
          ))}

          {/* Thinking / Agent Processing State */}
          {isThinking && (
            <div className="flex items-center gap-2.5 my-3">
              <div className="size-7 rounded-md bg-primary border border-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs">
                <Wheat className="size-3.5" />
              </div>
              <div className="rounded-lg border border-border/80 bg-card p-3 flex items-center gap-2 text-xs text-muted-foreground shadow-2xs">
                <Loader2 className="size-3.5 text-primary animate-spin" />
                <span className="font-medium text-foreground">
                  Orchestrating agents across Soil, Weather, and Mandi feeds...
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
