/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: ResetPinModal
 * Description: Modal dialog allowing Owners or Managers to set or reset a staff member's PIN.
 */

'use client';

import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { PinPad } from '../auth/ui/PinPad';
import { StaffMember } from './types';
import { createClient } from '@/lib/supabase/client';

export interface ResetPinModalProps {
  isOpen: boolean;
  staffMember: StaffMember | null;
  onClose: () => void;
  onPinResetSuccess?: () => void;
}

export const ResetPinModal: React.FC<ResetPinModalProps> = ({
  isOpen,
  staffMember,
  onClose,
  onPinResetSuccess,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !staffMember) return null;

  const handlePinSubmit = async (newPin: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let authHeader: Record<string, string> = {};
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = { Authorization: `Bearer ${session.access_token}` };
        }
      } catch {}

      const res = await fetch('/api/v1/auth/staff/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          staff_id: staffMember.id,
          restaurant_id: staffMember.restaurant_id,
          pin: newPin,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || 'Failed to update staff PIN');
        return;
      }

      if (onPinResetSuccess) {
        onPinResetSuccess();
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while resetting PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative">
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
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Reset Staff PIN</h3>
            <p className="text-xs text-neutral-400">
              Set new PIN for <span className="text-white font-semibold">{staffMember.name}</span> ({staffMember.role})
            </p>
          </div>
        </div>

        <PinPad
          onPinSubmit={handlePinSubmit}
          isLoading={isLoading}
          errorMessage={errorMessage}
          title="Enter New PIN"
          subtitle="Set a 4 to 6 digit PIN for staff login"
        />
      </div>
    </div>
  );
};
