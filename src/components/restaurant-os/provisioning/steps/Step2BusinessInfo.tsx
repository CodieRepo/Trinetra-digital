'use client';

import React from 'react';
import { useSetupWizardStore } from '@/lib/stores/useSetupWizardStore';
import { FileText, ShieldCheck, MapPin, Globe, Phone, Mail } from 'lucide-react';

const TIMEZONES = [
  { id: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30)' },
  { id: 'Asia/Dubai', label: 'Asia/Dubai (GST +4:00)' },
  { id: 'Europe/London', label: 'Europe/London (GMT +0:00)' },
  { id: 'America/New_York', label: 'America/New_York (EST -5:00)' },
];

export const Step2BusinessInfo: React.FC = () => {
  const { step2, updateStep2 } = useSetupWizardStore();

  const isGstinValid = !step2.gstin || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(step2.gstin.toUpperCase());
  const isFssaiValid = !step2.fssaiLicense || /^[0-9]{14}$/.test(step2.fssaiLicense);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <FileText className="w-4 h-4" /> Step 2 of 8
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Business & Legal Information</h2>
        <p className="text-slate-400 text-sm mt-1">
          Provide your legal entity details, GSTIN, FSSAI license number, and store contact info.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GSTIN Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> GSTIN (Tax Identification)
            </span>
            <span className="text-xs text-slate-500">15-character GSTIN</span>
          </label>
          <input
            type="text"
            maxLength={15}
            value={step2.gstin}
            onChange={(e) => updateStep2({ gstin: e.target.value.toUpperCase() })}
            placeholder="e.g. 29AABCU9603R1ZM"
            className={`w-full px-4 py-3 bg-slate-900 border rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none text-sm uppercase ${
              isGstinValid
                ? 'border-slate-700/80 focus:border-amber-500'
                : 'border-rose-500/80 focus:border-rose-500 text-rose-300'
            }`}
          />
          {!isGstinValid && (
            <p className="text-xs text-rose-400 mt-1">Invalid GSTIN format (e.g. 29AABCU9603R1ZM)</p>
          )}
        </div>

        {/* FSSAI License */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> FSSAI License Number
            </span>
            <span className="text-xs text-slate-500">14-digit Food License</span>
          </label>
          <input
            type="text"
            maxLength={14}
            value={step2.fssaiLicense}
            onChange={(e) => updateStep2({ fssaiLicense: e.target.value })}
            placeholder="e.g. 10019043002768"
            className={`w-full px-4 py-3 bg-slate-900 border rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none text-sm ${
              isFssaiValid
                ? 'border-slate-700/80 focus:border-amber-500'
                : 'border-rose-500/80 focus:border-rose-500 text-rose-300'
            }`}
          />
          {!isFssaiValid && (
            <p className="text-xs text-rose-400 mt-1">FSSAI license must be exactly 14 numeric digits</p>
          )}
        </div>

        {/* Store Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-amber-400" /> Store Contact Phone
          </label>
          <input
            type="tel"
            value={step2.phone}
            onChange={(e) => updateStep2({ phone: e.target.value })}
            placeholder="+91 98765 43210"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
          />
        </div>

        {/* Store Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-amber-400" /> Official Business Email
          </label>
          <input
            type="email"
            value={step2.email}
            onChange={(e) => updateStep2({ email: e.target.value })}
            placeholder="orders@restaurant.com"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
          />
        </div>

        {/* Physical Address */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400" /> Store Address
          </label>
          <textarea
            rows={2}
            value={step2.address}
            onChange={(e) => updateStep2({ address: e.target.value })}
            placeholder="e.g. Ground Floor, Plot 42, Civil Lines, Gorakhpur, UP - 273001"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm resize-none"
          />
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-amber-400" /> Operating Timezone
          </label>
          <select
            value={step2.timezone}
            onChange={(e) => updateStep2({ timezone: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-amber-500 text-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Currency Standard</label>
          <input
            type="text"
            disabled
            value="INR (₹) — Indian Rupee"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-sm cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
};
