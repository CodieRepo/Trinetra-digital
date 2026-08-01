import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            'border-transparent bg-primary text-primary-foreground shadow': variant === 'default',
            'border-transparent bg-secondary text-secondary-foreground': variant === 'secondary',
            'border-transparent bg-destructive text-destructive-foreground shadow': variant === 'destructive',
            'border-transparent bg-emerald-500/15 text-emerald-500 border border-emerald-500/30': variant === 'success',
            'text-foreground border-border': variant === 'outline'
          },
          className
        )
      )}
      {...props}
    />
  );
}
