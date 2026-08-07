/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: AuthContainer
 * Description: Master authentication UI view container connecting all 7 authentication screens
 *              to the underlying Zustand store, React Context, and backend REST APIs.
 */

'use client';

import React, { useState } from 'react';
import { useTerminalContext } from '../../context/TerminalContext';
import { RouteGuard } from './RouteGuard';
import { LockScreen } from './ui/LockScreen';
import { PairingScreen } from './ui/PairingScreen';
import { RevokedScreen } from './ui/RevokedScreen';
import { ExpiredView } from './ui/ExpiredView';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { PairTerminalInput, PairTerminalResponseDTO, StaffPinLoginResponseDTO, ApiResponse } from '../../types/auth';

export interface AuthContainerProps {
  children: React.ReactNode;
}

export const AuthContainer: React.FC<AuthContainerProps> = ({ children }) => {
  const {
    isSessionExpired,
    terminal,
    deviceToken,
    setTerminalPairing,
    setStaffSession,
    unlockTerminal,
  } = useTerminalContext();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Handle Device Pairing Submit
  const handlePairSubmit = async (input: PairTerminalInput) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/auth/terminals/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const responseData: ApiResponse<PairTerminalResponseDTO> = await res.json();

      if (!res.ok || !responseData.success || !responseData.data) {
        setErrorMessage(responseData.error?.message || 'Terminal device pairing failed');
        return;
      }

      // Save terminal pairing & plaintext device token to store
      setTerminalPairing(
        {
          terminal_id: responseData.data.terminal_id,
          tenant_id: input.tenant_id,
          restaurant_id: input.restaurant_id,
          terminal_name: responseData.data.terminal_name,
          terminal_type: responseData.data.terminal_type,
          device_fingerprint: input.device_fingerprint || null,
          status: responseData.data.status,
          app_version: input.app_version || 'v1.0.0',
          paired_at: responseData.data.paired_at,
          last_seen_at: new Date().toISOString(),
        },
        responseData.data.device_token
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while attempting terminal pairing');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Staff PIN Login Submit
  const handlePinSubmit = async (pin: string) => {
    if (!terminal || !deviceToken) {
      setErrorMessage('Device is not properly paired');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/auth/staff/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: terminal.restaurant_id,
          device_token: deviceToken,
          pin,
        }),
      });

      const responseData: ApiResponse<StaffPinLoginResponseDTO> = await res.json();

      if (!res.ok || !responseData.success || !responseData.data) {
        setErrorMessage(responseData.error?.message || 'Incorrect staff PIN');
        return;
      }

      // Set staff session & unlock terminal
      setStaffSession(
        {
          staff_id: responseData.data.staff.staff_id,
          tenant_id: terminal.tenant_id,
          restaurant_id: terminal.restaurant_id,
          name: responseData.data.staff.name,
          role: responseData.data.staff.role,
          is_active: true,
          last_login_at: new Date().toISOString(),
        },
        responseData.data.staff_jwt,
        responseData.data.expires_at
      );
      unlockTerminal();
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while authenticating PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <LoadingOverlay message="Authenticating..." />}

      <RouteGuard
        unpairedComponent={
          <PairingScreen
            onPairSubmit={handlePairSubmit}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        }
        revokedComponent={<RevokedScreen />}
        lockedComponent={
          isSessionExpired ? (
            <ExpiredView
              onPinSubmit={handlePinSubmit}
              isLoading={isLoading}
              errorMessage={errorMessage}
            />
          ) : (
            <LockScreen
              onPinSubmit={handlePinSubmit}
              isLoading={isLoading}
              errorMessage={errorMessage}
            />
          )
        }
      >
        {children}
      </RouteGuard>
    </>
  );
};
