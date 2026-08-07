/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/store/useAuthStore.ts
 * Description: Client-side Zustand store managing terminal pairing, active staff sessions,
 *              temporary manager elevations, and terminal locking states.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TerminalContext, StaffContext } from '../types/auth';

export interface ManagerElevationState {
  isElevated: boolean;
  elevationToken: string | null;
  managerStaffId: string | null;
  managerName: string | null;
  targetAction: string | null;
  expiresAt: string | null;
}

export interface AuthState {
  // Terminal State
  isPaired: boolean;
  terminal: TerminalContext | null;
  deviceToken: string | null;
  isLocked: boolean;
  isRevoked: boolean;
  
  // Active Staff Session State
  staff: StaffContext | null;
  staffJwt: string | null;
  sessionExpiresAt: string | null;
  isSessionExpired: boolean;

  // Manager Elevation State
  managerElevation: ManagerElevationState;

  // Actions
  setTerminalPairing: (terminal: TerminalContext, deviceToken: string) => void;
  setStaffSession: (staff: StaffContext, staffJwt: string, expiresAt: string) => void;
  lockTerminal: () => void;
  unlockTerminal: () => void;
  setRevoked: () => void;
  setSessionExpired: (expired: boolean) => void;
  setManagerElevation: (
    elevationToken: string,
    managerStaffId: string,
    managerName: string,
    targetAction: string,
    expiresAt: string
  ) => void;
  clearManagerElevation: () => void;
  logoutStaff: () => void;
  clearTerminalPairing: () => void;
}

const initialManagerElevation: ManagerElevationState = {
  isElevated: false,
  elevationToken: null,
  managerStaffId: null,
  managerName: null,
  targetAction: null,
  expiresAt: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial States
      isPaired: false,
      terminal: null,
      deviceToken: null,
      isLocked: false,
      isRevoked: false,

      staff: null,
      staffJwt: null,
      sessionExpiresAt: null,
      isSessionExpired: false,

      managerElevation: initialManagerElevation,

      // Actions
      setTerminalPairing: (terminal, deviceToken) =>
        set({
          isPaired: true,
          terminal,
          deviceToken,
          isLocked: false,
          isRevoked: false,
        }),

      setStaffSession: (staff, staffJwt, expiresAt) =>
        set({
          staff,
          staffJwt,
          sessionExpiresAt: expiresAt,
          isLocked: false,
          isSessionExpired: false,
        }),

      lockTerminal: () =>
        set({
          isLocked: true,
          staffJwt: null,
          managerElevation: initialManagerElevation,
        }),

      unlockTerminal: () =>
        set({
          isLocked: false,
        }),

      setRevoked: () =>
        set({
          isRevoked: true,
          isLocked: true,
          staff: null,
          staffJwt: null,
          managerElevation: initialManagerElevation,
        }),

      setSessionExpired: (expired: boolean) =>
        set({
          isSessionExpired: expired,
          ...(expired
            ? {
                staffJwt: null,
                isLocked: true,
                managerElevation: initialManagerElevation,
              }
            : {}),
        }),

      setManagerElevation: (elevationToken, managerStaffId, managerName, targetAction, expiresAt) =>
        set({
          managerElevation: {
            isElevated: true,
            elevationToken,
            managerStaffId,
            managerName,
            targetAction,
            expiresAt,
          },
        }),

      clearManagerElevation: () =>
        set({
          managerElevation: initialManagerElevation,
        }),

      logoutStaff: () =>
        set({
          staff: null,
          staffJwt: null,
          sessionExpiresAt: null,
          isLocked: true,
          isSessionExpired: false,
          managerElevation: initialManagerElevation,
        }),

      clearTerminalPairing: () =>
        set({
          isPaired: false,
          terminal: null,
          deviceToken: null,
          isLocked: false,
          isRevoked: false,
          staff: null,
          staffJwt: null,
          sessionExpiresAt: null,
          managerElevation: initialManagerElevation,
        }),
    }),
    {
      name: 'trinetra_terminal_auth_storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isPaired: state.isPaired,
        terminal: state.terminal,
        deviceToken: state.deviceToken,
        isRevoked: state.isRevoked,
      }),
    }
  )
);
