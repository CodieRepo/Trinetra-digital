import { UserRole } from "../../types/crm";

export type ActionPermission =
  | "view_leads"
  | "edit_leads"
  | "delete_leads"
  | "restore_leads"
  | "manage_tasks"
  | "view_analytics"
  | "manage_settings"
  | "manage_prompts"
  | "view_audit_logs"
  | "manage_team";

const ROLE_PERMISSIONS: Record<UserRole, ActionPermission[]> = {
  owner: [
    "view_leads", "edit_leads", "delete_leads", "restore_leads",
    "manage_tasks", "view_analytics", "manage_settings",
    "manage_prompts", "view_audit_logs", "manage_team"
  ],
  admin: [
    "view_leads", "edit_leads", "delete_leads", "restore_leads",
    "manage_tasks", "view_analytics", "manage_settings",
    "manage_prompts", "view_audit_logs", "manage_team"
  ],
  manager: [
    "view_leads", "edit_leads", "delete_leads",
    "manage_tasks", "view_analytics", "view_audit_logs"
  ],
  sales: [
    "view_leads", "edit_leads", "manage_tasks", "view_analytics"
  ],
  support: [
    "view_leads", "edit_leads", "manage_tasks"
  ],
  viewer: [
    "view_leads", "view_analytics"
  ]
};

export function hasPermission(role: UserRole, permission: ActionPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function validatePermissionGuard(role: UserRole, permission: ActionPermission): { allowed: boolean; error?: string } {
  if (!hasPermission(role, permission)) {
    return {
      allowed: false,
      error: `Forbidden: Role '${role}' lacks permission '${permission}'`,
    };
  }
  return { allowed: true };
}
