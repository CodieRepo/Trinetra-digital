/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: RouteGuard
 * Description: Top-level terminal route guard evaluating device pairing, terminal lockout,
 *              staff authentication state, auto-lock timers, and session expiration.
 */

'use client';

import React, { ReactNode } from 'react';
import { useTerminalContext } from '../../context/TerminalContext';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useSessionManager } from '../../hooks/useSessionManager';

export interface RouteGuardProps {
  children: ReactNode;
  unpairedComponent?: ReactNode;
  lockedComponent?: ReactNode;
  revokedComponent?: ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  unpairedComponent,
  lockedComponent,
  revokedComponent,
}) => {
  const { isPaired, isLocked, isRevoked, staff, staffJwt } = useTerminalContext();

  // Attach background auto-lock timer & session expiration monitor
  useAutoLock(180000); // 3-minute idle timeout
  useSessionManager();

  // 1. Hardware Device Revoked State
  if (isRevoked) {
    return (
      revokedComponent || (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center text-red-400">
          <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800 flex items-center justify-center mb-4 text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-red-200">Terminal Access Revoked</h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-md">
            This hardware terminal device has been revoked by restaurant management. Please contact your administrator.
          </p>
        </div>
      )
    );
  }

  // 2. Hardware Device Unpaired State
  if (!isPaired) {
    return (
      unpairedComponent || (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center text-neutral-300">
          <h1 className="text-xl font-bold text-white">Terminal Pairing Required</h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-md">
            This terminal must be paired by an Owner or Manager before opening POS operations.
          </p>
        </div>
      )
    );
  }

  // 3. Terminal Locked or Staff Session Unauthenticated State
  if (isLocked || !staff || !staffJwt) {
    return (
      lockedComponent || (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center text-neutral-300">
          <h1 className="text-xl font-bold text-white">Terminal Locked</h1>
          <p className="text-sm text-neutral-400 mt-2">Enter your 4 to 6 digit staff PIN to unlock.</p>
        </div>
      )
    );
  }

  // 4. Authenticated Staff Operating State
  return <>{children}</>;
};
