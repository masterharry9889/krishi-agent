"use client";

import React, { useState, useEffect } from "react";
import {
  FarmerRecord,
  updateFarmer,
  deleteFarmer,
  SUPPORTED_LANGUAGES,
  ApiError,
} from "@/lib/api";
import { X, AlertTriangle, CheckCircle2, Loader2, User, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FarmerDetailModalProps {
  farmer: FarmerRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: FarmerRecord) => void;
  onDeactivated: (farmerId: string) => void;
}

export const FarmerDetailModal: React.FC<FarmerDetailModalProps> = ({
  farmer,
  isOpen,
  onClose,
  onUpdated,
  onDeactivated,
}) => {
  const [district, setDistrict] = useState("");
  const [language, setLanguage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (farmer) {
      setDistrict(farmer.district || "");
      setLanguage(farmer.language || "hi");
      setError(null);
      setSuccessMsg(null);
      setShowDeactivateConfirm(false);
    }
  }, [farmer]);

  if (!isOpen || !farmer) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      return new Date(isoString).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return isoString;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await updateFarmer(farmer.farmer_id, {
        district,
        language,
      });
      setSuccessMsg("Farmer details updated successfully.");
      onUpdated(res);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Failed to update farmer details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await deleteFarmer(farmer.farmer_id);
      onDeactivated(farmer.farmer_id);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Failed to deactivate farmer.");
    } finally {
      setDeactivating(false);
      setShowDeactivateConfirm(false);
    }
  };

  const isRegistered = farmer.status === "registered";

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg border border-border shadow-xl max-w-lg w-full overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-secondary/60 px-5 py-4 flex items-center justify-between border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded bg-secondary border border-border text-foreground flex items-center justify-center font-bold text-sm">
              {farmer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                {farmer.name}
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">
                ID: {farmer.farmer_id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary transition cursor-pointer"
            title="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md p-2.5 flex items-start gap-2">
              <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-md p-2.5 flex items-start gap-2">
              <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Status & Identifiers Overview */}
          <div className="bg-secondary/30 rounded-md p-3.5 border border-border/70 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase block mb-1">
                Registry Status
              </span>
              {isRegistered ? (
                <Badge variant="success" className="text-[10px] font-mono">
                  Registered
                </Badge>
              ) : (
                <Badge variant="neutral" className="text-[10px] font-mono">
                  Deactivated
                </Badge>
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase block mb-1">
                Phone Number
              </span>
              <span className="font-mono text-xs font-medium text-foreground">
                {farmer.phone}
              </span>
            </div>

            <div className="col-span-2 border-t border-border/50 pt-2">
              <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase block mb-0.5">
                Active Season ID
              </span>
              <span className="font-mono text-[11px] text-foreground block truncate">
                {farmer.season_id}
              </span>
            </div>
          </div>

          {/* Editable Fields Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground border-b border-border/60 pb-1">
              Update Farmer Record
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="modal-district" className="text-xs font-medium text-foreground">
                  District
                </label>
                <Input
                  id="modal-district"
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Nashik"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="modal-language" className="text-xs font-medium text-foreground">
                  Preferred Language
                </label>
                <select
                  id="modal-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none cursor-pointer"
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
            <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground font-mono">
              <div>
                <span className="text-foreground block font-semibold">Created:</span>
                {formatDate(farmer.created_at)}
              </div>
              <div>
                <span className="text-foreground block font-semibold">Updated:</span>
                {formatDate(farmer.updated_at)}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving} size="sm">
                {saving && <Loader2 className="size-3 mr-1.5 animate-spin" />}
                Save Updates
              </Button>
            </div>
          </form>

          {/* Deactivation Safeguard */}
          {isRegistered && (
            <div className="pt-3 border-t border-border/80">
              {showDeactivateConfirm ? (
                <div className="p-3 bg-destructive/10 border border-destructive/25 rounded-md space-y-2">
                  <div className="flex items-center gap-1.5 text-destructive font-semibold text-xs">
                    <AlertTriangle className="size-3.5" />
                    <span>Confirm Record Deactivation</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    This will mark the farmer as deactivated and revoke their credentials.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={handleDeactivate}
                      disabled={deactivating}
                    >
                      {deactivating && <Loader2 className="size-3 mr-1 animate-spin" />}
                      Yes, Deactivate
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowDeactivateConfirm(false)}
                      disabled={deactivating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">Deactivate Account</span>
                    <span className="text-[11px] text-muted-foreground">Revoke access for this farmer</span>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowDeactivateConfirm(true)}
                    className="text-destructive hover:bg-destructive/10 border-destructive/20"
                  >
                    <Trash2 className="size-3 mr-1" />
                    Deactivate
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
