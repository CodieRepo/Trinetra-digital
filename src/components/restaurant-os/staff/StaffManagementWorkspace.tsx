"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  KeyRound,
  Edit2,
  Shield,
  Power,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { StaffModal } from "@/components/staff/StaffModal";
import { ResetPinModal } from "@/components/staff/ResetPinModal";
import { StaffMember } from "@/components/staff/types";
import { StaffRole } from "@/types/auth";
import { createClient } from "@/lib/supabase/client";

interface StaffManagementWorkspaceProps {
  restaurantId: string;
  tenantId?: string;
  userRole?: string;
}

export const StaffManagementWorkspace: React.FC<StaffManagementWorkspaceProps> = ({
  restaurantId,
  tenantId,
}) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Modal states
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState<boolean>(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async (customHeaders: Record<string, string> = {}) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      return {
        ...customHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { "x-tenant-id": tenantId } : {}),
        ...(restaurantId && restaurantId !== "default" ? { "x-restaurant-id": restaurantId } : {}),
      };
    } catch {
      return {
        ...customHeaders,
        ...(tenantId ? { "x-tenant-id": tenantId } : {}),
        ...(restaurantId && restaurantId !== "default" ? { "x-restaurant-id": restaurantId } : {}),
      };
    }
  }, [tenantId, restaurantId]);

  const getStaffApiUrl = useCallback(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const url = new URL("/api/client/restaurant/staff", origin);
    if (tenantId) url.searchParams.set("tenant_id", tenantId);
    if (restaurantId && restaurantId !== "default") url.searchParams.set("restaurant_id", restaurantId);
    return url.toString();
  }, [tenantId, restaurantId]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch(getStaffApiUrl(), { headers, cache: "no-store" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch staff (${res.status})`);
      }
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading staff directory";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, getStaffApiUrl]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleCreateStaff = () => {
    setSelectedStaff(null);
    setIsStaffModalOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsStaffModalOpen(true);
  };

  const handleOpenResetPin = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsResetPinModalOpen(true);
  };

  const handleSaveStaff = async (data: Partial<StaffMember>) => {
    try {
      const headers = await getAuthHeaders({ "Content-Type": "application/json" });
      const apiUrl = getStaffApiUrl();
      if (selectedStaff) {
        // Edit existing staff
        const res = await fetch(apiUrl, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            staff_id: selectedStaff.id,
            tenant_id: tenantId,
            restaurant_id: restaurantId,
            name: data.name,
            role: data.role,
            is_active: data.is_active,
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Failed to update staff member");
        }

        showToast(`Staff member "${data.name || selectedStaff.name}" updated successfully.`);
      } else {
        // Create new staff
        const res = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            tenant_id: tenantId,
            restaurant_id: restaurantId,
            name: data.name,
            role: data.role,
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Failed to create staff member");
        }

        showToast(`Staff member "${data.name}" added successfully.`);
      }

      await fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      showToast(msg, "error");
      throw err;
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    const nextActive = !member.is_active;
    const actionLabel = nextActive ? "reactivate" : "deactivate";

    if (!confirm(`Are you sure you want to ${actionLabel} ${member.name}?`)) {
      return;
    }

    try {
      setBusyStaffId(member.id);
      const headers = await getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(getStaffApiUrl(), {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          staff_id: member.id,
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          is_active: nextActive,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || `Failed to ${actionLabel} staff`);
      }

      showToast(`Staff member "${member.name}" ${nextActive ? "reactivated" : "deactivated"}.`);
      await fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${actionLabel} staff`;
      showToast(msg, "error");
    } finally {
      setBusyStaffId(null);
    }
  };

  const handleCopyOpsLink = (member: StaffMember) => {
    const link = `${window.location.origin}/staff/ops?role=${member.role}&restaurant_id=${restaurantId}`;
    navigator.clipboard.writeText(link);
    showToast(`Copied operations link for ${member.name} (${member.role})`);
  };

  const getRoleBadgeStyle = (role: StaffRole) => {
    switch (role) {
      case "owner":
        return "bg-purple-50 border-purple-200 text-purple-800";
      case "manager":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "cashier":
        return "bg-emerald-50 border-emerald-200 text-emerald-800";
      case "waiter":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "kitchen":
        return "bg-orange-50 border-orange-200 text-orange-800";
      case "inventory":
        return "bg-cyan-50 border-cyan-200 text-cyan-800";
      case "accountant":
        return "bg-teal-50 border-teal-200 text-teal-800";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 ${
            toastType === "success"
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          {toastType === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Team Members & Role Access
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {staffList.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage all 7 operational roles, terminal PIN credentials, and service access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchStaff}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleCreateStaff}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Roster Table */}
        <div className="mt-6 border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">Staff Member</th>
                  <th className="py-3.5 px-5">Operational Role</th>
                  <th className="py-3.5 px-5">Account Status</th>
                  <th className="py-3.5 px-5">PIN Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && staffList.length === 0 ? (
                  // Loading skeleton
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-5">
                        <div className="h-4 bg-slate-200 rounded w-32 mb-1.5" />
                        <div className="h-3 bg-slate-100 rounded w-24" />
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-6 bg-slate-100 rounded-full w-20" />
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-6 bg-slate-100 rounded-full w-16" />
                      </td>
                      <td className="py-4 px-5">
                        <div className="h-4 bg-slate-100 rounded w-24" />
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="h-8 bg-slate-100 rounded-lg w-24 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : staffList.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan={5} className="py-12 px-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">No Team Members Added Yet</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Add your waiters, kitchen staff, cashiers, and managers to enable POS, KDS, and table operations.
                      </p>
                      <button
                        type="button"
                        onClick={handleCreateStaff}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add First Member</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  // Real Roster Rows
                  staffList.map((member) => (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        !member.is_active ? "bg-slate-50/40 opacity-75" : ""
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{member.name}</span>
                          {!member.is_active && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] font-mono mt-0.5 truncate max-w-xs">
                          ID: {member.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${getRoleBadgeStyle(
                            member.role
                          )}`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{member.role}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            member.is_active
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.is_active ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <span>{member.is_active ? "Active" : "Deactivated"}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {member.has_pin ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                            <KeyRound className="w-3.5 h-3.5 text-emerald-600" /> Configured
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold flex items-center gap-1 text-[11px]">
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" /> PIN Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenResetPin(member)}
                          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 transition-colors cursor-pointer shadow-xs"
                          title={member.has_pin ? "Reset PIN" : "Set Initial PIN"}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditStaff(member)}
                          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shadow-xs"
                          title="Edit Staff Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyOpsLink(member)}
                          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors cursor-pointer shadow-xs"
                          title="Copy Operations Link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busyStaffId === member.id}
                          onClick={() => handleToggleActive(member)}
                          className={`p-2 rounded-lg border transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${
                            member.is_active
                              ? "border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                              : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                          }`}
                          title={member.is_active ? "Deactivate Staff Member" : "Reactivate Staff Member"}
                        >
                          {busyStaffId === member.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Staff Add / Edit Modal */}
      <StaffModal
        isOpen={isStaffModalOpen}
        staffToEdit={selectedStaff}
        onClose={() => setIsStaffModalOpen(false)}
        onSave={handleSaveStaff}
      />

      {/* Reset PIN Modal */}
      <ResetPinModal
        isOpen={isResetPinModalOpen}
        staffMember={selectedStaff}
        restaurantId={restaurantId}
        tenantId={tenantId}
        onClose={() => setIsResetPinModalOpen(false)}
        onPinResetSuccess={() => {
          showToast("Security PIN configured successfully.");
          fetchStaff();
        }}
      />
    </div>
  );
};
