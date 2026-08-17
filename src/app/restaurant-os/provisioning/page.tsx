'use client';

import React, { useState } from 'react';
import { Building2, Sparkles, ArrowRight, CheckCircle2, Rocket } from 'lucide-react';

export default function ProvisioningLandingPage() {
  const [tenantName, setTenantName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/restaurant-os/provisioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: tenantName || `${restaurantName} Group`,
          restaurantName,
          ownerEmail,
          ownerName,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Provisioning failed');
      setResult(json.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/restaurant-os/provisioning/demo', { method: 'POST' });
      const json = await res.json();
      const targetId = json.data?.restaurantId || json.data?.restaurant_id;
      if (json.success && targetId) {
        window.location.href = `/restaurant-os/provisioning/wizard?restaurantId=${targetId}`;
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" /> Trinetra Restaurant OS — Provisioning Gateway
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Provision New Restaurant SaaS Tenant
          </h1>
          <p className="text-slate-400 text-sm">
            Create an independent restaurant tenant and launch the 8-Step Operational Setup Wizard.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          {result ? (
            <div className="space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-2xl mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Restaurant Provisioned Successfully!</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">Restaurant ID: {result.restaurantId}</p>
              </div>

              <div className="pt-2">
                <a
                  href={`/restaurant-os/provisioning/wizard?restaurantId=${result.restaurantId}`}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Rocket className="w-4 h-4" /> Launch 8-Step Setup Wizard
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProvision} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Restaurant Name *</label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g. Amber Grill & Bistro"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Tenant / Org Name</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="e.g. Amber Hospitality Group"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Vikramaditya Singh"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Owner Email *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@ambergrill.com"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-sm transition-all"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Restaurant'} <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSeedDemo}
                  disabled={isSubmitting}
                  className="py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" /> Open Demo Restaurant
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
