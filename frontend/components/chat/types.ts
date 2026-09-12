export type MessageRole = "user" | "assistant" | "system";

export type MessageType =
  | "text"
  | "plan"
  | "diagnosis"
  | "scheme"
  | "market"
  | "weather"
  | "soil"
  | "attachment_analyzing";

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
  schemeName?: string;
  name?: string;
  category?: string;
  benefit: string;
  eligibility: string;
  howToApply?: string;
  linkText?: string;
  link?: string;
}

export interface SchemeData {
  title: string;
  district?: string;
  landSizeAcres?: number;
  schemes: SchemeEligibilityItem[];
  summary?: string;
  officialPortalNote?: string;
}

export interface CommodityMarketItem {
  crop: string;
  variety?: string;
  modalPriceInr: number;
  minPriceInr: number;
  maxPriceInr: number;
  unit: string;
  trend: "increasing" | "decreasing" | "stable" | "volatile" | string;
  trendPct?: string;
  recommendation: string;
}

export interface MarketData {
  district: string;
  mandiName: string;
  updatedDate: string;
  commodities: CommodityMarketItem[];
  sellingStrategy?: string;
  source: string;
}

export interface WeatherForecastItem {
  day: string;
  condition: string;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  rainProb: number;
}

export interface WeatherAlertItem {
  type: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  message: string;
}

export interface WeatherData {
  location: string;
  summary: string;
  currentTemp: number;
  humidityPct: number;
  windKmph: number;
  forecast: WeatherForecastItem[];
  alerts?: WeatherAlertItem[];
  source: string;
}

export interface SoilMicronutrientItem {
  nutrient: string;
  status: string;
  recommendation: string;
}

export interface SoilData {
  location: string;
  soilType: string;
  ph: number;
  phStatus: string;
  organicCarbon: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  micronutrients: SoilMicronutrientItem[];
  correctiveActions: string[];
  source: string;
}

export interface ValidationInfo {
  is_valid: boolean;
  validation_score: number;
  status: "verified" | "warning" | "corrected" | string;
  checks_passed: string[];
  warnings: string[];
  safety_notices: string[];
  verified_sources?: string[];
  timestamp?: string;
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
  validation?: ValidationInfo;
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
  validation?: ValidationInfo;
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
  schemeData?: SchemeData;
  marketData?: MarketData;
  weatherData?: WeatherData;
  soilData?: SoilData;
  validation?: ValidationInfo;
  status?: "sending" | "sent" | "error" | "streaming";
  errorMessage?: string;
}
