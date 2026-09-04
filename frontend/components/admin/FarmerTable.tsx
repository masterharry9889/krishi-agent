"use client";

import React from "react";
import Link from "next/link";
import { FarmerRecord, formatLanguageLabel } from "@/lib/api";

interface FarmerTableProps {
  farmers: FarmerRecord[];
  loading: boolean;
  total: number;
  skip: number;
  limit: number;
  onPageChange: (newSkip: number) => void;
  onLimitChange: (newLimit: number) => void;
  onViewFarmer: (farmer: FarmerRecord) => void;
  onDeactivateFarmer: (farmer: FarmerRecord) => void;
  onResetFilters?: () => void;
}

export const FarmerTable: React.FC<FarmerTableProps> = ({
  farmers,
  loading,
  total,
  skip,
  limit,
  onPageChange,
  onLimitChange,
  onViewFarmer,
  onDeactivateFarmer,
  onResetFilters,
}) => {
  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;
  const startItem = total === 0 ? 0 : skip + 1;
  const endItem = Math.min(skip + limit, total);

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4 sm:px-6">Farmer Name</th>
              <th className="py-3.5 px-4">Phone</th>
              <th className="py-3.5 px-4">District</th>
              <th className="py-3.5 px-4">Language</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Registered On</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-200 text-sm text-stone-800">
            {loading ? (
              // Loading Skeleton State
              Array.from({ length: limit > 5 ? 5 : limit }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-stone-200" />
                      <div className="h-4 w-32 bg-stone-200 rounded" />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-24 bg-stone-200 rounded" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-20 bg-stone-200 rounded" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-16 bg-stone-200 rounded" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 w-20 bg-stone-200 rounded-full" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 w-24 bg-stone-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <div className="h-8 w-24 bg-stone-200 rounded ml-auto" />
                  </td>
                </tr>
              ))
            ) : farmers.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-stone-900 mb-1">
                      No farmers match your filters
                    </h3>
                    <p className="text-xs text-stone-500 mb-4">
                      Try expanding your search query, or clear active district and language filters.
                    </p>
                    {onResetFilters && (
                      <button
                        onClick={onResetFilters}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-200 text-xs font-semibold rounded-lg transition shadow-xs"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Table Rows
              farmers.map((farmer) => {
                const isRegistered = farmer.status === "registered";
                const initial = farmer.name ? farmer.name.charAt(0).toUpperCase() : "F";

                return (
                  <tr
                    key={farmer.farmer_id}
                    className="hover:bg-amber-50/40 transition duration-150 group"
                  >
                    {/* Name */}
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-stone-900">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/80 font-bold text-xs flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => onViewFarmer(farmer)}
                            className="font-medium text-stone-900 hover:text-amber-800 focus:outline-none text-left truncate max-w-[180px] sm:max-w-[240px] block"
                            title={farmer.name}
                          >
                            {farmer.name}
                          </button>
                          <span className="text-[10px] text-stone-400 font-mono block truncate max-w-[140px]">
                            {farmer.farmer_id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono text-xs text-stone-700">
                      {farmer.phone}
                    </td>

                    {/* District */}
                    <td className="py-3.5 px-4 text-stone-800 font-medium">
                      {farmer.district}
                    </td>

                    {/* Language */}
                    <td className="py-3.5 px-4 text-xs text-stone-700">
                      <span className="bg-stone-100 border border-stone-200 text-stone-800 px-2 py-0.5 rounded text-xs font-sans">
                        {formatLanguageLabel(farmer.language)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {isRegistered ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>Registered</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>

                    {/* Registered On */}
                    <td className="py-3.5 px-4 text-xs text-stone-600 font-mono">
                      {formatDate(farmer.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onViewFarmer(farmer)}
                          className="px-2.5 py-1 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded transition"
                          title="View / Edit details"
                        >
                          View
                        </button>

                        <Link
                          href={`/admin/farmers/${farmer.farmer_id}`}
                          className="px-2.5 py-1 text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition"
                          title="Open full page record"
                        >
                          Full Page
                        </Link>

                        {isRegistered && (
                          <button
                            onClick={() => onDeactivateFarmer(farmer)}
                            className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition"
                            title="Deactivate farmer record"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-stone-50 px-4 sm:px-6 py-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-white border border-stone-300 rounded px-2 py-1 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <span className="ml-2 font-medium">
            Showing <span className="font-semibold text-stone-900">{startItem}</span> to{" "}
            <span className="font-semibold text-stone-900">{endItem}</span> of{" "}
            <span className="font-semibold text-stone-900">{total}</span> farmers
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(0, skip - limit))}
            disabled={skip === 0 || loading}
            className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-700 font-medium disabled:opacity-40 disabled:hover:bg-white transition"
          >
            ← Previous
          </button>
          <span className="px-2 font-mono">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(skip + limit)}
            disabled={skip + limit >= total || loading}
            className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-700 font-medium disabled:opacity-40 disabled:hover:bg-white transition"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};
