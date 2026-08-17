'use client';

import React from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { Cloud, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

export const SetupWizardHeader: React.FC = () => {
  const { currentStep, saveStatus, isOffline, profile, errorMessage } = useSetupWizardStore();

  const percentage = Math.round((currentStep / 8) * 100);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Restaurant Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold text-lg">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-semibold text-base tracking-tight">
                {profile?.restaurantName
                  ? `${profile.restaurantName} Setup`
                  : profile?.cuisineType
                    ? `${profile.cuisineType} Setup`
                    : 'Restaurant Setup Wizard'}
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                Milestone 3
              </span>
            </div>
            <p className="text-xs text-slate-400">Trinetra Restaurant OS Onboarding Engine</p>
          </div>
        </div>

        {/* Progress Bar & Save Status */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          {/* Save Status Indicator */}
          <div className="flex items-center gap-2 text-xs">
            {isOffline ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <WifiOff className="w-3.5 h-3.5" /> Offline Mode
              </span>
            ) : saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving changes...
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Cloud className="w-3.5 h-3.5" /> All changes saved
              </span>
            ) : saveStatus === 'error' ? (
              <span className="flex items-center gap-1.5 text-rose-400" title={errorMessage || 'Error saving'}>
                <AlertCircle className="w-3.5 h-3.5" /> Save failed
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Cloud className="w-3.5 h-3.5" /> Synced
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="w-32 md:w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-300 font-mono">{percentage}%</span>
          </div>
        </div>
      </div>
    </header>
  );
};
