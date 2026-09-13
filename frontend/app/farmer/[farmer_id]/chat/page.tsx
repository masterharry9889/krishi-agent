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

      const hasImage = attachments.some((a) => a.type === "image");
      const userText = userMsg.content.toLowerCase();

      // Check query intent
      const isPlanQuery =
        userText.includes("plan") ||
        userText.includes("season") ||
        userText.includes("acre") ||
        userText.includes("recommend");

      const isDiagnosisQuery =
        hasImage ||
        userText.includes("photo") ||
        userText.includes("leaf") ||
        userText.includes("spot") ||
        userText.includes("disease");

      // Simulated latency for AI Agent orchestration pipeline
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const nowTime = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: "Based on computer vision analysis of your leaf photo, here is the diagnosis and recommended treatment plan:",
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

        setMessages((prev) => [...prev, diagnosisMsg]);
      } else if (isPlanQuery) {
        // Structured Farming Plan Response
        const districtName = farmerContext?.profile?.district || "Nashik";
        const samplePlan: FarmingPlanData = {
          title: `Custom Season Farming Plan — ${districtName} District`,
          summary: `Comprehensive plan computed for ${farmerContext?.profile?.name || "Farmer"} in ${districtName}. Balances high yield, low water requirement, and PMFBY crop insurance protection.`,
          crops: [
            {
              name: "Red Onion (Arka Kalyan)",
              variety: "Rabi Season Variety",
              suitabilityScore: 94,
              durationDays: 120,
              expectedYieldPerAcre: "10 - 12 Tonnes / Acre",
              whyCrop: "Ideal soil pH and strong market demand in Nashik / Lasalgaon APMC mandi.",
            },
            {
              name: "Soybean (JS 335)",
              variety: "Kharif Variety",
              suitabilityScore: 88,
              durationDays: 95,
              expectedYieldPerAcre: "1.2 - 1.5 Tonnes / Acre",
              whyCrop: "Excellent nitrogen fixing capability; low maintenance cost.",
            },
          ],
          budget: {
            costPerAcreInr: 28500,
            inputCostInr: 57000,
            expectedRevenueInr: 145000,
            expectedNetMarginInr: 88000,
            currency: "INR",
          },
          irrigation: {
            source: farmerContext?.profile?.water_source || "Drip & Rainfed",
            frequency: "Every 4 to 6 days during vegetative growth",
            criticalStages: [
              "Bulb initiation phase (Day 35 - 45)",
              "Bulb enlargement phase (Day 60 - 80)",
            ],
            tips: "Use drip lines with 4 LPH emitters to conserve up to 40% groundwater.",
          },
          schemes: [
            {
              schemeName: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
              benefit: "Comprehensive crop insurance at 1.5% subsidized premium.",
              eligibility: "All registered farmers growing notified crops in notified areas.",
            },
            {
              schemeName: "Soil Health Card (SHC) Subsidy",
              benefit: "Free micro-nutrient testing & customized fertilizer advice.",
              eligibility: "Available to smallholder farmers.",
            },
          ],
          timeline: [
            {
              phase: "Phase 1: Soil Preparation",
              timeframe: "Week 1 - 2",
              action: "Deep plowing, FYM compost application @ 5 tonnes/acre, soil health testing.",
            },
            {
              phase: "Phase 2: Sowing & Base Dosing",
              timeframe: "Week 3",
              action: "Sowing certified seed with bio-fertilizer Trichoderma treatment.",
            },
            {
              phase: "Phase 3: Nutrient & Pest Monitoring",
              timeframe: "Week 5 - 10",
              action: "Top dressing Nitrogen, leaf health photo scans via Krishi Agent.",
            },
            {
              phase: "Phase 4: Harvest & Mandi Sale",
              timeframe: "Week 16 - 17",
              action: "Curing, grading, and selling at recommended Agmarknet peak price windows.",
            },
          ],
        };

        const planMsg: ChatMessage = {
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
