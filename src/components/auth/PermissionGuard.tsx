/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Component: PermissionGuard
 * Description: Declarative permission wrapper evaluating active staff RBAC role or
 *              manager elevation against allowed roles.
 */

'use client';

import React, { ReactNode } from 'react';
import { useTerminalContext } from '../../context/TerminalContext';
import { StaffRole } from '../../types/auth';

export interface PermissionGuardProps {
  allowedRoles: StaffRole[];
  requireManagerElevation?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  allowedRoles,
  requireManagerElevation = false,
  children,
  fallback,
}) => {
  const { staff, managerElevation } = useTerminalContext();

  if (!staff) {
    return (
      fallback || (
        <div className="p-4 text-center rounded-lg bg-red-950/40 border border-red-800 text-red-300">
          <p className="font-semibold text-sm">Authentication Required</p>
          <p className="text-xs text-red-400 mt-1">Please log in with your staff PIN to access this feature.</p>
        </div>
      )
    );
  }

  // Active role can be staff's role or elevated manager role
  const effectiveRole = managerElevation.isElevated ? 'manager' : staff.role;
  const isAllowed = allowedRoles.includes(effectiveRole as StaffRole) || staff.role === 'owner';

  if (requireManagerElevation && !managerElevation.isElevated && staff.role !== 'owner') {
    return (
      fallback || (
        <div className="p-4 text-center rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300">
          <p className="font-semibold text-sm">Manager Elevation Required</p>
          <p className="text-xs text-amber-400 mt-1">This operation requires a Manager or Owner PIN override.</p>
        </div>
      )
    );
  }

  if (!isAllowed) {
    return (
      fallback || (
        <div className="p-4 text-center rounded-lg bg-red-950/40 border border-red-800 text-red-300">
          <p className="font-semibold text-sm">Access Restricted</p>
          <p className="text-xs text-red-400 mt-1">Your role ({staff.role}) does not have permission for this action.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
};
