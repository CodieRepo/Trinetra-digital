'use client';

import React from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { Receipt, Percent, Calculator, CheckCircle2 } from 'lucide-react';

const GST_RATES = [
  { rate: 5, label: '5% GST (Standard Restaurant Rate)', desc: '2.5% CGST + 2.5% SGST' },
  { rate: 12, label: '12% GST (AC / Premium Dining)', desc: '6% CGST + 6% SGST' },
  { rate: 18, label: '18% GST (Hotel / Luxury Outlet)', desc: '9% CGST + 9% SGST' },
  { rate: 0, label: '0% Exempted', desc: 'No tax applied' },
];

export const Step5TaxSettings: React.FC = () => {
  const { step5, updateStep5 } = useSetupWizardStore();

  // Calculation demo for ₹500 item
  const basePrice = 500;
  const serviceChargeAmount = (basePrice * step5.serviceChargePercentage) / 100;
  const taxableSubtotal = basePrice + (step5.serviceChargeTaxable ? serviceChargeAmount : 0);
  const totalTax = (taxableSubtotal * step5.defaultGstRate) / 100;
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;
  const finalTotal = basePrice + serviceChargeAmount + (step5.taxInclusive ? 0 : totalTax);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Receipt className="w-4 h-4" /> Step 5 of 8
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Taxes & Service Charge Configuration</h2>
        <p className="text-slate-400 text-sm mt-1">
          Define statutory GST rates, tax calculation method (Inclusive vs Exclusive), and service fee rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Tax Inclusive Toggle */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-white text-sm">Tax Calculation Mode</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {step5.taxInclusive
                  ? 'Menu prices include GST (Tax inclusive billing)'
                  : 'GST is calculated on top of menu price (Tax exclusive billing)'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => updateStep5({ taxInclusive: !step5.taxInclusive })}
              className={`w-14 h-8 rounded-full transition-colors relative p-1 shrink-0 ${
                step5.taxInclusive ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-slate-950 transition-transform ${
                  step5.taxInclusive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* GST Rate Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-200">Default Statutory GST Rate</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GST_RATES.map((g) => (
                <button
                  key={g.rate}
                  type="button"
                  onClick={() => updateStep5({ defaultGstRate: g.rate })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    step5.defaultGstRate === g.rate
                      ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-white">{g.rate}% GST</span>
                    {step5.defaultGstRate === g.rate && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Service Charge Rate */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-amber-400" /> Default Service Charge %
              </span>
              <span className="text-xs text-slate-500">0% to 10% (Optional)</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={step5.serviceChargePercentage}
                onChange={(e) => updateStep5({ serviceChargePercentage: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="font-mono font-bold text-amber-400 text-base min-w-[3rem] text-right">
                {step5.serviceChargePercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Live Tax Invoice Preview Card */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-amber-400" /> Live Bill Calculation
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-3 font-mono text-xs">
            <div className="text-slate-400 border-b border-slate-800 pb-2 text-[11px] font-sans flex justify-between">
              <span>Sample Item: Paneer Tikka</span>
              <span>₹{basePrice.toFixed(2)}</span>
            </div>

            {step5.serviceChargePercentage > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Service Charge ({step5.serviceChargePercentage}%)</span>
                <span>₹{serviceChargeAmount.toFixed(2)}</span>
              </div>
            )}

            {step5.defaultGstRate > 0 && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>CGST ({(step5.defaultGstRate / 2).toFixed(1)}%)</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>SGST ({(step5.defaultGstRate / 2).toFixed(1)}%)</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="border-t border-dashed border-slate-800 pt-3 flex justify-between font-bold text-amber-400 text-sm font-sans">
              <span>FINAL PAYABLE</span>
              <span>₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
