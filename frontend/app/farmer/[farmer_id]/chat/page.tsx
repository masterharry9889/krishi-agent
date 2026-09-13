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
} from "@/components/chat/types";
import { MessageList } from "@/components/chat/MessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { Wheat, ArrowLeft, LayoutDashboard, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
        // Build the request payload for the backend chat endpoint
        const chatPayload: FarmerChatRequestPayload = {
          message: userMsg.content,
        };

        // If an image attachment is present, convert it to base64 for the backend
        const imageAtt = attachments.find((a) => a.type === "image");
        if (imageAtt && imageAtt.file) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              // Strip the data URI prefix ("data:image/...;base64,")
              const b64 = result.includes(",") ? result.split(",")[1] : result;
              resolve(b64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageAtt.file!);
          });
          chatPayload.image_base64 = base64;
          chatPayload.image_name = imageAtt.name;
        } else if (imageAtt && imageAtt.url && !imageAtt.file) {
          // Already a data-URI or URL — extract base64 if possible
          if (imageAtt.url.startsWith("data:")) {
            const b64 = imageAtt.url.split(",")[1] || "";
            chatPayload.image_base64 = b64;
            chatPayload.image_name = imageAtt.name;
          }
        }

        // Attach crop_type hint from farmer context if available
        if (farmerContext?.profile?.past_crops && farmerContext.profile.past_crops.length > 0) {
          chatPayload.crop_type = farmerContext.profile.past_crops[0];
        }

        const resp = await sendFarmerChatMessage(farmerId, chatPayload);

        const nowTime = new Date().toLocaleTimeString("en-IN", {
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
          followUpSuggestions: resp.followUpSuggestions,
          status: "sent",
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
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

  const farmerName = farmerContext?.profile?.name || "Ramesh Patil";
  const districtName = farmerContext?.profile?.district ? `${farmerContext.profile.district}, MH` : "Nashik, MH";
  const plotId = farmerContext?.farmer_id || farmerId || "MH-NSK-0847";
  const langLabel = formatLanguageLabel(farmerContext?.profile?.language || "mr");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-background/90 backdrop-blur-md border-b border-border/80 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/farmer/dashboard"
              className="size-8 rounded-md bg-secondary hover:bg-muted border border-border flex items-center justify-center transition-colors text-foreground"
              title="Return to Farm Dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-2xs">
                <Wheat className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-sm text-foreground leading-none">
                    Krishi Agent Advisory
                  </h1>
                  <Badge variant="success" className="text-[9px] font-mono px-1.5 py-0">
                    Online
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {farmerName} · Plot #{plotId} · {districtName} ({langLabel})
                </p>
              </div>
            </div>
          </div>

          <div>
            <Link
              href="/farmer/dashboard"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
            >
              <LayoutDashboard className="size-3.5" />
              <span className="hidden sm:inline">Farm Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Network Error Banner */}
      {networkError && (
        <div className="bg-destructive/10 border-b border-destructive/20 text-destructive text-xs px-4 py-2 text-center font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="size-3.5" />
          {networkError}
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
