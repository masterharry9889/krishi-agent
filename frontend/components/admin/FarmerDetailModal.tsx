"use client";

import React, { useState, useEffect } from "react";
import {
  FarmerRecord,
  updateFarmer,
  deleteFarmer,
  SUPPORTED_LANGUAGES,
  ApiError,
} from "@/lib/api";

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl border border-stone-300 shadow-2xl max-w-xl w-full overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 px-6 py-4 text-white flex items-center justify-between border-b border-amber-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-600/30 border border-amber-500/40 text-amber-200 flex items-center justify-center font-bold text-lg">
              {farmer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-amber-100 leading-snug">
                {farmer.name}
              </h2>
              <p className="text-xs text-stone-400 font-mono">
                ID: {farmer.farmer_id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition"
            title="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Notifications */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3 flex items-start space-x-2">
              <span className="font-bold text-rose-600">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg p-3 flex items-start space-x-2">
              <span className="font-bold text-emerald-600">✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Status & Identifiers Overview */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Status
              </span>
              {isRegistered ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Registered</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-200 text-stone-700 border border-stone-300">
                  <span className="w-2 h-2 rounded-full bg-stone-500" />
                  <span>Deactivated</span>
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Phone Number
              </span>
              <span className="text-sm font-mono font-medium text-stone-900">
                {farmer.phone}
              </span>
            </div>

            <div className="sm:col-span-2 border-t border-stone-200/80 pt-3">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Active Season ID
              </span>
              <span className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-stone-200 text-amber-900 block truncate">
                {farmer.season_id}
              </span>
            </div>
          </div>

          {/* Editable Fields Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-1">
              Editable Record Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* District Input */}
              <div>
                <label htmlFor="modal-district" className="block text-xs font-semibold text-stone-700 mb-1">
                  District
                </label>
                <input
                  id="modal-district"
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                  placeholder="e.g. Nashik"
                />
              </div>

              {/* Language Select */}
              <div>
                <label htmlFor="modal-language" className="block text-xs font-semibold text-stone-700 mb-1">
                  Preferred Language
                </label>
                <select
                  id="modal-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition cursor-pointer"
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
            <div className="pt-2 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-500 font-mono">
              <div>
                <span className="font-semibold text-stone-600 block">Created At:</span>
                {formatDate(farmer.created_at)}
              </div>
              <div>
                <span className="font-semibold text-stone-600 block">Last Updated:</span>
                {formatDate(farmer.updated_at)}
              </div>
            </div>

            {/* Save Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
              >
                {saving && (
                  <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                <span>{saving ? "Saving Changes..." : "Save Changes (PATCH)"}</span>
              </button>
            </div>
          </form>

          {/* Deactivation Confirmation Section */}
          {isRegistered && (
            <div className="pt-4 border-t border-stone-200">
              {!showDeactivateConfirm ? (
                <div className="flex items-center justify-between bg-rose-50/60 p-3.5 rounded-xl border border-rose-200">
                  <div>
                    <h4 className="text-xs font-bold text-rose-900">Deactivate Farmer</h4>
                    <p className="text-[11px] text-rose-700">
                      Soft-deletes the farmer account and sets status to deactivated.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeactivateConfirm(true)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition shrink-0"
                  >
                    Deactivate
                  </button>
                </div>
              ) : (
                <div className="bg-rose-100 p-4 rounded-xl border border-rose-300 space-y-3">
                  <div className="flex items-start space-x-2 text-rose-900">
                    <span className="text-base font-bold">⚠️</span>
                    <div className="text-xs">
                      <p className="font-bold">Are you sure you want to deactivate this farmer?</p>
                      <p className="text-rose-800 mt-0.5">
                        This will set the farmer&apos;s status to <strong>deactivated</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeactivateConfirm(false)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-medium rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeactivate}
                      disabled={deactivating}
                      className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition shadow-xs disabled:opacity-50"
                    >
                      {deactivating ? "Deactivating..." : "Confirm Deactivation"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
