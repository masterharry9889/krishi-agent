"use client";

import Link from "next/link";
import { Wheat, Shield, Activity, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Footer() {
  return (
    <footer className="border-t border-border/80 bg-secondary/30 text-muted-foreground text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <div className="size-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
                <Wheat className="size-3.5" />
              </div>
              <span>Krishi Agent</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                Precision v2.4
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              A stateful multi-agent decision intelligence architecture for Indian agriculture.
              Orchestrates official Soil Health Cards, APMC mandi arrivals, Sentinel-2 NDVI, and PMFBY
              into deterministic LangGraph execution pipelines.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="size-2 rounded-full bg-emerald-500 live-pulse" />
              <span className="text-[11px] font-mono text-foreground font-medium">
                All 15 Agronomic Nodes Operational
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Platform Routes
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/farmer/login" className="hover:text-foreground transition-colors">
                  Farmer Portal Sign In
                </Link>
              </li>
              <li>
                <Link href="/farmer/dashboard" className="hover:text-foreground transition-colors">
                  Farm Telemetry Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-foreground transition-colors">
                  Agronomist Admin Login
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-foreground transition-colors">
                  District Registry Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Compliance & Integrations */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Integrations
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>Ministry of Agriculture & Farmers Welfare</li>
              <li>Directorate of Marketing & Inspection (Agmarknet)</li>
              <li>ISRO / Sentinel-2 Earth Observation</li>
              <li>Small Farmers Agribusiness Consortium (e-NAM)</li>
              <li>National Horticulture Board (NCCD)</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>
            © {new Date().getFullYear()} Krishi Agent. Open precision agronomic infrastructure.
          </div>
          <div className="flex items-center gap-4">
            <span>Server: IN-CENTRAL-1</span>
            <span>Postgres Checkpointer Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
