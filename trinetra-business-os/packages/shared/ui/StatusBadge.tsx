'use client';

import { cn } from '../utils'; 

type StatusType = 'active' | 'draft' | 'paused' | 'completed' | 'redeemed';

interface StatusBadgeProps {
  status: string; // Accepting string to be flexible with backend data, will map to known types
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase() as StatusType;

  const variants: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    draft: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    paused: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    completed: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    redeemed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    default: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  };

  const selectedVariant = variants[normalizedStatus] || variants.default;

  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border capitalize",
        selectedVariant,
        className
      )}
    >
      {status}
    </span>
  );
}
