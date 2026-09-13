"use client";

import React from "react";
import { Users, CheckCircle2, Ban, MapPin } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: "total" | "registered" | "deactivated" | "districts";
  subtitle?: string;
  loading?: boolean;
}

const ICON_MAP = {
  total: { icon: Users, color: "text-foreground", bg: "bg-secondary" },
  registered: { icon: CheckCircle2, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  deactivated: { icon: Ban, color: "text-muted-foreground", bg: "bg-muted" },
  districts: { icon: MapPin, color: "text-primary", bg: "bg-primary/10" },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  loading = false,
}) => {
  const config = ICON_MAP[icon];
  const IconComponent = config.icon;

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 sm:p-5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className={`size-8 rounded-md ${config.bg} border border-border/60 flex items-center justify-center`}>
          <IconComponent className={`size-4 ${config.color}`} />
        </div>
      </div>

      <div>
        {loading ? (
          <div className="h-7 w-20 bg-muted animate-pulse rounded-md" />
        ) : (
          <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight num-tabular">
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </div>
        )}

        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
