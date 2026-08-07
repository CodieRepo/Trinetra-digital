/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: LockScreen
 * Description: Signature lock screen view displaying restaurant branding, live operational clock,
 *              branch & terminal metadata, and integrated touch PIN keypad.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Monitor, Clock, ChefHat } from 'lucide-react';
import { PinPad } from './PinPad';
import { useTerminalContext } from '../../../context/TerminalContext';

export interface LockScreenProps {
  onPinSubmit: (pin: string) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  onPinSubmit,
  isLoading = false,
  errorMessage = null,
}) => {
  const { terminal } = useTerminalContext();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      {/* Ambient Dark Mode Background Highlights */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar: Restaurant Branding & Terminal Metadata */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-900 pb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Trinetra Restaurant OS</h1>
            <p className="text-xs text-neutral-400 font-medium">
              {terminal?.terminal_name || 'Floor POS Terminal'} • {terminal?.terminal_type || 'FloorPOS'}
            </p>
          </div>
        </div>

        {/* Live Clock & Device Status Badge */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xl font-bold text-amber-400 tracking-wider font-mono">{currentTime}</div>
            <div className="text-xs text-neutral-400">{currentDate}</div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Terminal Paired & Active</span>
          </div>
        </div>
      </header>

      {/* Main Center Content: Live Clock + PIN Pad */}
      <main className="my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto w-full relative z-10">
        {/* Left Column: Big Operational Display for Busy Floor Staff */}
        <div className="lg:col-span-6 text-center lg:text-left space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-medium">
            <Monitor className="w-4 h-4 text-amber-400" />
            <span>Terminal ID: {terminal?.terminal_id ? `${terminal.terminal_id.substring(0, 8)}...` : 'Paired'}</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Ready for <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Daily Operations</span>
          </h2>

          <p className="text-sm text-neutral-400 max-w-md mx-auto lg:mx-0 leading-relaxed">
            Staff members can authenticate using their 4-6 digit numeric PIN to open orders, process payments, or view kitchen status.
          </p>

          <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              <span>3-Min Auto Lock</span>
            </div>
            <div>•</div>
            <div>Fast User Switching</div>
            <div>•</div>
            <div>Bcrypt Secured</div>
          </div>
        </div>

        {/* Right Column: Keypad Interface */}
        <div className="lg:col-span-6 flex justify-center">
          <PinPad
            onPinSubmit={onPinSubmit}
            isLoading={isLoading}
            errorMessage={errorMessage}
            title="Terminal Locked"
            subtitle="Enter your Staff PIN to switch user"
          />
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-neutral-900 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 relative z-10 gap-2">
        <div>Trinetra Restaurant OS v1.0.0 • Commercial Engine</div>
        <div>Protected by Hardware Device Token & PostgreSQL Row Level Security</div>
      </footer>
    </div>
  );
};
