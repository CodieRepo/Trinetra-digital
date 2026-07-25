"use client";

import { ReactNode } from "react";
import { cn } from "../core/loggingutils";

interface AdminCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  noPadding?: boolean;
}

export function AdminCard({
  children,
  className,
  hover = false,
  noPadding = false,
}: AdminCardProps) {
  return (
    <div
      className={cn(
        "bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-white/10 shadow-sm",
        hover &&
          "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-white/20",
        !noPadding && "p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
