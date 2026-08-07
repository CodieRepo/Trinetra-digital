/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/context/TerminalContext.tsx
 * Description: React Context exposing hardware terminal context, active staff session,
 *              and terminal locking functions to the UI component tree.
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthStore, ManagerElevationState } from '../store/useAuthStore';
import { TerminalContext as ITerminalContext, StaffContext, StaffRole } from '../types/auth';

export interface TerminalContextValue {
  isPaired: boolean;
  terminal: ITerminalContext | null;
  deviceToken: string | null;
  isLocked: boolean;
  isRevoked: boolean;

  staff: StaffContext | null;
  staffJwt: string | null;
  sessionExpiresAt: string | null;
  isSessionExpired: boolean;

  managerElevation: ManagerElevationState;

  // Convenient helper flags
  activeRole: StaffRole | null;
  isManagerOrOwner: boolean;

  // Actions
  setTerminalPairing: (terminal: ITerminalContext, deviceToken: string) => void;
  setStaffSession: (staff: StaffContext, staffJwt: string, expiresAt: string) => void;
  lockTerminal: () => void;
  unlockTerminal: () => void;
  setRevoked: () => void;
  logoutStaff: () => void;
  clearTerminalPairing: () => void;
  setManagerElevation: (
    elevationToken: string,
    managerStaffId: string,
    managerName: string,
    targetAction: string,
    expiresAt: string
  ) => void;
  clearManagerElevation: () => void;
}

const TerminalContext = createContext<TerminalContextValue | undefined>(undefined);

export const TerminalContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const store = useAuthStore();

  const activeRole = store.staff?.role || null;
  const isManagerOrOwner = activeRole === 'owner' || activeRole === 'manager';

  const value: TerminalContextValue = {
    isPaired: store.isPaired,
    terminal: store.terminal,
    deviceToken: store.deviceToken,
    isLocked: store.isLocked,
    isRevoked: store.isRevoked,

    staff: store.staff,
    staffJwt: store.staffJwt,
    sessionExpiresAt: store.sessionExpiresAt,
    isSessionExpired: store.isSessionExpired,

    managerElevation: store.managerElevation,

    activeRole,
    isManagerOrOwner,

    setTerminalPairing: store.setTerminalPairing,
    setStaffSession: store.setStaffSession,
    lockTerminal: store.lockTerminal,
    unlockTerminal: store.unlockTerminal,
    setRevoked: store.setRevoked,
    logoutStaff: store.logoutStaff,
    clearTerminalPairing: store.clearTerminalPairing,
    setManagerElevation: store.setManagerElevation,
    clearManagerElevation: store.clearManagerElevation,
  };

  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>;
};

export const useTerminalContext = (): TerminalContextValue => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminalContext must be used within a TerminalContextProvider');
  }
  return context;
};
