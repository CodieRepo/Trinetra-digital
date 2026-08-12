import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { staffOrderStore } from '../store/useStaffOrderStore';

export class MobileRealtimeService {
  private client: SupabaseClient | null = null;
  private ordersChannel: RealtimeChannel | null = null;
  private sessionsChannel: RealtimeChannel | null = null;
  private activeTenantId: string | null = null;
  private activeRestaurantId: string | null = null;

  /**
   * Initializes Supabase Realtime client and subscribes to tenant-scoped channels
   */
  public initialize(supabaseUrl: string, anonKey: string, tenantId: string, restaurantId: string): void {
    if (!tenantId || !restaurantId) {
      console.warn('[Realtime] Cannot subscribe without tenant_id and restaurant_id.');
      return;
    }

    // If already subscribed to the same tenant/restaurant, skip re-initialization
    if (this.activeTenantId === tenantId && this.activeRestaurantId === restaurantId && this.ordersChannel) {
      return;
    }

    // Clean up existing channels before establishing new tenant context
    this.unsubscribeAll();

    this.activeTenantId = tenantId;
    this.activeRestaurantId = restaurantId;

    this.client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { heartbeatIntervalMs: 15000 },
    });

    this.subscribeOrders(tenantId, restaurantId);
    this.subscribeSessions(tenantId, restaurantId);
  }

  /**
   * Subscribe to restaurant_orders table changes strictly scoped to tenant_id & restaurant_id
   */
  private subscribeOrders(tenantId: string, restaurantId: string): void {
    if (!this.client) return;

    const channelName = `realtime:orders:${tenantId}:${restaurantId}`;
    this.ordersChannel = this.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          this.handleOrderChange(payload, tenantId, restaurantId);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Orders channel (${channelName}) status:`, status);
        if (status === 'SUBSCRIBED') {
          // Reconcile state from REST backend on fresh connection
          staffOrderStore.getState().fetchOrders();
        }
      });
  }

  /**
   * Subscribe to restaurant_table_sessions table changes
   */
  private subscribeSessions(tenantId: string, restaurantId: string): void {
    if (!this.client) return;

    const channelName = `realtime:sessions:${tenantId}:${restaurantId}`;
    this.sessionsChannel = this.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_table_sessions',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          this.handleSessionChange(payload, tenantId, restaurantId);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Sessions channel (${channelName}) status:`, status);
      });
  }

  /**
   * Handle incoming order change event with strict freshness & multi-tenant checks
   */
  public handleOrderChange(payload: any, tenantId: string, restaurantId: string): void {
    const eventType = payload.eventType;
    const newRecord = payload.new;
    const oldRecord = payload.old;

    // Strict multi-tenant security verification
    if (newRecord && (newRecord.tenant_id !== tenantId || newRecord.restaurant_id !== restaurantId)) {
      console.warn('[Realtime] Blocked cross-tenant order payload:', newRecord.tenant_id);
      return;
    }

    const store = staffOrderStore.getState();
    const currentOrders = [...store.orders];

    if (eventType === 'INSERT') {
      // Check for duplicate insert
      const exists = currentOrders.some((o) => o.id === newRecord.id);
      if (!exists) {
        // Fetch full hydrated order or refresh from backend
        store.fetchOrders();
      }
    } else if (eventType === 'UPDATE') {
      const index = currentOrders.findIndex((o) => o.id === newRecord.id);
      if (index !== -1) {
        const existing = currentOrders[index];

        // Freshness check: Ignore stale event if existing updated_at is newer
        const existingTime = new Date(existing.updated_at).getTime();
        const incomingTime = new Date(newRecord.updated_at || Date.now()).getTime();

        if (incomingTime >= existingTime) {
          currentOrders[index] = {
            ...existing,
            status: newRecord.status,
            updated_at: newRecord.updated_at || new Date().toISOString(),
          };
          // Re-hydrate store
          staffOrderStore.getState().fetchOrders();
        }
      } else {
        // Order not in local list, refresh
        store.fetchOrders();
      }
    } else if (eventType === 'DELETE') {
      if (oldRecord && oldRecord.id) {
        store.fetchOrders();
      }
    }
  }

  /**
   * Handle incoming session change event
   */
  public handleSessionChange(payload: any, tenantId: string, restaurantId: string): void {
    const newRecord = payload.new;
    if (newRecord && (newRecord.tenant_id !== tenantId || newRecord.restaurant_id !== restaurantId)) {
      console.warn('[Realtime] Blocked cross-tenant session payload:', newRecord.tenant_id);
      return;
    }
    // Re-fetch sessions on status or payment change
    // Handled by active UI component listeners
  }

  /**
   * Unsubscribes and cleans up all active channels and client instance
   */
  public unsubscribeAll(): void {
    if (this.ordersChannel && this.client) {
      this.client.removeChannel(this.ordersChannel);
      this.ordersChannel = null;
    }
    if (this.sessionsChannel && this.client) {
      this.client.removeChannel(this.sessionsChannel);
      this.sessionsChannel = null;
    }
    this.client = null;
    this.activeTenantId = null;
    this.activeRestaurantId = null;
    console.log('[Realtime] Unsubscribed all channels and cleared listeners.');
  }
}

export const mobileRealtimeService = new MobileRealtimeService();
