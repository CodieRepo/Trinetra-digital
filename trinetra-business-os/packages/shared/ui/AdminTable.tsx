"use client";

import { ReactNode } from "react";
import { cn } from "../core/loggingutils";
import { AdminCard } from "./AdminCard";

interface AdminTableProps {
  children: ReactNode;
  className?: string;
}

export function AdminTable({ children, className }: AdminTableProps) {
  return (
    <AdminCard noPadding className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    </AdminCard>
  );
}

interface AdminTableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function AdminTableHeader({
  children,
  className,
}: AdminTableHeaderProps) {
  return (
    <thead
      className={cn(
        "bg-gray-50/80 dark:bg-white/5 border-b border-gray-200/50 dark:border-white/10",
        className,
      )}
    >
      {children}
    </thead>
  );
}

interface AdminTableHeadCellProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export function AdminTableHeadCell({
  children,
  className,
  align = "left",
}: AdminTableHeadCellProps) {
  return (
    <th
      className={cn(
        "px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

interface AdminTableBodyProps {
  children: ReactNode;
  className?: string;
}

export function AdminTableBody({ children, className }: AdminTableBodyProps) {
  return (
    <tbody
      className={cn("divide-y divide-gray-100 dark:divide-white/5", className)}
    >
      {children}
    </tbody>
  );
}

interface AdminTableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AdminTableRow({
  children,
  className,
  onClick,
}: AdminTableRowProps) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-gray-50/50 dark:hover:bg-white/5",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface AdminTableCellProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export function AdminTableCell({
  children,
  className,
  align = "left",
}: AdminTableCellProps) {
  return (
    <td
      className={cn(
        "px-6 py-4 text-gray-700 dark:text-gray-300",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}
