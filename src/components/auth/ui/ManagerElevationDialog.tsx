/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: ManagerElevationDialog
 * Description: Touch-first modal dialog prompting for Manager or Owner PIN override
 *              when attempting restricted operational actions.
 */

'use client';

import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { PinPad } from './PinPad';
import { useTerminalContext } from '../../../context/TerminalContext';
import { ManagerElevationResponseDTO, ApiResponse } from '../../../types/auth';

export interface ManagerElevationDialogProps {
  isOpen: boolean;
  targetAction: string;
  actionDescription?: string;
  onClose: () => void;
  onSuccess?: (elevationToken: string) => void;
}

export const ManagerElevationDialog: React.FC<ManagerElevationDialogProps> = ({
  isOpen,
  targetAction,
  actionDescription = 'This operational action requires Manager or Owner PIN authorization.',
  onClose,
  onSuccess,
}) => {
  const { terminal, setManagerElevation } = useTerminalContext();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManagerPinSubmit = async (pin: string) => {
    if (!terminal) {
      setErrorMessage('Hardware terminal context not found');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/auth/manager/elevate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: terminal.restaurant_id,
          terminal_id: terminal.terminal_id,
          manager_pin: pin,
          target_action: targetAction,
          reason: 'Manager override requested on POS terminal',
        }),
      });

      const responseData: ApiResponse<ManagerElevationResponseDTO> = await res.json();

      if (!res.ok || !responseData.success || !responseData.data) {
        setErrorMessage(responseData.error?.message || 'Invalid Manager PIN or insufficient role');
        return;
      }

      // Store 5-minute Manager Elevation in Zustand state store
      setManagerElevation(
        responseData.data.elevation_token,
        responseData.data.manager.staff_id,
        responseData.data.manager.name,
        targetAction,
        responseData.data.expires_at
      );

      if (onSuccess) {
        onSuccess(responseData.data.elevation_token);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while verifying Manager PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-md bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close elevation dialog"
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dialog Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Manager Override Required</h3>
            <p className="text-xs text-amber-400 font-semibold">{targetAction}</p>
          </div>
        </div>

        <p className="text-xs text-neutral-400 mb-6 leading-relaxed">{actionDescription}</p>

        {/* Touch PIN Keypad for Manager PIN */}
        <PinPad
          onPinSubmit={handleManagerPinSubmit}
          isLoading={isLoading}
          errorMessage={errorMessage}
          title="Enter Manager PIN"
          subtitle="Manager or Owner PIN required"
        />
      </div>
    </div>
  );
};
