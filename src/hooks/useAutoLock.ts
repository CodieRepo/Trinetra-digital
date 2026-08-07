/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/hooks/useAutoLock.ts
 * Description: Hook monitoring user touch, pointer, and keyboard interactions to automatically
 *              lock the hardware terminal after 3 minutes of idle inactivity.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const DEFAULT_IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

export function useAutoLock(timeoutMs: number = DEFAULT_IDLE_TIMEOUT_MS) {
  const isPaired = useAuthStore((state) => state.isPaired);
  const isLocked = useAuthStore((state) => state.isLocked);
  const staff = useAuthStore((state) => state.staff);
  const lockTerminal = useAuthStore((state) => state.lockTerminal);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Only set auto-lock timer if terminal is paired, staff is logged in, and terminal is not locked
    if (isPaired && staff && !isLocked) {
      timerRef.current = setTimeout(() => {
        lockTerminal();
      }, timeoutMs);
    }
  }, [isPaired, staff, isLocked, lockTerminal, timeoutMs]);

  useEffect(() => {
    // List of interaction events indicating staff activity on tablet/desktop POS
    const events = ['pointerdown', 'mousemove', 'keydown', 'touchstart', 'scroll'];

    const handleUserActivity = () => {
      resetTimer();
    };

    if (isPaired && staff && !isLocked) {
      resetTimer();
      events.forEach((event) => {
        window.addEventListener(event, handleUserActivity, { passive: true });
      });
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isPaired, staff, isLocked, resetTimer]);
}
