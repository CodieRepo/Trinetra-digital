"use client";

import { ReactNode } from "react";
import { cn } from "../utils";
import { AdminCard } from "./AdminCard";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconColor?: string;
  trend?: {
    value: string;
    direction: "up" | "down";
    label?: string;
  };
  description?: string;
  loading?: boolean;
  className?: string;
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-blue-600 dark:text-blue-400",
  trend,
  description,
  loading = false,
  className,
}: AdminStatCardProps) {
  return (
    <AdminCard hover className={className}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl",
              iconColor,
            )}
          >
            {Icon}
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      ) : (
        <div className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
      )}

      {(trend || description) && !loading && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {trend && (
            <>
              <span
                className={cn(
                  "font-semibold",
                  trend.direction === "up"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {trend.direction === "up" ? "↑" : "↓"} {trend.value}
              </span>
              {trend.label && (
                <span className="text-gray-500 dark:text-gray-400">
                  {trend.label}
                </span>
              )}
            </>
          )}
          {description && !trend && (
            <span className="text-gray-500 dark:text-gray-400">
              {description}
            </span>
          )}
        </div>
      )}
    </AdminCard>
  );
}
