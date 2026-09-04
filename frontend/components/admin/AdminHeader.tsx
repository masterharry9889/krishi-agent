"use client";

import React from "react";
import Link from "next/link";

interface AdminHeaderProps {
  onLogout: () => void;
  adminName?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onLogout,
  adminName = "System Administrator",
}) => {
  return (
    <header className="bg-stone-900 border-b border-amber-900/30 text-stone-100 shadow-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Emblem */}
          <div className="flex items-center space-x-3">
            <Link
              href="/admin"
              className="flex items-center space-x-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg p-1 transition"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-800 border border-amber-600/40 flex items-center justify-center shadow-inner">
                <svg
                  className="w-5 h-5 text-amber-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="font-serif text-xl tracking-tight font-bold text-amber-100">
                    Krishi Agent
                  </span>
                  <span className="bg-amber-900/60 text-amber-300 border border-amber-700/50 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full">
                    Admin Portal
                  </span>
                </div>
                <span className="text-[11px] text-stone-400 font-sans tracking-wide">
                  Farmer Registration & Registry System
                </span>
              </div>
            </Link>
          </div>

          {/* Admin Identity & Actions */}
          <div className="flex items-center space-x-4">
            {/* Identity Badge */}
            <div className="hidden sm:flex items-center space-x-2.5 bg-stone-800/80 border border-stone-700/60 px-3 py-1.5 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-600/40 flex items-center justify-center font-semibold text-xs">
                A
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-stone-200 leading-tight">
                  {adminName}
                </p>
                <p className="text-[10px] text-amber-400/90 font-mono leading-tight">
                  Authorized Admin
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-200 border border-stone-700/70 hover:border-amber-700/50 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              title="Sign out of Admin Dashboard"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
