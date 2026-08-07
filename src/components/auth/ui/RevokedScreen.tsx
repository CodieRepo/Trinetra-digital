/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: RevokedScreen
 * Description: High-contrast security alert view displayed when a hardware terminal device
 *              token has been revoked by restaurant management.
 */

'use client';

import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { useTerminalContext } from '../../../context/TerminalContext';

export interface RevokedScreenProps {
  onResetPairing?: () => void;
}

export const RevokedScreen: React.FC<RevokedScreenProps> = ({ onResetPairing }) => {
  const { terminal, clearTerminalPairing } = useTerminalContext();

  const handleReset = () => {
    if (onResetPairing) {
      onResetPairing();
    } else {
      clearTerminalPairing();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      <div className="w-full max-w-md bg-neutral-900/90 border border-red-900/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="w-9 h-9" />
        </div>

        <h1 className="text-2xl font-bold text-red-200">Terminal Access Revoked</h1>
        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
          Access for hardware terminal <span className="text-white font-medium">"{terminal?.terminal_name || 'Floor POS'}"</span> has been revoked by restaurant management.
        </p>

        <div className="my-6 p-4 rounded-2xl bg-red-950/30 border border-red-900/50 text-left text-xs space-y-2 text-red-300">
          <div>• Hardware token hash deactivated in database</div>
          <div>• Active staff session tokens invalidated</div>
          <div>• Hardware pairing key cleared</div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="w-full h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset Hardware Pairing</span>
        </button>
      </div>
    </div>
  );
};
