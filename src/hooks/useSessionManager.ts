/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/hooks/useSessionManager.ts
 * Description: Hook monitoring short-lived 15-minute staff JWT expiration and
 *              5-minute temporary manager elevation token expiration.
 */

'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export function useSessionManager() {
  const sessionExpiresAt = useAuthStore((state) => state.sessionExpiresAt);
  const isSessionExpired = useAuthStore((state) => state.isSessionExpired);
  const setSessionExpired = useAuthStore((state) => state.setSessionExpired);
  
  const managerElevation = useAuthStore((state) => state.managerElevation);
  const clearManagerElevation = useAuthStore((state) => state.clearManagerElevation);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();

      // 1. Check Staff Session Expiration (15-min JWT)
      if (sessionExpiresAt && !isSessionExpired) {
        const expTime = new Date(sessionExpiresAt).getTime();
        if (now >= expTime) {
          setSessionExpired(true);
        }
      }

      // 2. Check Manager Elevation Expiration (5-min token)
      if (managerElevation.isElevated && managerElevation.expiresAt) {
        const elevationExpTime = new Date(managerElevation.expiresAt).getTime();
        if (now >= elevationExpTime) {
          clearManagerElevation();
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [sessionExpiresAt, isSessionExpired, setSessionExpired, managerElevation, clearManagerElevation]);
}
