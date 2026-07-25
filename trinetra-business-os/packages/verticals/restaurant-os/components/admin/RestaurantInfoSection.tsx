"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  LayoutGrid,
  ShoppingCart,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { AdminButton  } from '@trinetra/shared/ui';;
import { AdminCard  } from '@trinetra/shared/ui';;
import { AdminInput  } from '@trinetra/shared/ui';;

interface RestaurantInfoSectionProps {
  clientId: string;
  restaurantEnabled: boolean;
}

interface RestaurantStats {
  restaurant_name: string | null;
  setup_status?: "pending" | "provisioned";
  tables_count: number;
  staff_count: number;
  active_orders: number;
}

interface TableRecord {
  id: string;
  table_number: string;
  table_token: string;
  is_active: boolean;
  created_at: string;
}

export default function RestaurantInfoSection({
  clientId,
  restaurantEnabled,
}: RestaurantInfoSectionProps) {
  const router = useRouter();
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [restaurantName, setRestaurantName] = useState("");
  const [tableCount, setTableCount] = useState("10");

  const [setupLoading, setSetupLoading] = useState(false);
  const [createTablesLoading, setCreateTablesLoading] = useState(false);
  const [generateQrLoading, setGenerateQrLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<
    "pending" | "provisioned" | null
  >(null);
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);

  const [setupError, setSetupError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadCount, setDownloadCount] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    if (!restaurantEnabled) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/restaurant-stats?client_id=${encodeURIComponent(clientId)}`,
      );
      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as RestaurantStats;
      setStats(data);
    } catch {
      // Optional enrichment; keep UI usable.
    } finally {
      setLoading(false);
    }
  }, [clientId, restaurantEnabled]);

  const fetchTables = useCallback(async () => {
    if (!restaurantEnabled) {
      return;
    }

    try {
      setTablesLoading(true);
      const res = await fetch(
        `/api/admin/restaurant/tables?client_id=${encodeURIComponent(clientId)}`,
      );

      if (!res.ok) {
        setTables([]);
        return;
      }

      const data = await res.json();
      setTables(
        Array.isArray(data.tables) ? (data.tables as TableRecord[]) : [],
      );
    } catch {
      // Optional enrichment; keep UI usable.
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  }, [clientId, restaurantEnabled]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (stats?.restaurant_name) {
      fetchTables();
    } else {
      setTables([]);
    }
  }, [fetchTables, stats?.restaurant_name]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");
    setActionError("");
    setActionMessage("");

    const name = restaurantName.trim();
    if (!name) {
      setSetupError("Restaurant name is required");
      return;
    }

    try {
      setSetupLoading(true);
      const res = await fetch("/api/client/restaurant/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create restaurant record");
      }

      setActionMessage("Restaurant record created successfully.");
      setRestaurantName("");
      await fetchStats();
      router.refresh();
    } catch (err: unknown) {
      setSetupError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCreateTables = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionMessage("");

    const parsedCount = Number(tableCount);
    if (
      !Number.isInteger(parsedCount) ||
      parsedCount < 1 ||
      parsedCount > 500
    ) {
      setActionError("Table count must be an integer between 1 and 500.");
      return;
    }

    try {
      setCreateTablesLoading(true);
      const res = await fetch("/api/admin/restaurant/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, table_count: parsedCount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create tables");
      }

      setActionMessage(`Created ${data.created_count || 0} table(s).`);
      await Promise.all([fetchStats(), fetchTables()]);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setCreateTablesLoading(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    setActionError("");
    setActionMessage("");

    try {
      setDeleteTableId(tableId);
      const res = await fetch("/api/admin/restaurant/tables", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, table_id: tableId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete table");
      }

      setActionMessage("Table deleted.");
      await Promise.all([fetchStats(), fetchTables()]);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setDeleteTableId(null);
    }
  };

  const handleGenerateQrs = async () => {
    setActionError("");
    setActionMessage("");
    setDownloadUrl(null);
    setDownloadCount(null);

    try {
      setGenerateQrLoading(true);
      const res = await fetch("/api/admin/restaurant/tables/generate-qrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate table QR batch");
      }

      const url = data.download_url || null;
      setDownloadUrl(url);
      setDownloadCount(
        typeof data.generated_count === "number" ? data.generated_count : null,
      );
      setActionMessage("QR batch generated successfully.");

      // Auto-trigger browser download
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setGenerateQrLoading(false);
    }
  };

  const handleSetupStatus = async (nextStatus: "pending" | "provisioned") => {
    setActionError("");
    setActionMessage("");

    try {
      setStatusLoading(nextStatus);
      const res = await fetch("/api/admin/restaurant/setup-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, setup_status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update setup status");
      }

      setActionMessage(
        nextStatus === "provisioned"
          ? "Restaurant marked as live."
          : "Restaurant moved back to pending.",
      );
      await fetchStats();
      router.refresh();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setStatusLoading(null);
    }
  };

  if (!restaurantEnabled) {
    return (
      <AdminCard className="overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Enable Restaurant Mode
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {expanded && (
          <form
            onSubmit={handleSetup}
            className="px-4 pb-4 pt-4 space-y-4 border-t border-gray-200/50 dark:border-gray-700/50"
          >
            {setupError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                {setupError}
              </div>
            )}
            <AdminInput
              label="Restaurant Name"
              name="restaurant_name"
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. The Golden Fork"
              required
            />
            <AdminButton
              type="submit"
              variant="primary"
              size="md"
              disabled={setupLoading}
              loading={setupLoading}
            >
              {setupLoading ? "Enabling..." : "Enable Restaurant Mode"}
            </AdminButton>
          </form>
        )}
      </AdminCard>
    );
  }

  if (loading && !stats) {
    return (
      <AdminCard className="p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <UtensilsCrossed className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Loading restaurant info...</span>
        </div>
      </AdminCard>
    );
  }

  const setupStatus = stats?.setup_status ?? "pending";
  const hasRestaurantRecord = !!stats?.restaurant_name;
  const isProvisioned = setupStatus === "provisioned";
  const hasTables = tables.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-amber-500" />
          Restaurant Provisioning
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Admin-first setup: create tables, generate QR batch, then mark live.
        </p>
      </div>

      {(setupError || actionError) && (
        <AdminCard className="p-4 border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
          <p className="text-sm text-red-600 dark:text-red-400">
            {setupError || actionError}
          </p>
        </AdminCard>
      )}

      {actionMessage && (
        <AdminCard className="p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {actionMessage}
          </p>
        </AdminCard>
      )}

      <AdminCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Provisioning status
            </p>
            <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
              {hasRestaurantRecord
                ? stats?.restaurant_name
                : "Restaurant record missing"}
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isProvisioned
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {isProvisioned ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Clock3 className="h-3.5 w-3.5" />
            )}
            {isProvisioned ? "Provisioned / Live" : "Pending Setup"}
          </div>
        </div>
      </AdminCard>

      {!hasRestaurantRecord && (
        <AdminCard className="p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Step 0. Create restaurant record
          </p>
          <form onSubmit={handleSetup} className="space-y-3">
            <AdminInput
              label="Restaurant Name"
              name="restaurant_name"
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. The Golden Fork"
              required
            />
            <AdminButton
              type="submit"
              variant="primary"
              size="md"
              disabled={setupLoading}
              loading={setupLoading}
            >
              {setupLoading ? "Creating..." : "Create Restaurant Record"}
            </AdminButton>
          </form>
        </AdminCard>
      )}

      {hasRestaurantRecord && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <UtensilsCrossed className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Restaurant
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
                    {stats?.restaurant_name}
                  </p>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <LayoutGrid className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Tables
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.tables_count ?? 0}
                  </p>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Staff
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.staff_count ?? 0}
                  </p>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Active Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.active_orders ?? 0}
                  </p>
                </div>
              </div>
            </AdminCard>
          </div>

          <AdminCard className="p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Step 1. Create tables
            </p>
            <form
              onSubmit={handleCreateTables}
              className="flex flex-col md:flex-row md:items-end gap-3"
            >
              <div className="w-full md:max-w-[240px]">
                <AdminInput
                  label="Number of tables"
                  name="table_count"
                  type="number"
                  min={1}
                  max={500}
                  value={tableCount}
                  onChange={(e) => setTableCount(e.target.value)}
                  required
                />
              </div>
              <AdminButton
                type="submit"
                variant="primary"
                size="md"
                disabled={createTablesLoading}
                loading={createTablesLoading}
              >
                {createTablesLoading ? "Creating..." : "Create Tables + Tokens"}
              </AdminButton>
            </form>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Active tables
              </p>
              {tablesLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading tables...
                </p>
              ) : tables.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tables created yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[...tables]
                    .sort((a, b) => {
                      const numA = parseInt(
                        a.table_number.replace(/\D/g, ""),
                        10,
                      );
                      const numB = parseInt(
                        b.table_number.replace(/\D/g, ""),
                        10,
                      );
                      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                      return a.table_number.localeCompare(b.table_number);
                    })
                    .map((table) => (
                      <div
                        key={table.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Table {table.table_number}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {table.table_token}
                          </p>
                        </div>
                        <AdminButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deleteTableId === table.id}
                          onClick={() => handleDeleteTable(table.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </AdminButton>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </AdminCard>

          <AdminCard className="p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Step 2. Generate table QR batch
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <AdminButton
                type="button"
                variant="secondary"
                size="md"
                disabled={generateQrLoading || !hasTables}
                loading={generateQrLoading}
                onClick={handleGenerateQrs}
                icon={<Download className="h-4 w-4" />}
              >
                {generateQrLoading ? "Generating..." : "Generate QR ZIP"}
              </AdminButton>
              {!hasTables && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Create at least one table before generating QR codes.
                </p>
              )}
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Download latest QR archive
                {downloadCount ? ` (${downloadCount} tables)` : ""}
              </a>
            )}
          </AdminCard>

          <AdminCard className="p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Step 3. Mark restaurant live
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <AdminButton
                type="button"
                variant="success"
                size="md"
                disabled={statusLoading !== null || !hasTables || isProvisioned}
                loading={statusLoading === "provisioned"}
                onClick={() => handleSetupStatus("provisioned")}
              >
                Mark as Provisioned / Live
              </AdminButton>

              <AdminButton
                type="button"
                variant="secondary"
                size="md"
                disabled={statusLoading !== null || !isProvisioned}
                loading={statusLoading === "pending"}
                onClick={() => handleSetupStatus("pending")}
              >
                Move Back to Pending
              </AdminButton>
            </div>
            {!hasTables && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Locked rule: at least one active table is required before
                marking as live.
              </p>
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
}
