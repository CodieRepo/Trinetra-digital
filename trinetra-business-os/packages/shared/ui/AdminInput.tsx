"use client";

import { InputHTMLAttributes, ReactNode, forwardRef } from "react";
import { cn } from "../core/loggingutils";

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(
  (
    { label, error, helper, icon, fullWidth = false, className, ...props },
    ref,
  ) => {
    return (
      <div className={cn("space-y-2", fullWidth && "w-full")}>
        {label && (
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full px-4 py-2.5 rounded-xl border transition-all duration-200",
              "text-gray-900 dark:text-white placeholder:text-gray-400",
              "bg-white dark:bg-gray-900",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              error
                ? "border-red-300 dark:border-red-700"
                : "border-gray-300 dark:border-gray-600",
              icon && "pl-10",
              className,
            )}
            {...props}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {helper && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helper}</p>
        )}
      </div>
    );
  },
);

AdminInput.displayName = "AdminInput";
