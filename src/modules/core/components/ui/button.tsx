import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none rounded-lg text-sm',
            {
              'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm': variant === 'default',
              'border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground': variant === 'outline',
              'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
              'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm': variant === 'destructive',
              'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
              'text-primary underline-offset-4 hover:underline p-0': variant === 'link',

              'h-9 px-4 py-2': size === 'default',
              'h-8 rounded-md px-3 text-xs': size === 'sm',
              'h-10 rounded-lg px-6 text-base': size === 'lg',
              'h-9 w-9 p-0': size === 'icon'
            },
            className
          )
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
