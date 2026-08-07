/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: PairingScreen
 * Description: Initial hardware device setup screen allowing Owners or Managers to register
 *              and pair new POS, Cashier, or KDS terminals.
 */

'use client';

import React, { useState } from 'react';
import { Tablet, ShieldCheck, ArrowRight, AlertCircle, ChefHat } from 'lucide-react';
import { PairTerminalInput, TerminalType } from '../../../types/auth';

export interface PairingScreenProps {
  onPairSubmit: (input: PairTerminalInput) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const PairingScreen: React.FC<PairingScreenProps> = ({
  onPairSubmit,
  isLoading = false,
  errorMessage = null,
}) => {
  const [tenantId, setTenantId] = useState<string>('1ab21b6e-d5ea-4395-81e4-ba2d06907194');
  const [restaurantId, setRestaurantId] = useState<string>('a3c3e5f7-36e7-4409-8a25-76e4f7f47213');
  const [terminalName, setTerminalName] = useState<string>('Main Floor POS Tablet 1');
  const [terminalType, setTerminalType] = useState<TerminalType>('FloorPOS');
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('fp_tablet_floor_01');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onPairSubmit({
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      terminal_name: terminalName,
      terminal_type: terminalType,
      device_fingerprint: deviceFingerprint,
      app_version: 'v1.0.0',
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="w-full max-w-xl bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 border-b border-neutral-800 pb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20">
            <ChefHat className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Trinetra Restaurant OS</h1>
            <p className="text-xs text-neutral-400 mt-0.5">Initial Hardware Terminal Registration & Pairing</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tenant ID */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Tenant UUID
            </label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required
              className="w-full h-12 rounded-xl bg-neutral-950 border border-neutral-800 px-4 text-sm text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors font-mono"
            />
          </div>

          {/* Restaurant ID */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Restaurant / Branch UUID
            </label>
            <input
              type="text"
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              required
              className="w-full h-12 rounded-xl bg-neutral-950 border border-neutral-800 px-4 text-sm text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors font-mono"
            />
          </div>

          {/* Terminal Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Hardware Terminal Name
            </label>
            <input
              type="text"
              value={terminalName}
              onChange={(e) => setTerminalName(e.target.value)}
              placeholder="e.g. Main Dining POS 1"
              required
              className="w-full h-12 rounded-xl bg-neutral-950 border border-neutral-800 px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Terminal Type */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Terminal Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['FloorPOS', 'CashierPOS', 'KitchenKDS', 'ManagerMobile'] as TerminalType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTerminalType(type)}
                  className={`h-12 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    terminalType === type
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <Tablet className="w-4 h-4" />
                  <span>{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Device Fingerprint */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Device Fingerprint / MAC
            </label>
            <input
              type="text"
              value={deviceFingerprint}
              onChange={(e) => setDeviceFingerprint(e.target.value)}
              className="w-full h-12 rounded-xl bg-neutral-950 border border-neutral-800 px-4 text-sm text-neutral-300 focus:outline-none focus:border-amber-500 transition-colors font-mono"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm tracking-wide uppercase transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Register & Pair Device</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
