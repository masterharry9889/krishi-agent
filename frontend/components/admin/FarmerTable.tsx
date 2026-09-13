"use client";

import React from "react";
import Link from "next/link";
import { FarmerRecord, formatLanguageLabel } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <Table className="border-0">
          <TableHeader>
            <TableRow>
              <TableHead>Farmer Name & ID</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Registry Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: limit > 5 ? 5 : limit }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded bg-muted" />
                      <div className="h-4 w-28 bg-muted rounded" />
                    </div>
                  </TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
                  <TableCell><div className="h-5 w-20 bg-muted rounded-full" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                  <TableCell className="text-right"><div className="h-7 w-20 bg-muted rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : farmers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center space-y-2">
                    <div className="size-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-1">
                      <Search className="size-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      No farmers match the specified filters
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting search terms or clearing active district/language selections.
                    </p>
                    {onResetFilters && (
                      <Button onClick={onResetFilters} size="sm" variant="outline" className="mt-2">
                        Reset All Filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              farmers.map((farmer) => {
                const isRegistered = farmer.status === "registered";
                const initial = farmer.name ? farmer.name.charAt(0).toUpperCase() : "F";

                return (
                  <TableRow key={farmer.farmer_id} className="hover:bg-muted/30">
                    {/* Name */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded bg-secondary text-foreground border border-border font-bold text-xs flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onViewFarmer(farmer)}
                            className="font-semibold text-xs text-foreground hover:text-primary transition-colors text-left truncate max-w-[200px] block cursor-pointer"
                            title={farmer.name}
                          >
                            {farmer.name}
                          </button>
                          <span className="text-[10px] text-muted-foreground font-mono block truncate max-w-[140px]">
                            {farmer.farmer_id}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Phone */}
                    <TableCell className="font-mono text-xs text-muted-foreground num-tabular">
                      {farmer.phone}
                    </TableCell>

                    {/* District */}
                    <TableCell className="text-xs font-medium text-foreground">
                      {farmer.district}
                    </TableCell>

                    {/* Language */}
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {formatLanguageLabel(farmer.language)}
                      </Badge>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {isRegistered ? (
                        <Badge variant="success" className="text-[10px] font-mono">
                          <span className="size-1 rounded-full bg-emerald-500 mr-1" />
                          Registered
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px] font-mono">
                          Deactivated
                        </Badge>
                      )}
                    </TableCell>

                    {/* Registered On */}
                    <TableCell className="text-[11px] text-muted-foreground font-mono">
                      {formatDate(farmer.created_at)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onViewFarmer(farmer)}
                          title="View / Edit details"
                        >
                          Quick View
                        </Button>

                        <Link
                          href={`/admin/farmers/${farmer.farmer_id}`}
                          className="inline-flex items-center h-6 gap-1 rounded px-2 text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition no-underline"
                          title="Open full page record"
                        >
                          Details
                        </Link>

                        {isRegistered && (
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => onDeactivateFarmer(farmer)}
                            title="Deactivate farmer record"
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-secondary/30 px-4 sm:px-6 py-3 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-background border border-input rounded px-2 py-1 text-xs font-medium text-foreground outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <span className="ml-2">
            Showing <span className="font-semibold text-foreground num-tabular">{startItem}</span> to{" "}
            <span className="font-semibold text-foreground num-tabular">{endItem}</span> of{" "}
            <span className="font-semibold text-foreground num-tabular">{total}</span> farmers
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(0, skip - limit))}
            disabled={skip === 0 || loading}
            className="text-xs h-7.5"
          >
            <ChevronLeft className="size-3.5 mr-1" /> Previous
          </Button>
          <span className="px-2 font-mono text-[11px]">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(skip + limit)}
            disabled={skip + limit >= total || loading}
            className="text-xs h-7.5"
          >
            Next <ChevronRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
