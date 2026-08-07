/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: PinPad
 * Description: Touch-first and keyboard-friendly 4-to-6 digit numeric keypad with instant
 *              visual feedback, haptic-ready animations, and auto-submit upon completion.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Delete, KeyRound, AlertCircle } from 'lucide-react';

export interface PinPadProps {
  onPinSubmit: (pin: string) => Promise<void> | void;
  isLoading?: boolean;
  errorMessage?: string | null;
  maxLength?: number;
  title?: string;
  subtitle?: string;
}

export const PinPad: React.FC<PinPadProps> = ({
  onPinSubmit,
  isLoading = false,
  errorMessage = null,
  maxLength = 6,
  title = 'Enter Staff PIN',
  subtitle = 'Enter your 4 to 6 digit numeric PIN to switch user',
}) => {
  const [pin, setPin] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleKeyPress = useCallback(
    (digit: string) => {
      if (isLoading) return;
      if (pin.length < maxLength) {
        const newPin = pin + digit;
        setPin(newPin);
        setActiveKey(digit);
        setTimeout(() => setActiveKey(null), 120);

        // Auto-submit if PIN reaches 4 or 6 digits
        if (newPin.length >= 4 && newPin.length <= 6) {
          // If 6 digits, submit immediately
          if (newPin.length === 6) {
            onPinSubmit(newPin);
          }
        }
      }
    },
    [pin, maxLength, isLoading, onPinSubmit]
  );

  const handleDelete = useCallback(() => {
    if (isLoading) return;
    setPin((prev) => prev.slice(0, -1));
    setActiveKey('del');
    setTimeout(() => setActiveKey(null), 120);
  }, [isLoading]);

  const handleClear = useCallback(() => {
    if (isLoading) return;
    setPin('');
    setActiveKey('clear');
    setTimeout(() => setActiveKey(null), 120);
  }, [isLoading]);

  const handleSubmit = useCallback(() => {
    if (isLoading || pin.length < 4) return;
    onPinSubmit(pin);
  }, [pin, isLoading, onPinSubmit]);

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;

      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleDelete, handleClear, handleSubmit, pin, isLoading]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'];

  return (
    <div className="w-full max-w-sm mx-auto bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wide">{title}</h2>
        <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
      </div>

      {/* PIN Dot Displays */}
      <div className="flex items-center justify-center gap-3 mb-6 h-12">
        {Array.from({ length: 6 }).map((_, index) => {
          const isFilled = index < pin.length;
          return (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-150 ${
                isFilled
                  ? 'bg-amber-400 scale-110 shadow-lg shadow-amber-500/30'
                  : 'bg-neutral-800 border border-neutral-700'
              }`}
            />
          );
        })}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Numeric Touch Keypad */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {keys.map((key) => {
          const isActive = activeKey === key;

          if (key === 'C') {
            return (
              <button
                key={key}
                type="button"
                onClick={handleClear}
                disabled={isLoading || pin.length === 0}
                aria-label="Clear PIN"
                className={`h-16 rounded-2xl font-semibold text-sm transition-all duration-100 flex items-center justify-center ${
                  isActive ? 'bg-neutral-700 scale-95' : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400'
                } disabled:opacity-30 disabled:pointer-events-none active:scale-95`}
              >
                CLEAR
              </button>
            );
          }

          if (key === 'DEL') {
            return (
              <button
                key={key}
                type="button"
                onClick={handleDelete}
                disabled={isLoading || pin.length === 0}
                aria-label="Delete digit"
                className={`h-16 rounded-2xl font-semibold text-sm transition-all duration-100 flex items-center justify-center ${
                  isActive ? 'bg-neutral-700 scale-95' : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400'
                } disabled:opacity-30 disabled:pointer-events-none active:scale-95`}
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyPress(key)}
              disabled={isLoading}
              aria-label={`Digit ${key}`}
              className={`h-16 rounded-2xl font-bold text-2xl transition-all duration-100 flex items-center justify-center border border-neutral-800/60 ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 scale-95'
                  : 'bg-neutral-800/80 hover:bg-neutral-700 text-white'
              } active:scale-95 disabled:opacity-50`}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Manual Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || pin.length < 4}
        className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm tracking-wide uppercase transition-all duration-150 shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
        ) : (
          'Unlock Terminal'
        )}
      </button>
    </div>
  );
};
