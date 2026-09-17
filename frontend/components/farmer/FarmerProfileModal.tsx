"use client";

import React, { useState, useEffect } from "react";
import {
  FarmerContextResponse,
  FarmerProfileUpdatePayload,
  updateFarmerProfile,
  SUPPORTED_LANGUAGES,
  ApiError,
} from "@/lib/api";
import {
  X,
  User,
  MapPin,
  Sprout,
  Droplets,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  IndianRupee,
  Save,
  Globe,
  Wheat,
  Shield,
  Tag,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface FarmerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: FarmerContextResponse;
  onProfileUpdated: (updatedContext: FarmerContextResponse) => void;
}

type TabType = "personal" | "land" | "water" | "crops";

const SOIL_TYPES = [
  "Black Cotton (Regur) Soil",
  "Red Loamy Soil",
  "Alluvial Soil",
  "Sandy Loam Soil",
  "Clay Loam Soil",
  "Laterite Soil",
  "Medium Black Soil",
  "Saline / Alkaline Soil",
];

const SOIL_PH_OPTIONS = [
  { value: "acidic", label: "Acidic (pH < 6.0)" },
  { value: "slight_acidic", label: "Slightly Acidic (pH 6.0 - 6.5)" },
  { value: "neutral", label: "Neutral / Optimal (pH 6.5 - 7.5)" },
  { value: "slight_alkaline", label: "Slightly Alkaline (pH 7.5 - 8.5)" },
  { value: "alkaline", label: "Alkaline (pH > 8.5)" },
];

const WATER_SOURCES = [
  "Borewell / Tube Well",
  "Open Dug Well",
  "Canal Irrigation Network",
  "Rainfed (Monsoon Dependent)",
  "River / Lift Irrigation",
  "Farm Pond (Shet Tale)",
  "Tank / Reservoir",
];

const IRRIGATION_TYPES = [
  "Drip Irrigation (Micro-irrigation)",
  "Sprinkler System",
  "Flood / Furrow Irrigation",
  "Rainfed (No artificial irrigation)",
  "Sub-surface Drip",
];

const FARMING_TYPES = [
  "Conventional (Standard Inputs)",
  "Integrated Pest Management (IPM)",
  "100% Certified Organic (Jaivik Kheti)",
  "Natural Farming (ZBNF)",
  "Precision Agriculture",
];

const OWNERSHIP_TYPES = [
  { value: "owned", label: "Self-Owned Land" },
  { value: "leased", label: "Leased / Tenant Farmland" },
  { value: "shared", label: "Shared Farming (Batai)" },
];

const COMMON_CROPS = [
  "Soybean",
  "Cotton",
  "Wheat",
  "Onion",
  "Sugarcane",
  "Paddy / Rice",
  "Maize",
  "Gram / Chana",
  "Pomegranate",
  "Tomato",
  "Groundnut",
  "Bajra",
  "Mustard",
  "Tur / Arhar",
];

export function FarmerProfileModal({
  isOpen,
  onClose,
  context,
  onProfileUpdated,
}: FarmerProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("personal");

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("hi");
  const [stateName, setStateName] = useState("Maharashtra");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [pincode, setPincode] = useState("");

  // Land & Soil
  const [landSize, setLandSize] = useState<number>(4.0);
  const [ownership, setOwnership] = useState("owned");
  const [soilType, setSoilType] = useState("Medium Black Soil");
  const [soilPh, setSoilPh] = useState("neutral");

  // Water & Irrigation
  const [waterSource, setWaterSource] = useState("Borewell / Tube Well");
  const [irrigationType, setIrrigationType] = useState("Drip Irrigation (Micro-irrigation)");

  // Crops & Farming Practices
  const [currentCrops, setCurrentCrops] = useState<string[]>([]);
  const [pastCrops, setPastCrops] = useState<string[]>([]);
  const [farmingType, setFarmingType] = useState("Conventional (Standard Inputs)");
  const [experienceYears, setExperienceYears] = useState<number>(10);
  const [cattleCount, setCattleCount] = useState<number>(2);
  const [equipment, setEquipment] = useState("Owns Tractor with rotavator");
  const [hasStorage, setHasStorage] = useState(false);
  const [budget, setBudget] = useState<number>(50000);
  const [notes, setNotes] = useState("");

  // Crop input scratch states
  const [newCurrentCrop, setNewCurrentCrop] = useState("");
  const [newPastCrop, setNewPastCrop] = useState("");

  // Status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state when context changes or modal opens
  useEffect(() => {
    if (context && isOpen) {
      const p = context.profile;
      setName(p.name || "");
      setPhone(p.phone || "");
      setLanguage(p.language || "hi");
      setStateName(p.state || "Maharashtra");
      setDistrict(p.district || p.location || "Nashik");
      setVillage(p.village || "");
      setPincode(p.pincode || "");

      setLandSize(p.land_size || 4.0);
      setOwnership(p.ownership || "owned");
      setSoilType(p.soil_type || "Medium Black Soil");
      setSoilPh(p.soil_ph || "neutral");

      setWaterSource(p.water_source || "Borewell / Tube Well");
      setIrrigationType(p.irrigation_type || p.water_source || "Drip Irrigation (Micro-irrigation)");

      setCurrentCrops(p.current_crops && p.current_crops.length > 0 ? p.current_crops : ["Soybean"]);
      setPastCrops(p.past_crops && p.past_crops.length > 0 ? p.past_crops : ["Wheat", "Gram"]);
      setFarmingType(p.farming_type || "Conventional (Standard Inputs)");
      setExperienceYears(p.experience_years ?? 10);
      setCattleCount(p.cattle_count ?? 2);
      setEquipment(p.equipment || "Owns Tractor with rotavator");
      setHasStorage(p.has_storage ?? false);
      setBudget(p.budget ?? 50000);
      setNotes(p.notes || "");

      setError(null);
      setSuccessMsg(null);
    }
  }, [context, isOpen]);

  if (!isOpen) return null;

  const handleAddCurrentCrop = (crop: string) => {
    const trimmed = crop.trim();
    if (trimmed && !currentCrops.includes(trimmed)) {
      setCurrentCrops([...currentCrops, trimmed]);
      setNewCurrentCrop("");
    }
  };

  const handleRemoveCurrentCrop = (crop: string) => {
    setCurrentCrops(currentCrops.filter((c) => c !== crop));
  };

  const handleAddPastCrop = (crop: string) => {
    const trimmed = crop.trim();
    if (trimmed && !pastCrops.includes(trimmed)) {
      setPastCrops([...pastCrops, trimmed]);
      setNewPastCrop("");
    }
  };

  const handleRemovePastCrop = (crop: string) => {
    setPastCrops(pastCrops.filter((c) => c !== crop));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload: FarmerProfileUpdatePayload = {
      name: name.trim(),
      district: district.trim(),
      state: stateName.trim(),
      village: village.trim(),
      pincode: pincode.trim(),
      language,
      land_size: Number(landSize),
      ownership,
      soil_type: soilType,
      soil_ph: soilPh,
      water_source: waterSource,
      irrigation_type: irrigationType,
      current_crops: currentCrops,
      past_crops: pastCrops,
      farming_type: farmingType,
      experience_years: Number(experienceYears),
      cattle_count: Number(cattleCount),
      equipment,
      has_storage: hasStorage,
      budget: Number(budget),
      notes: notes.trim(),
    };

    try {
      const res = await updateFarmerProfile(context.farmer_id, payload);
      setSuccessMsg("Farmer & farm telemetry profile updated successfully!");
      onProfileUpdated(res);
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Failed to update farmer profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card text-foreground rounded-2xl border border-border/90 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-secondary/60 px-5 py-4 border-b border-border/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <User className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  Farmer & Farmland Profile
                </h2>
                <Badge variant="neutral" className="text-[10px] font-mono shrink-0">
                  ID: {context.farmer_id.slice(0, 8)}...
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Update personal details, regional parameters, and comprehensive agronomic telemetry
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Close"
          >
            <X className="size-4.5" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 pb-2 border-b border-border/60 bg-secondary/20 shrink-0">
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === "personal"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <User className="size-3.5" />
              <span>Personal & Location</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("land")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === "land"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Layers className="size-3.5" />
              <span>Land & Soil</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("water")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === "water"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Droplets className="size-3.5" />
              <span>Water & Irrigation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("crops")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === "crops"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <Wheat className="size-3.5" />
              <span>Crops & Farming System</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Personal & Location Details */}
          {activeTab === "personal" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                <Globe className="size-4 text-primary shrink-0" />
                <span>
                  Communication language and district localization determine advisory language, APMC mandi feeds, and weather forecast resolution.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Farmer Full Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Registered Mobile Number
                  </label>
                  <Input
                    type="text"
                    disabled
                    value={phone}
                    className="bg-muted/50 cursor-not-allowed opacity-80"
                    title="Phone number is used as account authentication ID"
                  />
                  <span className="text-[10px] text-muted-foreground">Primary login identifier</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Preferred Language <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  >
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, meta]) => (
                      <option key={code} value={code}>
                        {meta.label} ({meta.native})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    State <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    District / Place <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Nashik"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Village / Tehsil
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Sinnar"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Pincode
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 422001"
                    maxLength={10}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Land & Soil Details */}
          {activeTab === "land" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary shrink-0" />
                <span>
                  Soil composition and acreage calibrate fertilizer dosing, NPK requirements, and SoilAgent chemical heuristics.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Total Farmland Size (Acres) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10000"
                    required
                    placeholder="e.g. 4.2"
                    value={landSize}
                    onChange={(e) => setLandSize(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-muted-foreground">Used to compute per-acre seed and fertilizer budgets</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Land Ownership Model
                  </label>
                  <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  >
                    {OWNERSHIP_TYPES.map((ot) => (
                      <option key={ot.value} value={ot.value}>
                        {ot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Soil Classification / Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  >
                    {SOIL_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Soil Reaction / pH Level
                  </label>
                  <select
                    value={soilPh}
                    onChange={(e) => setSoilPh(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  >
                    {SOIL_PH_OPTIONS.map((ph) => (
                      <option key={ph.value} value={ph.value}>
                        {ph.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground">From Soil Health Card test report</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Water & Irrigation */}
          {activeTab === "water" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                <Droplets className="size-4 text-blue-500 shrink-0" />
                <span>
                  Irrigation infrastructure directly informs the ResourceIrrigationAgent watering schedule and drought risk alerts.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Primary Water Source <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={waterSource}
                    onChange={(e) => setWaterSource(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  >
                    {WATER_SOURCES.map((ws) => (
                      <option key={ws} value={ws}>
                        {ws}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Irrigation Method / System <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  >
                    {IRRIGATION_TYPES.map((it) => (
                      <option key={it} value={it}>
                        {it}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Crops & Farming System */}
          {activeTab === "crops" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                <Sprout className="size-4 text-emerald-500 shrink-0" />
                <span>
                  Target and rotation crops guide CropRecommendationAgent and MarketIntelligenceAgent mandi real-time tracking.
                </span>
              </div>

              {/* Current Crops */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Current / Target Season Crops</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Click chips below to add quickly</span>
                </label>

                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-secondary/30 border border-border/60 min-h-[42px]">
                  {currentCrops.map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="gap-1 pl-2.5 pr-1 py-1 text-xs font-medium"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => handleRemoveCurrentCrop(c)}
                        className="rounded hover:bg-muted p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  {currentCrops.length === 0 && (
                    <span className="text-xs text-muted-foreground self-center">No crops selected</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type custom crop and press add..."
                    value={newCurrentCrop}
                    onChange={(e) => setNewCurrentCrop(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCurrentCrop(newCurrentCrop);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddCurrentCrop(newCurrentCrop)}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {COMMON_CROPS.filter((c) => !currentCrops.includes(c))
                    .slice(0, 8)
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleAddCurrentCrop(c)}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                      >
                        + {c}
                      </button>
                    ))}
                </div>
              </div>

              {/* Past Crops */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="text-xs font-semibold text-foreground">
                  Past / Previous Crop Rotation History
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-secondary/30 border border-border/60 min-h-[42px]">
                  {pastCrops.map((c) => (
                    <Badge
                      key={c}
                      variant="neutral"
                      className="gap-1 pl-2.5 pr-1 py-1 text-xs font-medium"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => handleRemovePastCrop(c)}
                        className="rounded hover:bg-muted p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  {pastCrops.length === 0 && (
                    <span className="text-xs text-muted-foreground self-center">No rotation crops logged</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type past crop and press add..."
                    value={newPastCrop}
                    onChange={(e) => setNewPastCrop(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPastCrop(newPastCrop);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddPastCrop(newPastCrop)}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Farming Practice, Experience, Machinery */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Farming Methodology
                  </label>
                  <select
                    value={farmingType}
                    onChange={(e) => setFarmingType(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  >
                    {FARMING_TYPES.map((ft) => (
                      <option key={ft} value={ft}>
                        {ft}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Farming Experience (Years)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="80"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Livestock / Cattle Count
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="500"
                    value={cattleCount}
                    onChange={(e) => setCattleCount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Farm Equipment & Mechanization
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Tractor with rotavator, power sprayer"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Working Capital Budget (₹ INR)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="5000"
                    placeholder="e.g. 50000"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/60">
                <input
                  type="checkbox"
                  id="hasStorage"
                  checked={hasStorage}
                  onChange={(e) => setHasStorage(e.target.checked)}
                  className="size-4 rounded border-input text-primary focus:ring-primary/25 cursor-pointer"
                />
                <label htmlFor="hasStorage" className="text-xs font-medium text-foreground cursor-pointer">
                  On-farm or dedicated warehouse storage facility available (improves sell-timing holding capacity)
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Agronomic Observations & Field Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Record historical pest incidence, frost susceptibility, or specific field challenges..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring/25 resize-vertical"
                />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-border/80 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-medium"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving Details...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
