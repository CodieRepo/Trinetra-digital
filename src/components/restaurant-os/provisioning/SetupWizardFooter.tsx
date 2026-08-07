'use client';

import React from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react';

interface FooterProps {
  onNext?: () => void;
  canProceed?: boolean;
}

export const SetupWizardFooter: React.FC<FooterProps> = ({ onNext, canProceed = true }) => {
  const { currentStep, setStep, isSaving, completeGoLive, readiness } = useSetupWizardStore();

  const handleNext = async () => {
    if (onNext) {
      onNext();
    } else if (currentStep < 8) {
      setStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
  };

  return (
    <footer className="sticky bottom-0 z-20 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-6 py-4 mt-auto">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1 || isSaving}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            currentStep === 1
              ? 'opacity-0 pointer-events-none'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Action Button */}
        {currentStep < 8 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${
              !canProceed || isSaving
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-95'
            }`}
          >
            {isSaving ? 'Saving...' : 'Continue to Next Step'} <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              const ok = await completeGoLive();
              if (ok) {
                window.location.href = '/auth/pair-terminal';
              }
            }}
            disabled={!readiness?.isReady || isSaving}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-xl ${
              !readiness?.isReady || isSaving
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-emerald-500/25 active:scale-95 animate-pulse'
            }`}
          >
            <Rocket className="w-4 h-4" /> Complete Setup & Go Live
          </button>
        )}
      </div>
    </footer>
  );
};
