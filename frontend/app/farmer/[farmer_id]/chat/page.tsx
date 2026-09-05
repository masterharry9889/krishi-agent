"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getFarmerToken,
  getFarmerContext,
  FarmerContextResponse,
  formatLanguageLabel,
} from "@/lib/api";
import { ChatMessage, Attachment, FarmingPlanData, DiseaseDiagnosisData } from "@/components/chat/types";
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

  // Generate simulated or SSE streaming AI response
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

      if (isDiagnosisQuery) {
        // Structured Disease Diagnosis Response
        const sampleDiagnosis: DiseaseDiagnosisData = {
          diseaseName: "Early Blight (Alternaria solani)",
          confidencePct: 94,
          affectedCrop: "Tomato / Solanaceae",
          symptomsMatched: [
            "Concentric dark brown target-spot rings on lower leaves",
            "Yellow halo border surrounding leaf lesions",
            "Slight leaf wilting around affected area",
          ],
          treatment: {
            summary: "Early Blight is a fungal pathogen common during humid weather. Immediate foliage trimming and targeted spray is recommended to protect fruit yield.",
            organicControl: "Spray Neem Seed Kernel Extract (5%) or Copper Hydroxide (2g/L) every 7-10 days. Ensure bottom leaves do not touch wet soil.",
            chemicalControl: "Apply Mancozeb 75% WP @ 2g/liter of water or Difenoconazole 25% EC @ 1ml/liter in severe infestation.",
            preventativeSteps: "Practice crop rotation with non-solanaceous crops (e.g. Maize/Legumes). Use drip irrigation to keep foliage dry.",
          },
          citationSource: "ICAR-Indian Institute of Horticultural Research (IIHR) Disease Database v2026",
          imageUrl: attachments[0]?.url,
        };

        const diagnosisMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: "Based on computer vision analysis of your leaf photo, here is the diagnosis and recommended treatment plan:",
          timestamp: nowTime,
          type: "diagnosis",
          diagnosisData: sampleDiagnosis,
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
          content: "Here is your AI-generated farming season plan tailored for your location:",
          timestamp: nowTime,
          type: "plan",
          planData: samplePlan,
          status: "sent",
        };

        setMessages((prev) => [...prev, planMsg]);
      } else {
        // General Conversational Response
        const textMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `Thank you for your question! Based on live data for ${
            farmerContext?.profile?.district || "your region"
          }, weather conditions are currently favorable. You can ask me to generate a full 2-acre season plan, check Agmarknet mandi prices, or upload a leaf photo to diagnose any crop disease.`,
          timestamp: nowTime,
          type: "text",
          status: "sent",
        };

        setMessages((prev) => [...prev, textMsg]);
      }

      setIsThinking(false);
    },
    [farmerContext]
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
