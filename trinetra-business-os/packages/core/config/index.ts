export interface RouteEntry {
  path: string;
  component: string;
  isPublic: boolean;
}

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  permission: string;
  group?: 'main' | 'growth' | 'verticals' | 'system';
}

export interface PermissionRule {
  role: string;
  actions: string[];
}

export interface EventListenerEntry {
  event: string;
  handler: string;
}

export interface WebhookDefinition {
  url: string;
  event: string;
}

export interface PluginContext {
  organizationId: string;
  tenantSchema?: string;
}

export interface BusinessOSPlugin {
  id: string;
  name: string;
  version: string;
  install(ctx: PluginContext): Promise<void>;
  uninstall(ctx: PluginContext): Promise<void>;
  migrate(ctx: PluginContext): Promise<void>;
  seed(ctx: PluginContext): Promise<void>;
  healthCheck(ctx: PluginContext): Promise<{ status: "healthy" | "degraded"; details?: string }>;
  registerRoutes(): RouteEntry[];
  registerNavigation(): NavItem[];
  registerPermissions(): PermissionRule[];
  registerEvents(): EventListenerEntry[];
  registerWebhooks(): WebhookDefinition[];
}

export function isFeatureEnabled(flagName: string): boolean {
  // Configured dynamically by Trinetra host application
  return true;
}

