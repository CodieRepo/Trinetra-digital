/**
 * Trinetra Restaurant OS — Milestone H-2B Staff Directory
 * Component: StaffListView
 * Description: Canonical operational staff directory view allowing Managers & Owners to manage
 *              team members, all 7 roles, PIN resets, and active/inactive status via real database APIs.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, KeyRound, Edit2, Shield, Trash2, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { StaffMember } from './types';
import { StaffModal } from './StaffModal';
import { ResetPinModal } from './ResetPinModal';
import { StaffRole } from '../../types/auth';

export const StaffListView: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState<boolean>(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/client/restaurant/staff', { cache: 'no-store' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch staff (${res.status})`);
      }
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load staff list';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleDeleteStaff = (staff: StaffMember) => {
    setStaffToDelete(staff);
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    const member = staffToDelete;

    try {
      setBusyStaffId(member.id);
      const res = await fetch('/api/client/restaurant/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: member.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete staff member');
      }

      showToast(`Staff member "${member.name}" deleted successfully.`);
      setStaffToDelete(null);
      await fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting staff member';
      setError(msg);
    } finally {
      setBusyStaffId(null);
    }
  };

  const handleSaveStaff = async (data: Partial<StaffMember>) => {
    if (selectedStaff) {
      // Edit existing staff
      const res = await fetch('/api/client/restaurant/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          name: data.name,
          role: data.role,
          is_active: data.is_active,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to update staff member');
      }

      showToast(`Staff member "${data.name || selectedStaff.name}" updated successfully.`);
    } else {
      // Create new staff
      const res = await fetch('/api/client/restaurant/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          role: data.role,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to create staff member');
      }

      showToast(`Staff member "${data.name}" added successfully.`);
    }

    await fetchStaff();
  };

  const getRoleBadgeStyle = (role: StaffRole) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-950/60 border-purple-800 text-purple-300';
      case 'manager':
        return 'bg-amber-950/60 border-amber-800 text-amber-300';
      case 'cashier':
        return 'bg-emerald-950/60 border-emerald-800 text-emerald-300';
      case 'waiter':
        return 'bg-blue-950/60 border-blue-800 text-blue-300';
      case 'kitchen':
        return 'bg-orange-950/60 border-orange-800 text-orange-300';
      case 'inventory':
        return 'bg-cyan-950/60 border-cyan-800 text-cyan-300';
      case 'accountant':
        return 'bg-teal-950/60 border-teal-800 text-teal-300';
      default:
        return 'bg-neutral-800 border-neutral-700 text-neutral-300';
    }
  };

  return (
    <div className="p-6 sm:p-8 bg-neutral-950 text-white min-h-screen select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white shadow-2xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-neutral-900 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">Staff & Security Management</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                {staffList.length} Total
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">Manage all 7 operational roles, terminal PIN access, and team status</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchStaff}
            disabled={loading}
            className="p-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-neutral-800"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleCreateStaff}
            className="h-12 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Staff Directory Table */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-4 px-6">Staff Member</th>
                <th className="py-4 px-6">RBAC Role</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">PIN Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {loading && staffList.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 bg-neutral-800 rounded w-32 mb-1.5" />
                      <div className="h-3 bg-neutral-800/60 rounded w-20" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-6 bg-neutral-800 rounded-full w-20" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-6 bg-neutral-800 rounded-full w-16" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-neutral-800 rounded w-24" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-8 bg-neutral-800 rounded-xl w-24 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-neutral-400">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-white">No Staff Members Found</p>
                    <p className="text-xs text-neutral-500 mt-1">Add your team members to enable operations.</p>
                  </td>
                </tr>
              ) : (
                staffList.map((member) => (
                  <tr key={member.id} className={`hover:bg-neutral-800/40 transition-colors ${!member.is_active ? 'opacity-60' : ''}`}>
                    <td className="py-4 px-6">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{member.name}</span>
                        {!member.is_active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-neutral-500 text-[11px] font-mono mt-0.5">
                        ID: {member.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${getRoleBadgeStyle(
                          member.role
                        )}`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>{member.role}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          member.is_active
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950/60 text-red-300 border border-red-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.is_active ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        <span>{member.is_active ? 'Active' : 'Deactivated'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {member.has_pin ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5" /> Configured
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5" /> PIN Pending
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenResetPin(member)}
                        className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 transition-colors"
                        title={member.has_pin ? 'Reset Staff PIN' : 'Set Initial PIN'}
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditStaff(member)}
                        className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                        title="Edit Profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busyStaffId === member.id}
                        onClick={() => handleDeleteStaff(member)}
                        className="p-2.5 rounded-xl bg-neutral-800 hover:bg-red-950 text-red-400 transition-colors cursor-pointer"
                        title="Delete Staff Member"
                      >
                        {busyStaffId === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
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
        onClose={() => setIsResetPinModalOpen(false)}
        onPinResetSuccess={() => {
          showToast('Security PIN updated successfully.');
          fetchStaff();
        }}
      />

      {/* Delete Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Staff Member</h3>
                <p className="text-xs text-neutral-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-neutral-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">{staffToDelete.name}</strong> ({staffToDelete.role})? Their security PIN and operations link will be permanently revoked immediately.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={busyStaffId === staffToDelete.id}
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyStaffId === staffToDelete.id}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {busyStaffId === staffToDelete.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Staff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
