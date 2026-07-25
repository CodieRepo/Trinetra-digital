import type {
  BusinessOSPlugin,
  PluginContext,
  RouteEntry,
  NavItem,
  PermissionRule,
  EventListenerEntry,
  WebhookDefinition,
} from "../../core/config";

export type {
  BusinessOSPlugin,
  PluginContext,
  RouteEntry,
  NavItem,
  PermissionRule,
  EventListenerEntry,
  WebhookDefinition,
};

export const RestaurantOSPlugin: BusinessOSPlugin = {
  id: "restaurant-os",
  name: "Restaurant OS",
  version: "1.0.0",

  async install(ctx: PluginContext): Promise<void> {
    console.log(`[Trinetra Core] Installing Restaurant OS module for Tenant: ${ctx.organizationId}`);
  },

  async uninstall(ctx: PluginContext): Promise<void> {
    console.log(`[Trinetra Core] Uninstalling Restaurant OS module for Tenant: ${ctx.organizationId}`);
  },

  async migrate(ctx: PluginContext): Promise<void> {
    console.log(`[Trinetra Core] Running Restaurant OS schema migrations for Tenant: ${ctx.organizationId}`);
  },

  async seed(ctx: PluginContext): Promise<void> {
    console.log(`[Trinetra Core] Seeding default menu and tables for Tenant: ${ctx.organizationId}`);
  },

  async healthCheck(_ctx: PluginContext): Promise<{ status: "healthy" | "degraded"; details?: string }> {
    return { status: "healthy" };
  },

  registerRoutes(): RouteEntry[] {
    return [
      { path: "/admin/restaurant", component: "RestaurantDashboard", isPublic: false },
      { path: "/r/:tableToken", component: "PublicRestaurantMenu", isPublic: true },
      { path: "/r/:tableToken/order/:orderId", component: "OrderStatus", isPublic: true },
      { path: "/staff/ops", component: "StaffOpsPanel", isPublic: false },
    ];
  },

  registerNavigation(): NavItem[] {
    return [
      {
        label: "Restaurant OS",
        icon: "UtensilsCrossed",
        path: "/admin?view=restaurant-os",
        permission: "restaurant:view",
        group: "verticals",
      },
    ];
  },

  registerPermissions(): PermissionRule[] {
    return [
      { role: "owner", actions: ["menu:manage", "tables:manage", "sessions:close", "billing:settle"] },
      { role: "admin", actions: ["menu:manage", "tables:manage", "sessions:close"] },
      { role: "kitchen", actions: ["orders:prepare", "orders:ready"] },
      { role: "waiter", actions: ["orders:serve", "sessions:view", "sessions:close"] },
    ];
  },

  registerEvents(): EventListenerEntry[] {
    return [
      { event: "OrderPlaced", handler: "onOrderPlaced" },
      { event: "OrderReady", handler: "onOrderReady" },
      { event: "PaymentCompleted", handler: "onPaymentCompleted" },
      { event: "CustomerRegistered", handler: "onCustomerRegistered" },
    ];
  },

  registerWebhooks(): WebhookDefinition[] {
    return [];
  },
};
