/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: ExpiredView
 * Description: Staff shift session expiration alert view prompting quick PIN re-entry.
 */

'use client';

import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import { PinPad } from './PinPad';
import { useTerminalContext } from '../../../context/TerminalContext';

export interface ExpiredViewProps {
  onPinSubmit: (pin: string) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const ExpiredView: React.FC<ExpiredViewProps> = ({
  onPinSubmit,
  isLoading = false,
  errorMessage = null,
}) => {
  const { staff, logoutStaff } = useTerminalContext();

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="w-full max-w-md bg-neutral-900/90 border border-amber-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="flex items-center justify-between mb-6 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Shift Session Expired</h2>
              <p className="text-xs text-amber-400">15-minute security interval reached</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logoutStaff}
            aria-label="Logout staff"
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 text-center mb-6">
          Re-enter PIN for <span className="text-white font-bold">{staff?.name || 'Staff Member'}</span> ({staff?.role}) to resume your working shift.
        </p>

        <PinPad
          onPinSubmit={onPinSubmit}
          isLoading={isLoading}
          errorMessage={errorMessage}
          title="Resume Shift"
          subtitle="Re-enter your PIN to unlock session"
        />
      </div>
    </div>
  );
};
