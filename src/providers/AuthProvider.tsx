/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/providers/AuthProvider.tsx
 * Description: Root application provider combining QueryClientProvider and TerminalContextProvider.
 */

'use client';

import React, { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TerminalContextProvider } from '../context/TerminalContext';

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TerminalContextProvider>{children}</TerminalContextProvider>
    </QueryClientProvider>
  );
};
