"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listFarmers,
  getAdminToken,
  clearAdminToken,
  FarmerRecord,
  ApiError,
} from "@/lib/api";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatCard } from "@/components/admin/StatCard";
import { FarmerFilterBar } from "@/components/admin/FarmerFilterBar";
import { FarmerTable } from "@/components/admin/FarmerTable";
import { FarmerDetailModal } from "@/components/admin/FarmerDetailModal";
import { AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Data state
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState<string>("");
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>(""); // "" | "registered" | "deactivated"

  // Pagination state
  const [skip, setSkip] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);

  // Detail Modal state
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Check Auth on Mount
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
    }
  }, [router]);

  // Fetch Farmers list
  const fetchFarmersList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resp = await listFarmers({
        skip,
        limit,
        search: search.trim() || undefined,
        district: districtFilter || undefined,
        language: languageFilter || undefined,
      });

      let list = resp.farmers;
      if (statusFilter) {
        list = list.filter((f) => f.status === statusFilter);
      }

      setFarmers(list);
      setTotalCount(resp.total ?? list.length);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 403 || err.status === 401) {
          clearAdminToken();
          router.replace("/admin/login");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch farmers list.");
      }
    } finally {
      setLoading(false);
    }
  }, [skip, limit, search, districtFilter, languageFilter, statusFilter, router]);

  useEffect(() => {
    fetchFarmersList();
  }, [fetchFarmersList]);

  // Reset pagination when filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setSkip(0);
  };

  const handleDistrictChange = (val: string) => {
    setDistrictFilter(val);
    setSkip(0);
  };

  const handleLanguageChange = (val: string) => {
    setLanguageFilter(val);
    setSkip(0);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setSkip(0);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDistrictFilter("");
    setLanguageFilter("");
    setStatusFilter("");
    setSkip(0);
  };

  const handleLogout = () => {
    clearAdminToken();
    router.replace("/admin/login");
  };

  const handleViewFarmer = (farmer: FarmerRecord) => {
    setSelectedFarmer(farmer);
    setIsModalOpen(true);
  };

  const handleFarmerUpdated = (updated: FarmerRecord) => {
    setFarmers((prev) =>
      prev.map((f) => (f.farmer_id === updated.farmer_id ? updated : f))
    );
    if (selectedFarmer?.farmer_id === updated.farmer_id) {
      setSelectedFarmer(updated);
    }
  };

  const handleFarmerDeactivated = (farmerId: string) => {
    setFarmers((prev) =>
      prev.map((f) =>
        f.farmer_id === farmerId ? { ...f, status: "deactivated" } : f
      )
    );
  };

  const registeredCount = farmers.filter((f) => f.status === "registered").length;
  const deactivatedCount = farmers.filter((f) => f.status === "deactivated").length;
  const uniqueDistrictsCount = new Set(
    farmers.map((f) => f.district).filter(Boolean)
  ).size;

  const availableDistrictsList = Array.from(
    new Set(farmers.map((f) => f.district).filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col">
      {/* Top Header */}
      <AdminHeader onLogout={handleLogout} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Farmer Registry Directory
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage smallholder farmer accounts, inspect active district profiles, and monitor onboarding status.
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm rounded-lg p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={fetchFarmersList}
              className="text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Summary Stat Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Acreage Records"
            value={totalCount}
            icon="total"
            subtitle="Verified farmer profiles"
            loading={loading}
          />
          <StatCard
            title="Active / Registered"
            value={registeredCount}
            icon="registered"
            subtitle="Live status accounts"
            loading={loading}
          />
          <StatCard
            title="Deactivated"
            value={deactivatedCount}
            icon="deactivated"
            subtitle="Archived profiles"
            loading={loading}
          />
          <StatCard
            title="Districts Covered"
            value={uniqueDistrictsCount}
            icon="districts"
            subtitle="Regional telemetry reach"
            loading={loading}
          />
        </div>

        {/* Filter Controls Bar */}
        <FarmerFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          district={districtFilter}
          onDistrictChange={handleDistrictChange}
          language={languageFilter}
          onLanguageChange={handleLanguageChange}
          status={statusFilter}
          onStatusChange={handleStatusChange}
          availableDistricts={availableDistrictsList}
          onReset={handleResetFilters}
          onRefresh={fetchFarmersList}
          loading={loading}
        />

        {/* Farmers Data Table */}
        <FarmerTable
          farmers={farmers}
          loading={loading}
          total={totalCount}
          skip={skip}
          limit={limit}
          onPageChange={setSkip}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setSkip(0);
          }}
          onViewFarmer={handleViewFarmer}
          onDeactivateFarmer={handleViewFarmer}
          onResetFilters={handleResetFilters}
        />
      </main>

      {/* Farmer Detail Modal */}
      <FarmerDetailModal
        farmer={selectedFarmer}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdated={handleFarmerUpdated}
        onDeactivated={handleFarmerDeactivated}
      />
    </div>
  );
}
