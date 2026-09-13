"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getFarmer,
  updateFarmer,
  deleteFarmer,
  getAdminToken,
  clearAdminToken,
  FarmerRecord,
  SUPPORTED_LANGUAGES,
  formatLanguageLabel,
  ApiError,
} from "@/lib/api";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Trash2,
  User,
  Wheat,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FarmerDetailPage({
  params,
}: {
  params: Promise<{ farmer_id: string }>;
}) {
  const resolvedParams = use(params);
  const farmerId = resolvedParams.farmer_id;
  const router = useRouter();

  const [farmer, setFarmer] = useState<FarmerRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [district, setDistrict] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Deactivation confirmation modal state
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState<boolean>(false);
  const [deactivating, setDeactivating] = useState<boolean>(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    async function fetchRecord() {
      setLoading(true);
      setError(null);

      try {
        const data = await getFarmer(farmerId);
        setFarmer(data);
        setDistrict(data.district || "");
        setLanguage(data.language || "hi");
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message);
          if (err.status === 403 || err.status === 401) {
            clearAdminToken();
            router.replace("/admin/login");
          }
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load farmer record.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchRecord();
  }, [farmerId, router]);

  const handleLogout = () => {
    clearAdminToken();
    router.replace("/admin/login");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await updateFarmer(farmerId, { district, language });
      setFarmer(updated);
      setSuccessMsg("Farmer record updated successfully.");
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Failed to update farmer.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await deleteFarmer(farmerId);
      if (farmer) {
        setFarmer({ ...farmer, status: "deactivated" });
      }
      setSuccessMsg("Farmer account has been deactivated.");
      setShowDeactivateConfirm(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Failed to deactivate farmer.");
    } finally {
      setDeactivating(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      return new Date(isoString).toLocaleString("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
      });
    } catch {
      return isoString;
    }
  };

  const isRegistered = farmer?.status === "registered";

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      <AdminHeader onLogout={handleLogout} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Navigation Back Link */}
        <div>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="size-3.5" />
              Back to Registry
            </Button>
          </Link>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm rounded-lg p-3.5 flex items-center gap-2 shadow-2xs">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm rounded-lg p-3.5 flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-border/80 bg-card p-8 space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-5 w-44 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
            <div className="h-24 bg-muted rounded" />
            <div className="h-36 bg-muted rounded" />
          </div>
        ) : !farmer ? (
          <div className="rounded-lg border border-border/80 bg-card p-12 text-center space-y-3">
            <h2 className="text-base font-bold text-foreground">Farmer Record Not Found</h2>
            <p className="text-xs text-muted-foreground">
              The requested farmer ID does not exist or has been removed.
            </p>
            <Link href="/admin">
              <Button size="sm">Return to Directory</Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-border/80 bg-card shadow-xs overflow-hidden">
            {/* Header Profile Banner */}
            <div className="bg-secondary/60 p-6 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded bg-secondary border border-border text-foreground flex items-center justify-center font-bold text-base shadow-2xs">
                  {farmer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">
                    {farmer.name}
                  </h1>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    ID: {farmer.farmer_id}
                  </p>
                </div>
              </div>

              <div>
                {isRegistered ? (
                  <Badge variant="success" className="text-xs font-mono">
                    <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5" />
                    Status: Registered
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-xs font-mono">
                    Status: Deactivated
                  </Badge>
                )}
              </div>
            </div>

            {/* Profile Meta Grid */}
            <div className="p-6 space-y-6 text-xs">
              <div className="bg-secondary/30 rounded-md p-4 border border-border/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Phone Number
                  </span>
                  <span className="font-mono text-sm font-medium text-foreground">
                    {farmer.phone}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Language Preference
                  </span>
                  <span className="font-medium text-sm text-foreground">
                    {formatLanguageLabel(farmer.language)}
                  </span>
                </div>

                <div className="sm:col-span-2 border-t border-border/60 pt-3">
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Active Season ID
                  </span>
                  <span className="font-mono text-xs text-foreground bg-background p-2 rounded border border-border block truncate">
                    {farmer.season_id}
                  </span>
                </div>
              </div>

              {/* Editable Form */}
              <form onSubmit={handleSave} className="space-y-4">
                <h3 className="text-xs font-semibold text-foreground border-b border-border/60 pb-1">
                  Update District & Language Parameters
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="detail-district" className="text-xs font-medium text-foreground">
                      District
                    </label>
                    <Input
                      id="detail-district"
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Nashik"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="detail-language" className="text-xs font-medium text-foreground">
                      Language
                    </label>
                    <select
                      id="detail-language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none cursor-pointer"
                    >
                      {Object.entries(SUPPORTED_LANGUAGES).map(([code, item]) => (
                        <option key={code} value={code}>
                          {item.label} ({item.native})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground font-mono">
                  <div>
                    <span className="text-foreground block font-semibold">Created On:</span>
                    {formatDate(farmer.created_at)}
                  </div>
                  <div>
                    <span className="text-foreground block font-semibold">Last Modified:</span>
                    {formatDate(farmer.updated_at)}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={saving} size="sm">
                    {saving && <Loader2 className="size-3 mr-1.5 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>

              {/* Deactivation Box */}
              {isRegistered && (
                <div className="pt-4 border-t border-border/80">
                  {!showDeactivateConfirm ? (
                    <div className="flex items-center justify-between p-4 rounded-md bg-destructive/5 border border-destructive/20">
                      <div>
                        <h4 className="text-xs font-bold text-destructive">Deactivate Farmer Account</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Marks the account as deactivated and suspends advisory access.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="xs"
                        onClick={() => setShowDeactivateConfirm(true)}
                      >
                        <Trash2 className="size-3 mr-1" />
                        Deactivate
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 space-y-3">
                      <div className="flex items-start gap-2.5 text-destructive">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold">Confirm Account Deactivation</p>
                          <p className="text-muted-foreground">
                            Are you sure you want to deactivate <strong className="text-foreground">{farmer.name}</strong>?
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setShowDeactivateConfirm(false)}
                          disabled={deactivating}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={handleDeactivate}
                          disabled={deactivating}
                        >
                          {deactivating && <Loader2 className="size-3 mr-1 animate-spin" />}
                          Yes, Deactivate Farmer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
