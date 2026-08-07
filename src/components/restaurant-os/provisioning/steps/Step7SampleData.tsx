'use client';

import React, { useState } from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { Sparkles, Check, Database, RefreshCw, Layers, Users } from 'lucide-react';

export const Step7SampleData: React.FC = () => {
  const { step7, updateStep7 } = useSetupWizardStore();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seededStatus, setSeededStatus] = useState<string | null>(null);

  const handleOptInChoice = async (loadSampleData: boolean) => {
    updateStep7({ loadSampleData });
    if (loadSampleData) {
      setIsSeeding(true);
      try {
        const res = await fetch('/api/restaurant-os/provisioning/demo', {
          method: 'POST',
        });
        const json = await res.json();
        if (json.success) {
          setSeededStatus('Sample Indian Cuisine Menu, Modifiers, Staff & Tables loaded successfully');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSeeding(false);
      }
    } else {
      setSeededStatus(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
      {/* Step Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" /> Step 7 of 8
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Sample Data & Demo Content Setup</h2>
        <p className="text-slate-400 text-sm mt-1">
          Choose whether to populate your restaurant with realistic sample menu items, categories, and staff accounts or start with a clean slate.
        </p>
      </div>

      {/* Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option A: Quick Start */}
        <button
          type="button"
          onClick={() => handleOptInChoice(true)}
          disabled={isSeeding}
          className={`p-6 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
            step7.loadSampleData
              ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500 shadow-xl shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          {step7.loadSampleData && (
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Check className="w-4 h-4" />
            </div>
          )}

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Quick Start with Sample Menu</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pre-populates Indian Cuisine menu categories (Starters, Main Course, Breads, Beverages), modifiers, staff roles, and 8 dining tables.
            </p>
          </div>

          <div className="mt-6 border-t border-slate-800/80 pt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> 12 Menu Items
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" /> 4 Staff Roles
            </div>
          </div>
        </button>

        {/* Option B: Clean Slate */}
        <button
          type="button"
          onClick={() => handleOptInChoice(false)}
          disabled={isSeeding}
          className={`p-6 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
            !step7.loadSampleData
              ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500 shadow-xl shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          {!step7.loadSampleData && (
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Check className="w-4 h-4" />
            </div>
          )}

          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Clean Slate (Manual Setup)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Start with an empty database. You can manually enter your menu items, custom categories, staff, and pricing after completing setup.
            </p>
          </div>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
            Recommended for existing restaurants importing custom POS catalog.
          </div>
        </button>
      </div>

      {/* Loading Overlay */}
      {isSeeding && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Populating sample menu, modifiers, and staff credentials...
        </div>
      )}

      {/* Success Notification */}
      {seededStatus && !isSeeding && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
          <Check className="w-4 h-4 shrink-0" /> {seededStatus}
        </div>
      )}
    </div>
  );
};
