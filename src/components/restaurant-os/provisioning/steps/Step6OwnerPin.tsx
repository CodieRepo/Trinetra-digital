'use client';

import React, { useState } from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { Lock, ShieldAlert, CheckCircle2, Delete } from 'lucide-react';

const TRIVIAL_PINS = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '9876', '4321'];

export const Step6OwnerPin: React.FC = () => {
  const { step6, updateStep6 } = useSetupWizardStore();
  const [activeInput, setActiveInput] = useState<'raw' | 'confirm'>('raw');
  const [pinError, setPinError] = useState<string | null>(null);

  const handleKeyPress = (digit: string) => {
    setPinError(null);
    if (activeInput === 'raw') {
      if (step6.rawPin.length < 4) {
        const nextPin = step6.rawPin + digit;
        updateStep6({ rawPin: nextPin });
        if (nextPin.length === 4) setActiveInput('confirm');
      }
    } else {
      if (step6.confirmPin.length < 4) {
        const nextConfirm = step6.confirmPin + digit;
        updateStep6({ confirmPin: nextConfirm });
      }
    }
  };

  const handleDelete = () => {
    setPinError(null);
    if (activeInput === 'confirm') {
      if (step6.confirmPin.length > 0) {
        updateStep6({ confirmPin: step6.confirmPin.slice(0, -1) });
      } else {
        setActiveInput('raw');
      }
    } else {
      updateStep6({ rawPin: step6.rawPin.slice(0, -1) });
    }
  };

  const handleClear = () => {
    setPinError(null);
    updateStep6({ rawPin: '', confirmPin: '' });
    setActiveInput('raw');
  };

  const isComplete = step6.rawPin.length === 4 && step6.confirmPin.length === 4 && step6.rawPin === step6.confirmPin && !TRIVIAL_PINS.includes(step6.rawPin);

  return (
    <div className="space-y-8 animate-fadeIn max-w-xl mx-auto">
      {/* Step Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Lock className="w-4 h-4" /> Step 6 of 8 — Mandatory Security Gate
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Owner Security PIN</h2>
        <p className="text-slate-400 text-sm mt-1">
          Set a 4-digit security PIN for high-privilege operations, manager approvals, and terminal lock override.
        </p>
      </div>

      {/* PIN Displays */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveInput('raw')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            activeInput === 'raw'
              ? 'bg-slate-900 border-amber-500 ring-1 ring-amber-500'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium mb-2">Owner PIN</div>
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-colors ${
                  step6.rawPin.length > idx ? 'bg-amber-400 shadow-md shadow-amber-500/50' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveInput('confirm')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            activeInput === 'confirm'
              ? 'bg-slate-900 border-amber-500 ring-1 ring-amber-500'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium mb-2">Confirm PIN</div>
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-colors ${
                  step6.confirmPin.length > idx ? 'bg-amber-400 shadow-md shadow-amber-500/50' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </button>
      </div>

      {/* Error / Success Feedback */}
      {pinError ? (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs justify-center">
          <ShieldAlert className="w-4 h-4 shrink-0" /> {pinError}
        </div>
      ) : isComplete ? (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs justify-center font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Owner Security PIN Validated & Ready to Save
        </div>
      ) : null}

      {/* Touch Numeric Keypad */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-xs mx-auto">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="w-16 h-16 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-white font-bold text-xl transition-all border border-slate-700/50 flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="w-16 h-16 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 font-semibold text-xs transition-all border border-slate-800 flex items-center justify-center mx-auto"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-white font-bold text-xl transition-all border border-slate-700/50 flex items-center justify-center mx-auto"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-16 h-16 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 transition-all border border-slate-800 flex items-center justify-center mx-auto"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
