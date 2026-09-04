"use client";

import React from "react";

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: "total" | "registered" | "deactivated" | "districts";
  subtitle?: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  loading = false,
}) => {
  const getIcon = () => {
    switch (icon) {
      case "total":
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200/80 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case "registered":
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "deactivated":
        return (
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 border border-stone-200/80 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        );
      case "districts":
        return (
          <div className="w-10 h-10 rounded-xl bg-stone-200/80 text-stone-800 border border-stone-300 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition duration-150">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {title}
        </span>
        {getIcon()}
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-20 bg-stone-200 animate-pulse rounded-md mt-1" />
        ) : (
          <div className="text-3xl font-bold font-sans text-stone-900 tracking-tight">
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </div>
        )}

        {subtitle && (
          <p className="text-xs text-stone-500 mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
