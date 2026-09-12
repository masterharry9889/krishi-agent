"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getFarmerToken,
  getFarmerContext,
  FarmerContextResponse,
  formatLanguageLabel,
  sendFarmerChatMessage,
  FarmerChatRequestPayload,
} from "@/lib/api";
import {
  ChatMessage,
  Attachment,
  FarmingPlanData,
  DiseaseDiagnosisData,
  SchemeData,
  MarketData,
  WeatherData,
  SoilData,
  ValidationInfo,
} from "@/components/chat/types";
import { MessageList } from "@/components/chat/MessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";

export default function FarmerChatPage({
  params,
}: {
  params: Promise<{ farmer_id: string }>;
}) {
  const resolvedParams = use(params);
  const farmerId = resolvedParams.farmer_id;
  const router = useRouter();

  const [farmerContext, setFarmerContext] = useState<FarmerContextResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Load Farmer Context & Check Auth
  useEffect(() => {
    const token = getFarmerToken();
    if (!token) {
      router.push("/farmer/login");
      return;
    }

    async function loadProfile() {
      try {
        const ctx = await getFarmerContext(farmerId);
        setFarmerContext(ctx);
      } catch (err: unknown) {
        console.warn("Could not load farmer context:", err);
      }
    }

    loadProfile();
  }, [farmerId, router]);

  // Dispatch real user input to backend AI agents & validation layer
  const processAgentResponse = useCallback(
    async (userMsg: ChatMessage, attachments: Attachment[]) => {
      setIsThinking(true);
      setNetworkError(null);

      try {
        // 1. Process image attachments to base64 if present
        const imageAttachment = attachments.find((a) => a.type === "image");
        let imageBase64: string | undefined = undefined;

        if (imageAttachment?.file) {
          imageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || "");
            reader.onerror = () => resolve("");
            reader.readAsDataURL(imageAttachment.file as File);
          });
        } else if (imageAttachment?.url?.startsWith("data:image")) {
          imageBase64 = imageAttachment.url;
        }

        const payload: FarmerChatRequestPayload = {
          message: userMsg.content,
          season_id: farmerContext?.season_id,
          image_base64: imageBase64,
          image_name: imageAttachment?.name,
          attachments: attachments.map((a) => ({
            name: a.name,
            type: a.type,
            url: a.url,
          })),
        };

        // 2. Call the real unified multi-agent chat endpoint
        const resp = await sendFarmerChatMessage(farmerId, payload, farmerContext?.season_id);

        const nowTime =
          resp.timestamp ||
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          });

        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: resp.message,
          timestamp: nowTime,
          type: resp.type || "text",
          planData: resp.planData,
          diagnosisData: resp.diagnosisData,
          schemeData: resp.schemeData,
          marketData: resp.marketData,
          weatherData: resp.weatherData,
          soilData: resp.soilData,
          validation: resp.validation,
          status: "sent",
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        console.error("Chat dispatch error:", err);
        const errMsg = err instanceof Error ? err.message : "Failed to connect to Krishi AI agents.";
        setNetworkError(errMsg);

        const errorMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an issue connecting to the AI agents. Please check your connection and tap Retry.",
          timestamp: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "text",
          status: "error",
          errorMessage: errMsg,
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsThinking(false);
      }
    },
    [farmerId, farmerContext]
  );

  const handleSendMessage = (text: string, attachments: Attachment[]) => {
    const nowTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: nowTime,
      attachments,
      status: "sent",
    };

    setMessages((prev) => [...prev, userMsg]);
    processAgentResponse(userMsg, attachments);
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSendMessage(prompt, []);
  };

  const handleRetryMessage = (messageId: string) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (targetMsg) {
      processAgentResponse(targetMsg, targetMsg.attachments || []);
    }
  };

  const farmerName = farmerContext?.profile?.name || "Farmer";
  const districtName = farmerContext?.profile?.district || "Maharashtra";
  const langLabel = formatLanguageLabel(farmerContext?.profile?.language || "hi");

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900 flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="bg-stone-900 border-b border-amber-900/30 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/farmer/dashboard"
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition border border-stone-700 flex items-center justify-center"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>

            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-800 border border-amber-500/30 flex items-center justify-center font-bold text-amber-300 text-base shadow-inner">
                🌾
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-serif font-bold text-base text-amber-100 leading-none">
                    Krishi Agent Chat
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                  {farmerName} • {districtName} ({langLabel})
                </p>
              </div>
            </div>
          </div>

          <div className="hidden sm:block">
            <Link
              href="/farmer/dashboard"
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Global Network Error Banner */}
      {networkError && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 text-xs px-4 py-2 text-center font-medium">
          ⚠️ {networkError}
        </div>
      )}

      {/* Scrollable Message List */}
      <MessageList
        messages={messages}
        isThinking={isThinking}
        onSuggestionClick={handleSuggestionClick}
        onRetryMessage={handleRetryMessage}
      />

      {/* Fixed Bottom Composer */}
      <ChatComposer onSendMessage={handleSendMessage} disabled={isThinking} />
    </div>
  );
}
