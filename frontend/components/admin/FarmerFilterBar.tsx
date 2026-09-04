"use client";

import React from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/api";

interface FarmerFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  district: string;
  onDistrictChange: (value: string) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  status: string; // "" | "registered" | "deactivated"
  onStatusChange: (value: string) => void;
  availableDistricts?: string[];
  onReset: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

const DEFAULT_DISTRICTS = [
  "Nashik",
  "Pune",
  "Solapur",
  "Satara",
  "Aurangabad",
  "Kolhapur",
  "Ahmednagar",
  "Nagpur",
  "Amravati",
  "Latur",
];

export const FarmerFilterBar: React.FC<FarmerFilterBarProps> = ({
  search,
  onSearchChange,
  district,
  onDistrictChange,
  language,
  onLanguageChange,
  status,
  onStatusChange,
  availableDistricts = [],
  onReset,
  onRefresh,
  loading = false,
}) => {
  // Combine default districts and any fetched unique districts
  const districts = Array.from(
    new Set([...DEFAULT_DISTRICTS, ...availableDistricts])
  ).sort();

  const hasActiveFilters = Boolean(search || district || language || status);

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs mb-6">
      <div className="flex flex-col space-y-3 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between lg:space-x-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <label htmlFor="farmer-search" className="sr-only">
            Search farmers
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            id="farmer-search"
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown Filters & Status Segment */}
        <div className="flex flex-wrap items-center gap-3">
          {/* District Filter */}
          <div className="w-full sm:w-auto min-w-[140px]">
            <label htmlFor="district-select" className="sr-only">
              Filter by District
            </label>
            <select
              id="district-select"
              value={district}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition cursor-pointer"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div className="w-full sm:w-auto min-w-[140px]">
            <label htmlFor="language-select" className="sr-only">
              Filter by Language
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition cursor-pointer"
            >
              <option value="">All Languages</option>
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, item]) => (
                <option key={code} value={code}>
                  {item.label} ({item.native})
                </option>
              ))}
            </select>
          </div>

          {/* Status Segmented Pills */}
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
            <button
              type="button"
              onClick={() => onStatusChange("")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                status === ""
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onStatusChange("registered")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                status === "registered"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-stone-600 hover:text-emerald-800"
              }`}
            >
              Registered
            </button>
            <button
              type="button"
              onClick={() => onStatusChange("deactivated")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                status === "deactivated"
                  ? "bg-stone-700 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Deactivated
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="px-3 py-2 text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                title="Clear all filters"
              >
                Reset
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              title="Refresh table"
            >
              <svg
                className={`w-4 h-4 ${loading ? "animate-spin text-amber-600" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
