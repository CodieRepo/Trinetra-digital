/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: StaffListView
 * Description: Operational staff directory view allowing Managers & Owners to manage team members,
 *              roles, PIN resets, and active login statuses.
 */

'use client';

import React, { useState } from 'react';
import { Users, UserPlus, KeyRound, Edit2, Shield, Power } from 'lucide-react';
import { StaffMember } from './types';
import { StaffModal } from './StaffModal';
import { ResetPinModal } from './ResetPinModal';
import { StaffRole } from '../../types/auth';

const MOCK_INITIAL_STAFF: StaffMember[] = [
  {
    id: 'eabf167a-6fea-4331-81a3-0bc87ee54f5e',
    tenant_id: '1ab21b6e-d5ea-4395-81e4-ba2d06907194',
    restaurant_id: 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213',
    name: 'Suresh Mehta',
    role: 'manager',
    email: 'suresh@spicegarden.com',
    phone: '+91 9876543210',
    is_active: true,
    has_pin: true,
    created_at: '2026-08-01T10:00:00Z',
    last_login_at: '2026-08-05T14:30:00Z',
  },
  {
    id: 'a5b835e8-9cf8-4944-b0da-0d111f329a23',
    tenant_id: '1ab21b6e-d5ea-4395-81e4-ba2d06907194',
    restaurant_id: 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213',
    name: 'Rajesh Kumar',
    role: 'waiter',
    email: 'rajesh@spicegarden.com',
    phone: '+91 9876543211',
    is_active: true,
    has_pin: true,
    created_at: '2026-08-02T11:00:00Z',
    last_login_at: '2026-08-05T15:00:00Z',
  },
  {
    id: 'c4d5e6f7-8901-2345-6789-0123456789ab',
    tenant_id: '1ab21b6e-d5ea-4395-81e4-ba2d06907194',
    restaurant_id: 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213',
    name: 'Anita Roy',
    role: 'cashier',
    email: 'anita@spicegarden.com',
    phone: '+91 9876543212',
    is_active: true,
    has_pin: true,
    created_at: '2026-08-03T12:00:00Z',
    last_login_at: '2026-08-05T12:15:00Z',
  },
];

export const StaffListView: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>(MOCK_INITIAL_STAFF);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState<boolean>(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

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

  const handleToggleActive = (staffId: string) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const handleSaveStaff = async (data: Partial<StaffMember>) => {
    if (selectedStaff) {
      // Update existing staff
      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaff.id ? ({ ...s, ...data } as StaffMember) : s))
      );
    } else {
      // Create new staff
      const newStaff: StaffMember = {
        id: crypto.randomUUID(),
        tenant_id: '1ab21b6e-d5ea-4395-81e4-ba2d06907194',
        restaurant_id: 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213',
        name: data.name || 'New Staff',
        role: (data.role as StaffRole) || 'waiter',
        email: data.email,
        phone: data.phone,
        is_active: data.is_active ?? true,
        has_pin: false,
        created_at: new Date().toISOString(),
      };
      setStaffList((prev) => [...prev, newStaff]);
    }
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
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-neutral-900 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Staff & Security Management</h1>
            <p className="text-xs text-neutral-400">Manage employee accounts, RBAC roles, and PIN access</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateStaff}
          className="h-12 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

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
              {staffList.map((member) => (
                <tr key={member.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-white text-sm">{member.name}</div>
                    <div className="text-neutral-400 text-[11px] font-mono mt-0.5">
                      {member.email || member.phone || 'No contact details'}
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
                      <span className="text-amber-400 font-semibold">PIN Pending</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenResetPin(member)}
                      className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 transition-colors"
                      title="Reset Staff PIN"
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
                      onClick={() => handleToggleActive(member.id)}
                      className={`p-2.5 rounded-xl transition-colors ${
                        member.is_active
                          ? 'bg-neutral-800 hover:bg-red-950 text-red-400'
                          : 'bg-neutral-800 hover:bg-emerald-950 text-emerald-400'
                      }`}
                      title={member.is_active ? 'Deactivate Staff' : 'Activate Staff'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
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
          if (selectedStaff) {
            setStaffList((prev) =>
              prev.map((s) => (s.id === selectedStaff.id ? { ...s, has_pin: true } : s))
            );
          }
        }}
      />
    </div>
  );
};
