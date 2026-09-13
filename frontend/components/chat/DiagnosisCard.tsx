"use client";

import React from "react";
import { DiseaseDiagnosisData } from "./types";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Leaf,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DiagnosisCardProps {
  diagnosis: DiseaseDiagnosisData;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ diagnosis }) => {
  const isHighConfidence = diagnosis.confidencePct >= 85;

  return (
    <div className="rounded-lg border border-border/80 bg-card overflow-hidden my-2 max-w-xl w-full shadow-2xs">
      {/* Header Banner */}
      <div className="bg-secondary/60 border-b border-border/60 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
            <Search className="size-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground truncate">
              {diagnosis.diseaseName}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              Host Crop: <span className="font-medium text-foreground">{diagnosis.affectedCrop}</span>
            </p>
          </div>
        </div>

        <Badge
          variant={isHighConfidence ? "destructive" : "warning"}
          className="text-[10px] font-mono shrink-0"
        >
          {diagnosis.confidencePct}% Match Confidence
        </Badge>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Matched Symptoms */}
        {diagnosis.symptomsMatched && diagnosis.symptomsMatched.length > 0 && (
          <div className="p-3 rounded-md bg-secondary/40 border border-border/60 space-y-1.5">
            <span className="font-mono text-[10px] uppercase font-semibold text-foreground tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" />
              Verified Visual Symptoms
            </span>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed pl-1">
              {diagnosis.symptomsMatched.map((symptom, idx) => (
                <li key={idx}>{symptom}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Treatment Protocol */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <ShieldAlert className="size-3.5 text-primary" />
            <span>Recommended Agronomic Protocol</span>
          </div>

          {diagnosis.treatment.summary && (
            <p className="text-muted-foreground leading-relaxed">
              {diagnosis.treatment.summary}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Organic Control */}
            {diagnosis.treatment.organicControl && (
              <div className="p-3 rounded-md bg-secondary/30 border border-border/60 space-y-1">
                <span className="font-semibold text-primary text-[11px] flex items-center gap-1.5">
                  <Leaf className="size-3.5" />
                  Organic & Bio-Control
                </span>
                <p className="text-foreground leading-relaxed">
                  {diagnosis.treatment.organicControl}
                </p>
              </div>
            )}

            {/* Chemical Control */}
            {diagnosis.treatment.chemicalControl && (
              <div className="p-3 rounded-md bg-secondary/30 border border-border/60 space-y-1">
                <span className="font-semibold text-amber-700 dark:text-amber-400 text-[11px] flex items-center gap-1.5">
                  <FlaskConical className="size-3.5" />
                  Targeted Chemical Formulation
                </span>
                <p className="text-foreground leading-relaxed">
                  {diagnosis.treatment.chemicalControl}
                </p>
              </div>
            )}
          </div>

          {/* Preventative Steps */}
          {diagnosis.treatment.preventativeSteps && (
            <div className="p-2.5 rounded-md bg-secondary/20 border border-border/40 text-muted-foreground leading-relaxed">
              <strong className="text-foreground font-medium">Preventative cultural practice: </strong>
              {diagnosis.treatment.preventativeSteps}
            </div>
          )}
        </div>

        {/* Citation Source */}
        {diagnosis.citationSource && (
          <div className="pt-2 border-t border-border/60 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            <BookOpen className="size-3 shrink-0" />
            <span className="truncate">Ref: {diagnosis.citationSource}</span>
          </div>
        )}
      </div>
    </div>
  );
};
