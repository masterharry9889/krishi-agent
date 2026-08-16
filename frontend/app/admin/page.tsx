"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listFarmers,
  deleteFarmer,
  getAdminToken,
  clearAdminToken,
  FarmerRecord,
  ApiError,
} from "@/lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
    }
  }, [router]);

  const fetchFarmers = async (params?: { search?: string; district?: string; language?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listFarmers(params);
      setFarmers(resp.farmers);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 403) {
          router.replace("/admin/login");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load farmers.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params: { search?: string; district?: string; language?: string } = {};
    if (search) params.search = search;
    if (districtFilter) params.district = districtFilter;
    if (languageFilter) params.language = languageFilter;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFarmers(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, districtFilter, languageFilter]);

  const handleDelete = async (farmerId: string) => {
    if (!confirm("Delete this farmer?")) return;
    try {
      await deleteFarmer(farmerId);
      setFarmers((prev) => prev.filter((f) => f.farmer_id !== farmerId));
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    router.replace("/admin/login");
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "rgba(255, 255, 255, 0.55)",
    marginBottom: "0.35rem",
    display: "block",
    letterSpacing: "0.03em",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, var(--green-900) 0%, var(--soil-900) 100%)",
        padding: "2rem 1.5rem",
        color: "#fff",
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-instrument-serif), Georgia, serif",
            fontSize: "1.5rem",
            color: "#fff",
          }}
        >
          Admin Dashboard
        </h1>
        <button
          onClick={handleLogout}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "6px",
            padding: "0.4rem 0.875rem",
            fontSize: "0.8125rem",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <label htmlFor="search" style={labelStyle}>Search</label>
          <input
            id="search"
            type="text"
            placeholder="Name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "7px",
              fontSize: "0.875rem",
              color: "#fff",
              outline: "none",
            }}
          />
        </div>
        <div>
          <label htmlFor="district" style={labelStyle}>District</label>
          <input
            id="district"
            type="text"
            placeholder="e.g. Nashik"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "7px",
              fontSize: "0.875rem",
              color: "#fff",
              outline: "none",
            }}
          />
        </div>
        <div>
          <label htmlFor="language" style={labelStyle}>Language</label>
          <select
            id="language"
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "7px",
              fontSize: "0.875rem",
              color: "#fff",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="" style={{ background: "var(--green-900)" }}>All</option>
            <option value="hi" style={{ background: "var(--green-900)" }}>Hindi</option>
            <option value="mr" style={{ background: "var(--green-900)" }}>Marathi</option>
            <option value="pa" style={{ background: "var(--green-900)" }}>Punjabi</option>
            <option value="ta" style={{ background: "var(--green-900)" }}>Tamil</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={() => fetchFarmers({ search, district: districtFilter, language: languageFilter })}
            disabled={loading}
            style={{
              width: "100%",
              background: "var(--gold-500)",
              color: "var(--green-900)",
              border: "none",
              borderRadius: "7px",
              padding: "0.5rem 0.75rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(220, 53, 69, 0.15)",
            border: "1px solid rgba(220, 53, 69, 0.4)",
            borderRadius: "6px",
            padding: "0.625rem 0.875rem",
            fontSize: "0.8125rem",
            color: "#ff8080",
            marginBottom: "1rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {farmers.length === 0 && !loading && !error ? (
        <div style={{ color: "rgba(255,255,255,0.5)", paddingTop: "3rem", textAlign: "center" }}>
          No farmers registered yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: "0.8125rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ textAlign: "left", padding: "0.6rem 0.5rem", color: "rgba(255,255,255,0.5)" }}>Name</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.5rem", color: "rgba(255,255,255,0.5)" }}>Phone</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.5rem", color: "rgba(255,255,255,0.5)" }}>District</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.5rem", color: "rgba(255,255,255,0.5)" }}>Language</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.5rem", color: "rgba(255,255,255,0.5)" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.5rem", color: "rgba(255,255,255,0.5)" }}>Farmer ID</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.5rem", color: "rgba(255,255,255,0.5)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {farmers.map((f) => (
                <tr key={f.farmer_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.5rem", color: "#fff" }}>{f.name}</td>
                  <td style={{ padding: "0.5rem", color: "rgba(255,255,255,0.7)" }}>{f.phone}</td>
                  <td style={{ padding: "0.5rem", color: "rgba(255,255,255,0.7)" }}>{f.district}</td>
                  <td style={{ padding: "0.5rem", color: "rgba(255,255,255,0.7)" }}>{f.language}</td>
                  <td style={{ padding: "0.5rem", color: "rgba(255,255,255,0.7)" }}>{f.status}</td>
                  <td style={{ padding: "0.5rem", color: "var(--gold-500)", fontSize: "0.7rem" }}>{f.farmer_id}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <button
                      onClick={() => handleDelete(f.farmer_id)}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(220, 53, 69, 0.4)",
                        borderRadius: "4px",
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.7rem",
                        color: "#ff8080",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
