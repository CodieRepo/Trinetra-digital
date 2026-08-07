'use client';

import React from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { Clock, Hash, Calendar, Ticket, Receipt } from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 4, label: 'April (Standard Financial Year IN)' },
  { value: 7, label: 'July' },
  { value: 10, label: 'October' },
];

export const Step3OperatingHours: React.FC = () => {
  const { step3, updateStep3 } = useSetupWizardStore();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Clock className="w-4 h-4" /> Step 3 of 8
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Operating Hours & Ticket Configuration</h2>
        <p className="text-slate-400 text-sm mt-1">
          Configure daily operational hours, financial year start month, and ticket/invoice sequence prefixes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Opening & Closing Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" /> Store Opening Time
              </label>
              <input
                type="time"
                value={step3.openingTime}
                onChange={(e) => updateStep3({ openingTime: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-amber-500 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" /> Store Closing Time
              </label>
              <input
                type="time"
                value={step3.closingTime}
                onChange={(e) => updateStep3({ closingTime: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-amber-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* Order & Bill Prefix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-amber-400" /> KOT / Order Prefix
                </span>
                <span className="text-xs text-slate-500">Max 8 chars</span>
              </label>
              <input
                type="text"
                maxLength={8}
                value={step3.orderPrefix}
                onChange={(e) => updateStep3({ orderPrefix: e.target.value.toUpperCase() })}
                placeholder="ORD-"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-amber-500 text-sm font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-amber-400" /> Invoice / Bill Prefix
                </span>
                <span className="text-xs text-slate-500">Max 8 chars</span>
              </label>
              <input
                type="text"
                maxLength={8}
                value={step3.billPrefix}
                onChange={(e) => updateStep3({ billPrefix: e.target.value.toUpperCase() })}
                placeholder="INV-"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-amber-500 text-sm font-mono uppercase"
              />
            </div>
          </div>

          {/* Fiscal Year Start Month */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" /> Fiscal Year Start Month
            </label>
            <select
              value={step3.fiscalStartMonth}
              onChange={(e) => updateStep3({ fiscalStartMonth: parseInt(e.target.value, 10) })}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-amber-500 text-sm"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prefix Live Demonstration */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sequential ID Preview</div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <Ticket className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-xs text-slate-400 block">KOT / Kitchen Ticket ID</span>
                <span className="font-mono font-bold text-white text-base">
                  {step3.orderPrefix || 'ORD-'}2026-0001
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex items-center gap-3">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs text-slate-400 block">Final Tax Invoice ID</span>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  {step3.billPrefix || 'INV-'}2026-0001
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400 block mb-1">Configured Shift Hours</span>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> {step3.openingTime} — {step3.closingTime}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
