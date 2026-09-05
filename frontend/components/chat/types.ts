export type MessageRole = "user" | "assistant" | "system";

export type MessageType = "text" | "plan" | "diagnosis" | "attachment_analyzing";

export interface Attachment {
  id: string;
  file?: File | null;
  url: string;
  name: string;
  type: "image" | "document";
  caption?: string;
}

export interface CropRecommendationItem {
  name: string;
  variety?: string;
  suitabilityScore: number; // e.g. 92
  durationDays: number;
  expectedYieldPerAcre: string;
  whyCrop: string;
}

export interface BudgetBreakdown {
  inputCostInr: number;
  costPerAcreInr: number;
  expectedRevenueInr: number;
  expectedNetMarginInr: number;
  currency: string;
}

export interface IrrigationScheduleItem {
  source: string;
  frequency: string;
  criticalStages: string[];
  tips: string;
}

export interface SchemeEligibilityItem {
  schemeName: string;
  benefit: string;
  eligibility: string;
  linkText?: string;
}

export interface TimelineItem {
  phase: string;
  timeframe: string;
  action: string;
}

export interface FarmingPlanData {
  title: string;
  summary: string;
  crops: CropRecommendationItem[];
  budget: BudgetBreakdown;
  irrigation: IrrigationScheduleItem;
  schemes: SchemeEligibilityItem[];
  timeline: TimelineItem[];
}

export interface DiseaseTreatment {
  summary: string;
  organicControl?: string;
  chemicalControl?: string;
  preventativeSteps?: string;
}

export interface DiseaseDiagnosisData {
  diseaseName: string;
  confidencePct: number; // e.g. 94
  affectedCrop: string;
  symptomsMatched: string[];
  treatment: DiseaseTreatment;
  citationSource?: string;
  imageUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  type?: MessageType;
  attachments?: Attachment[];
  planData?: FarmingPlanData;
  diagnosisData?: DiseaseDiagnosisData;
  status?: "sending" | "sent" | "error" | "streaming";
  errorMessage?: string;
}
