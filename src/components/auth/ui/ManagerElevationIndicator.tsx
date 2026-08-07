/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: ManagerElevationIndicator
 * Description: Floating status badge displayed when 5-minute Manager Elevation is active,
 *              featuring a live countdown timer and instant dismissal button.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, X } from 'lucide-react';
import { useTerminalContext } from '../../../context/TerminalContext';

export const ManagerElevationIndicator: React.FC = () => {
  const { managerElevation, clearManagerElevation } = useTerminalContext();

  const [remainingTime, setRemainingTime] = useState<string>('05:00');

  useEffect(() => {
    if (!managerElevation.isElevated || !managerElevation.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const exp = new Date(managerElevation.expiresAt!).getTime();
      const diffMs = exp - now;

      if (diffMs <= 0) {
        clearManagerElevation();
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setRemainingTime(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [managerElevation, clearManagerElevation]);

  if (!managerElevation.isElevated) return null;

  return (
    <div className="fixed top-4 right-4 z-40 bg-amber-950/90 border border-amber-500/50 text-amber-200 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3 animate-slide-down select-none">
      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
        <ShieldCheck className="w-5 h-5" />
      </div>

      <div className="text-left">
        <div className="text-xs font-bold text-white flex items-center gap-2">
          <span>Elevated: {managerElevation.managerName || 'Manager'}</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] text-amber-300 font-mono">
            {managerElevation.targetAction || 'OVERRIDE'}
          </span>
        </div>
        <div className="text-[11px] text-amber-300/80 flex items-center gap-1.5 mt-0.5">
          <Clock className="w-3 h-3" />
          <span className="font-mono font-semibold">{remainingTime} remaining</span>
        </div>
      </div>

      <button
        type="button"
        onClick={clearManagerElevation}
        aria-label="Clear manager elevation"
        className="ml-2 p-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-900/80 text-amber-300 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
