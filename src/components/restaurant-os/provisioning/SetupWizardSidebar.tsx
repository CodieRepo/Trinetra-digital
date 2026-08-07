'use client';

import React from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import {
  Building2,
  FileText,
  Clock,
  LayoutGrid,
  Receipt,
  Lock,
  Sparkles,
  CheckCircle2,
  Rocket,
} from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Restaurant Identity', desc: 'Brand & visual identity', icon: Building2 },
  { id: 2, name: 'Business Information', desc: 'GSTIN, FSSAI & Location', icon: FileText },
  { id: 3, name: 'Operating Configuration', desc: 'Hours & Prefix codes', icon: Clock },
  { id: 4, name: 'Floor & Table Blueprint', desc: 'Seating layout builder', icon: LayoutGrid },
  { id: 5, name: 'Taxes & Charges', desc: 'GST rates & Service fee', icon: Receipt },
  { id: 6, name: 'Owner Security PIN', desc: 'High-privilege security PIN', icon: Lock },
  { id: 7, name: 'Sample Data', desc: 'Demo menu opt-in', icon: Sparkles },
  { id: 8, name: 'Verification & Go Live', desc: 'Readiness check & launch', icon: Rocket },
];

export const SetupWizardSidebar: React.FC = () => {
  const { currentStep, setStep, profile } = useSetupWizardStore();

  const maxReachedStep = profile?.wizardStep || 1;

  return (
    <aside className="w-full lg:w-72 bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 lg:p-6 shrink-0">
      <div className="mb-4 hidden lg:block">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-400">Setup Workflow</h2>
        <p className="text-xs text-slate-500 mt-0.5">Complete steps 1 to 8</p>
      </div>

      <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = step.id < currentStep || (step.id === 8 && profile?.wizardCompleted);
          const isUnlocked = step.id <= maxReachedStep + 1 || isCompleted;

          return (
            <button
              key={step.id}
              onClick={() => isUnlocked && setStep(step.id)}
              disabled={!isUnlocked}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left shrink-0 w-64 lg:w-full border ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/30 text-white shadow-lg shadow-amber-500/5'
                  : isCompleted
                  ? 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/70'
                  : isUnlocked
                  ? 'bg-slate-900/40 border-slate-800/50 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  : 'opacity-40 border-transparent text-slate-600 cursor-not-allowed'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold truncate">{step.name}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate hidden lg:block">{step.desc}</p>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
