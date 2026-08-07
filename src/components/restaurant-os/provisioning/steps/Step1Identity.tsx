'use client';

import React from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { BrandTheme, RestaurantType } from '@/types/restaurant-os/provisioning';
import { Building2, Palette } from 'lucide-react';

const RESTAURANT_TYPES: { id: RestaurantType; label: string; desc: string }[] = [
  { id: 'FineDining', label: 'Fine Dining', desc: 'Table service, multi-course dining' },
  { id: 'CasualDining', label: 'Casual Dining', desc: 'Relaxed atmosphere, standard dining' },
  { id: 'Cafe', label: 'Cafe & Bistro', desc: 'Coffee, beverages & light bites' },
  { id: 'QSR', label: 'Quick Service (QSR)', desc: 'Fast counter ordering & takeout' },
  { id: 'CloudKitchen', label: 'Cloud Kitchen', desc: 'Delivery-only virtual kitchen' },
  { id: 'PubBar', label: 'Pub & Bar', desc: 'Drinks, spirits & pub menu' },
  { id: 'Bakery', label: 'Bakery & Confectionery', desc: 'Fresh baked goods & pastries' },
];

const THEMES: { id: BrandTheme; name: string; bg: string; border: string; accent: string }[] = [
  { id: 'amber', name: 'Warm Amber', bg: 'bg-amber-500', border: 'border-amber-500', accent: 'text-amber-400' },
  { id: 'emerald', name: 'Emerald Palm', bg: 'bg-emerald-500', border: 'border-emerald-500', accent: 'text-emerald-400' },
  { id: 'cobalt', name: 'Royal Cobalt', bg: 'bg-indigo-500', border: 'border-indigo-500', accent: 'text-indigo-400' },
  { id: 'crimson', name: 'Crimson Velvet', bg: 'bg-rose-500', border: 'border-rose-500', accent: 'text-rose-400' },
];

export const Step1Identity: React.FC = () => {
  const { step1, updateStep1 } = useSetupWizardStore();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Building2 className="w-4 h-4" /> Step 1 of 8
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Restaurant Identity & Branding</h2>
        <p className="text-slate-400 text-sm mt-1">
          Define how your restaurant is displayed across POS terminals, kitchen tickets, and customer receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Restaurant Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
              <span>Restaurant Display Name <span className="text-amber-400">*</span></span>
              <span className="text-xs text-slate-500">Appears on tickets & POS</span>
            </label>
            <input
              type="text"
              value={step1.restaurantName}
              onChange={(e) => updateStep1({ restaurantName: e.target.value })}
              placeholder="e.g. Royal Spice Bistro"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-base"
            />
          </div>

          {/* Cuisine Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Cuisine & Concept</label>
            <input
              type="text"
              value={step1.cuisineType}
              onChange={(e) => updateStep1({ cuisineType: e.target.value })}
              placeholder="e.g. North Indian & Mughlai, Italian, Continental"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          {/* Restaurant Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Operating Model</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RESTAURANT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => updateStep1({ restaurantType: type.id })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    step1.restaurantType === type.id
                      ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-sm">{type.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Theme Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-400" /> POS Visual Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => updateStep1({ brandTheme: t.id })}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                    step1.brandTheme === t.id
                      ? 'bg-slate-800 border-amber-500 text-white ring-1 ring-amber-500'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${t.bg} shadow-md`} />
                  <span className="text-xs font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Ticket Preview</div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl">
                {step1.restaurantName ? step1.restaurantName[0].toUpperCase() : 'R'}
              </div>
              <div>
                <h4 className="font-bold text-white text-base leading-tight">
                  {step1.restaurantName || 'Restaurant Name'}
                </h4>
                <p className="text-xs text-amber-400 font-medium">{step1.cuisineType || 'Cuisine'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded font-mono">
                  {step1.restaurantType}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-800 pt-4 space-y-2 text-xs text-slate-400 font-mono">
              <div className="flex justify-between">
                <span>ORDER #ORD-1001</span>
                <span>TABLE #04</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-200">
                <span>1x Paneer Butter Masala</span>
                <span>₹340.00</span>
              </div>
              <div className="flex justify-between">
                <span>1x Butter Naan</span>
                <span>₹60.00</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-amber-400 text-sm">
                <span>TOTAL</span>
                <span>₹400.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
