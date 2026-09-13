"use client";

import React from "react";
import Link from "next/link";
import { Wheat, LogOut, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  onLogout: () => void;
  adminName?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onLogout,
  adminName = "System Administrator",
}) => {
  return (
    <header className="bg-background/90 backdrop-blur-md border-b border-border/80 text-foreground sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/admin"
          className="flex items-center gap-2.5 no-underline focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1"
        >
          <div className="size-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-2xs">
            <Wheat className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-foreground">
                Krishi Agent
              </span>
              <Badge variant="neutral" className="text-[9px] uppercase font-mono font-bold px-1.5 py-0">
                Admin
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              District Farmer Registry & Agronomic Telemetry
            </span>
          </div>
        </Link>

        {/* Admin Identity & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-secondary/50 border border-border/60 px-3 py-1.5 rounded-md text-xs">
            <ShieldCheck className="size-3.5 text-primary" />
            <span className="font-medium text-foreground">{adminName}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-xs text-muted-foreground hover:text-foreground"
            title="Sign out of Admin Dashboard"
          >
            <LogOut className="size-3.5 mr-1" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
