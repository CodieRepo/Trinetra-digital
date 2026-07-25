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

export interface MigrationConfig {
  version: string;
  file: string;
}

export interface PluginContext {
  organizationId: string;
  tenantSchema: string;
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

export const RestaurantOSPlugin: BusinessOSPlugin = {
  id: "restaurant-os",
  name: "Restaurant OS",
  version: "1.0.0",

  async install(ctx: PluginContext) {
    console.log(`Installing Restaurant OS for Tenant: ${ctx.organizationId}`);
  },

  async uninstall(ctx: PluginContext) {
    console.log(`Uninstalling Restaurant OS for Tenant: ${ctx.organizationId}`);
  },

  async migrate(ctx: PluginContext) {
    console.log(`Running Restaurant OS migrations for Schema: ${ctx.tenantSchema}`);
  },

  async seed(ctx: PluginContext) {
    console.log(`Seeding baseline restaurant parameters for Tenant: ${ctx.organizationId}`);
  },

  async healthCheck(ctx: PluginContext) {
    return { status: "healthy" };
  },

  registerRoutes() {
    return [
      { path: "/restaurant/dashboard", component: "RestaurantDashboard", isPublic: false },
      { path: "/restaurant/menu", component: "MenuManager", isPublic: false },
      { path: "/restaurant/orders", component: "StaffOrdersPanel", isPublic: false },
      { path: "/r/:tableToken", component: "PublicRestaurantMenu", isPublic: true },
      { path: "/r/:tableToken/order/:orderId", component: "OrderStatus", isPublic: true }
    ];
  },

  registerNavigation() {
    return [
      {
        label: "Restaurant OS",
        icon: "UtensilsCrossed",
        path: "/restaurant/dashboard",
        permission: "restaurant:view"
      }
    ];
  },

  registerPermissions() {
    return [
      { role: "owner", actions: ["menu:create", "menu:delete", "tables:create", "billing:settle"] },
      { role: "kitchen", actions: ["orders:prepare", "orders:ready"] },
      { role: "waiter", actions: ["orders:serve", "sessions:view"] }
    ];
  },

  registerEvents() {
    return [
      { event: "OrderPlaced", handler: "onOrderPlaced" },
      { event: "OrderReady", handler: "onOrderReady" },
      { event: "PaymentCompleted", handler: "onPaymentCompleted" }
    ];
  },

  registerWebhooks() {
    return [];
  }
};
