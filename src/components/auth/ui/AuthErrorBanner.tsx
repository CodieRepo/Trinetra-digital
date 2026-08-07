/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: AuthErrorBanner
 * Description: Polished error and recovery banner mapping system exceptions into readable staff messages.
 */

'use client';

import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export interface AuthErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const AuthErrorBanner: React.FC<AuthErrorBannerProps> = ({
  title = 'Authentication Failure',
  message,
  onRetry,
  onDismiss,
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 shadow-xl backdrop-blur-md flex items-start justify-between gap-3 my-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-red-900/60 text-red-400 shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-red-100">{title}</h4>
          <p className="text-xs text-red-300 mt-0.5 leading-relaxed">{message}</p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-900/80 hover:bg-red-800 text-xs font-semibold text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error banner"
          className="p-1 rounded-lg hover:bg-red-900/50 text-red-400 hover:text-red-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
