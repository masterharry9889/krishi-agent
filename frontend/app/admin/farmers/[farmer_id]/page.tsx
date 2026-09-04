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
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900 flex flex-col">
      <AdminHeader onLogout={handleLogout} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Back Link */}
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-stone-600 hover:text-amber-800 transition bg-white px-3 py-1.5 rounded-lg border border-stone-300 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl p-4 flex items-center space-x-2">
            <span className="font-bold text-rose-600 text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl p-4 flex items-center space-x-2">
            <span className="font-bold text-emerald-600 text-base">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          // Loading Skeleton
          <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full bg-stone-200" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-stone-200 rounded" />
                <div className="h-4 w-32 bg-stone-200 rounded" />
              </div>
            </div>
            <div className="h-24 bg-stone-200 rounded-xl" />
            <div className="h-40 bg-stone-200 rounded-xl" />
          </div>
        ) : !farmer ? (
          // Not Found State
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <h2 className="text-xl font-bold text-stone-900 mb-2">Farmer Record Not Found</h2>
            <p className="text-sm text-stone-500 mb-6">
              The requested farmer ID does not exist or has been removed.
            </p>
            <Link
              href="/admin"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition"
            >
              Return to Directory
            </Link>
          </div>
        ) : (
          // Farmer Detail Card
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            {/* Header Profile Banner */}
            <div className="bg-stone-900 p-6 sm:p-8 text-white border-b border-amber-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full bg-amber-600/30 border border-amber-500/40 text-amber-200 flex items-center justify-center font-bold text-2xl shadow-inner">
                  {farmer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-serif text-amber-100">
                    {farmer.name}
                  </h1>
                  <p className="text-xs text-stone-400 font-mono mt-0.5">
                    Farmer ID: {farmer.farmer_id}
                  </p>
                </div>
              </div>

              <div>
                {isRegistered ? (
                  <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span>Status: Registered</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-stone-200 text-stone-700 border border-stone-300">
                    <span className="w-2 h-2 rounded-full bg-stone-500" />
                    <span>Status: Deactivated</span>
                  </span>
                )}
              </div>
            </div>

            {/* Profile Meta Grid */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Phone Number
                  </span>
                  <span className="text-base font-mono font-medium text-stone-900">
                    {farmer.phone}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Language Preference
                  </span>
                  <span className="text-base font-medium text-stone-900">
                    {formatLanguageLabel(farmer.language)}
                  </span>
                </div>

                <div className="sm:col-span-2 border-t border-stone-200/80 pt-4">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Season Identifier (UUID)
                  </span>
                  <span className="text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-stone-200 text-amber-900 block truncate">
                    {farmer.season_id}
                  </span>
                </div>
              </div>

              {/* Editable Form */}
              <form onSubmit={handleSave} className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-2">
                  Update Farmer Record
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="detail-district" className="block text-xs font-semibold text-stone-700 mb-1">
                      District
                    </label>
                    <input
                      id="detail-district"
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      placeholder="e.g. Nashik"
                    />
                  </div>

                  <div>
                    <label htmlFor="detail-language" className="block text-xs font-semibold text-stone-700 mb-1">
                      Language
                    </label>
                    <select
                      id="detail-language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition cursor-pointer"
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
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-500 font-mono">
                  <div>
                    <span className="font-semibold text-stone-700">Created On:</span>{" "}
                    {formatDate(farmer.created_at)}
                  </div>
                  <div>
                    <span className="font-semibold text-stone-700">Last Modified:</span>{" "}
                    {formatDate(farmer.updated_at)}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving && (
                      <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    <span>{saving ? "Saving..." : "Save Changes (PATCH)"}</span>
                  </button>
                </div>
              </form>

              {/* Deactivation Box */}
              {isRegistered && (
                <div className="pt-6 border-t border-stone-200">
                  {!showDeactivateConfirm ? (
                    <div className="flex items-center justify-between bg-rose-50/60 p-4 rounded-xl border border-rose-200">
                      <div>
                        <h4 className="text-xs font-bold text-rose-900">Deactivate Farmer Account</h4>
                        <p className="text-xs text-rose-700 mt-0.5">
                          Soft delete account status to deactivated.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDeactivateConfirm(true)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                      >
                        Deactivate
                      </button>
                    </div>
                  ) : (
                    <div className="bg-rose-100 p-5 rounded-xl border border-rose-300 space-y-4">
                      <div className="flex items-start space-x-3 text-rose-900">
                        <span className="text-xl font-bold">⚠️</span>
                        <div className="text-xs">
                          <p className="font-bold text-sm">Confirm Account Deactivation</p>
                          <p className="text-rose-800 mt-1">
                            Are you sure you want to deactivate <strong>{farmer.name}</strong>? Status will be updated to deactivated.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowDeactivateConfirm(false)}
                          className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-medium rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDeactivate}
                          disabled={deactivating}
                          className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition shadow-xs disabled:opacity-50"
                        >
                          {deactivating ? "Deactivating..." : "Yes, Deactivate Farmer"}
                        </button>
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
