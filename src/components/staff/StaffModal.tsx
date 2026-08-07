/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: StaffModal
 * Description: Modal dialog for creating new staff profiles or editing existing staff roles & status.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, X } from 'lucide-react';
import { StaffMember } from './types';
import { StaffRole } from '../../types/auth';

export interface StaffModalProps {
  isOpen: boolean;
  staffToEdit?: StaffMember | null;
  onClose: () => void;
  onSave: (data: Partial<StaffMember>) => Promise<void>;
}

const ROLES: { role: StaffRole; label: string; description: string }[] = [
  { role: 'owner', label: 'Owner', description: 'Full SaaS & branch administrative privileges' },
  { role: 'manager', label: 'Manager', description: 'Branch management, overrides, & staff reports' },
  { role: 'cashier', label: 'Cashier', description: 'POS sales, cash register, & bill settlement' },
  { role: 'waiter', label: 'Waiter', description: 'Table session ordering & service management' },
  { role: 'kitchen', label: 'Kitchen Staff', description: 'KDS order prep & ticket updates' },
  { role: 'inventory', label: 'Inventory Manager', description: 'Stock, suppliers, & recipe management' },
  { role: 'accountant', label: 'Accountant', description: 'Financial audit, expenses, & shift settlement' },
];

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  staffToEdit,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (staffToEdit) {
      setName(staffToEdit.name);
      setRole(staffToEdit.role);
      setEmail(staffToEdit.email || '');
      setPhone(staffToEdit.phone || '');
      setIsActive(staffToEdit.is_active);
    } else {
      setName('');
      setRole('waiter');
      setEmail('');
      setPhone('');
      setIsActive(true);
    }
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({
        name,
        role,
        email: email || undefined,
        phone: phone || undefined,
        is_active: isActive,
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            {staffToEdit ? <UserCheck className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {staffToEdit ? 'Edit Staff Profile' : 'Add New Staff Member'}
            </h3>
            <p className="text-xs text-neutral-400">
              {staffToEdit ? 'Update role and operational permissions' : 'Create a staff profile for PIN login'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Ramesh Sharma"
              className="w-full h-12 rounded-xl bg-neutral-950 border border-neutral-800 px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase tracking-wider">
              Assign Operational Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full h-12 rounded-xl bg-neutral-950 border border-neutral-800 px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              {ROLES.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label} — {r.description}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase tracking-wider">
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@restaurant.com"
                className="w-full h-12 rounded-xl bg-neutral-950 border border-neutral-800 px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase tracking-wider">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full h-12 rounded-xl bg-neutral-950 border border-neutral-800 px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div>
              <div className="text-xs font-bold text-white">Active Status</div>
              <div className="text-[11px] text-neutral-400">Enable or disable PIN authentication for this staff member</div>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                isActive ? 'bg-amber-500' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-neutral-950 absolute top-1 transition-transform ${
                  isActive ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-6 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Save Staff Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
