"use client";

import React from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/api";
import { Search, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const districts = Array.from(
    new Set([...DEFAULT_DISTRICTS, ...availableDistricts])
  ).sort();

  const hasActiveFilters = Boolean(search || district || language || status);

  return (
    <div className="rounded-lg border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="flex-1 relative min-w-[240px]">
          <label htmlFor="farmer-search" className="sr-only">
            Search farmers
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="size-4" />
          </div>
          <Input
            id="farmer-search"
            type="text"
            placeholder="Search by farmer name or phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 text-xs sm:text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters & Status Segment */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* District Filter */}
          <div className="w-full sm:w-auto min-w-[140px]">
            <label htmlFor="district-select" className="sr-only">
              Filter by District
            </label>
            <select
              id="district-select"
              value={district}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30 cursor-pointer"
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
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30 cursor-pointer"
            >
              <option value="">All Languages</option>
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, item]) => (
                <option key={code} value={code}>
                  {item.label} ({item.native})
                </option>
              ))}
            </select>
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center bg-secondary/70 p-0.5 rounded-md border border-border/70 text-xs">
            {[
              { label: "All", value: "" },
              { label: "Registered", value: "registered" },
              { label: "Deactivated", value: "deactivated" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onStatusChange(item.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                  status === item.value
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                title="Clear all filters"
                className="text-xs text-muted-foreground"
              >
                Reset
              </Button>
            )}

            <Button
              variant="outline"
              size="icon-sm"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh table"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
