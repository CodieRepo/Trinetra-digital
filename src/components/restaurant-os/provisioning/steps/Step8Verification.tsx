'use client';

import React, { useState } from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { Rocket, AlertTriangle, CheckCircle2, RefreshCw, ArrowRight, ExternalLink } from 'lucide-react';

export const Step8Verification: React.FC = () => {
  const { readiness, runReadinessCheck, setStep, completeGoLive, isSaving } = useSetupWizardStore();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleRunVerification = async () => {
    setIsVerifying(true);
    await runReadinessCheck();
    setIsVerifying(false);
  };

  const checks = readiness?.checks;
  const isReady = readiness?.isReady ?? false;

  const passedCount = Object.values(checks || {}).filter(Boolean).length;
  const totalCount = Object.keys(checks || {}).length || 8;
  const readinessScore = Math.round((passedCount / totalCount) * 100);

  const checklistItems = [
    { key: 'hasOwner', title: 'Owner Account Initialized', step: 1, pass: checks?.hasOwner ?? true },
    { key: 'hasBranch', title: 'Branch Tenant Created', step: 1, pass: checks?.hasBranch ?? true },
    { key: 'hasFloors', title: 'Floor Sections Blueprint', step: 4, pass: checks?.hasFloors ?? false },
    { key: 'hasTables', title: 'Dining Tables Layout', step: 4, pass: checks?.hasTables ?? false },
    { key: 'hasSettings', title: 'Hours & Tax Configurations', step: 3, pass: checks?.hasSettings ?? true },
    { key: 'hasOwnerPin', title: 'Owner Security 4-Digit PIN', step: 6, pass: checks?.hasOwnerPin ?? false },
  ];

  const failedItems = checklistItems.filter((item) => !item.pass);

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Step Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Rocket className="w-4 h-4" /> Step 8 of 8 — Go Live Readiness
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">System Diagnostic & Go Live Gate</h2>
        <p className="text-slate-400 text-sm mt-1">
          Run automated system verification check before activating operational SaaS status and pairing terminal devices.
        </p>
      </div>

      {/* Score Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-6">
          {/* Radial Score */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={isReady ? 'text-emerald-400' : 'text-amber-400'}
                strokeDasharray={`${readinessScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-bold text-xl text-white font-mono">{readinessScore}%</span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">
              {isReady ? 'Operational Readiness Confirmed' : 'Configuration Check Pending'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isReady
                ? 'All mandatory readiness criteria passed. Ready to switch restaurant status to Operational.'
                : `${failedItems.length} issue(s) require attention before launch.`}
            </p>
          </div>
        </div>

        {/* Verification Action Button */}
        <button
          type="button"
          onClick={handleRunVerification}
          disabled={isVerifying}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-white font-semibold text-sm flex items-center gap-2 transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} /> Run Diagnostic Verification
        </button>
      </div>

      {/* Critical Issues Warning Box */}
      {failedItems.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" /> {failedItems.length} Critical Issue(s) Blocking Launch
          </div>
          <div className="space-y-2">
            {failedItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-200 font-medium">{item.title}</span>
                <button
                  type="button"
                  onClick={() => setStep(item.step)}
                  className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  Fix in Step {item.step} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Diagnostic Checklist Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Automated System Audit Checklist</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checklistItems.map((item) => (
            <div
              key={item.key}
              className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all ${
                item.pass
                  ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                  : 'bg-slate-900/80 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.pass ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="font-medium">{item.title}</span>
              </div>

              {!item.pass && (
                <button
                  type="button"
                  onClick={() => setStep(item.step)}
                  className="text-amber-400 hover:underline text-[11px] font-semibold"
                >
                  Fix
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Complete Go Live Banner */}
      {isReady && (
        <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/40 rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xl mx-auto shadow-lg shadow-emerald-500/30 animate-bounce">
            🚀
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Setup Completed Successfully!</h3>
            <p className="text-slate-300 text-xs mt-1">
              Your restaurant is fully configured. Completing setup will activate operational status and launch terminal pairing.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const ok = await completeGoLive();
              if (ok) {
                window.location.href = '/auth/pair-terminal';
              }
            }}
            disabled={isSaving}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm rounded-xl shadow-xl shadow-emerald-500/25 active:scale-95 inline-flex items-center gap-2"
          >
            {isSaving ? 'Activating Restaurant OS...' : 'Complete Setup & Launch Restaurant OS'} <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
