/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: LoadingOverlay
 * Description: Non-blocking loading state overlay displaying calm activity indicators.
 */

'use client';

import React from 'react';
import { ChefHat } from 'lucide-react';

export interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Authenticating Terminal...',
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 flex items-center justify-center font-black text-2xl shadow-xl shadow-amber-500/20 mb-4 animate-bounce">
        <ChefHat className="w-8 h-8" />
      </div>
      <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-semibold text-white tracking-wide">{message}</p>
      <p className="text-xs text-neutral-400 mt-1">Trinetra Restaurant OS • Verification in progress</p>
    </div>
  );
};
