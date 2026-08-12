import { apiRequest } from '../services/api';

let SecureStore: any;
try {
  SecureStore = require('expo-secure-store');
} catch (e) {
  const mockStorage = new Map<string, string>();
  SecureStore = {
    getItemAsync: async (key: string) => mockStorage.get(key) || null,
    setItemAsync: async (key: string, val: string) => mockStorage.set(key, val),
    deleteItemAsync: async (key: string) => mockStorage.delete(key),
  };
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes: string | null;
}

export interface TableInfo {
  id: string;
  table_number: string;
}

export interface Order {
  id: string;
  table_id: string | null;
  table_session_id: string | null;
  status: 'placed' | 'accepted' | 'preparing' | 'ready' | 'served' | 'closed' | 'cancelled';
  notes: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
  table: TableInfo | null;
  items: OrderItem[];
}

export interface StaffUser {
  staff_id?: string;
  id?: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier' | 'waiter' | 'kitchen' | 'inventory' | 'accountant';
  restaurant_id?: string;
  tenant_id?: string;
}

export interface StaffOrderStoreState {
  staff: StaffUser | null;
  token: string | null;
  orders: Order[];
  activeFilter: 'all' | 'placed' | 'accepted' | 'preparing' | 'ready';
  selectedOrder: Order | null;
  isLoading: boolean;
  isRefreshing: boolean;
  inFlightOrderIds: Record<string, boolean>;
  error: string | null;

  // Actions
  setStaffSession: (staff: StaffUser, token: string) => void;
  clearSession: () => Promise<void>;
  setActiveFilter: (filter: 'all' | 'placed' | 'accepted' | 'preparing' | 'ready') => void;
  setSelectedOrder: (order: Order | null) => void;
  fetchOrders: () => Promise<void>;
  transitionOrderStatus: (orderId: string, targetStatus: Order['status']) => Promise<{ success: boolean; message?: string }>;
}

class StaffOrderStore {
  private state: StaffOrderStoreState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = {
      staff: null,
      token: null,
      orders: [],
      activeFilter: 'all',
      selectedOrder: null,
      isLoading: false,
      isRefreshing: false,
      inFlightOrderIds: {},
      error: null,

      setStaffSession: (staff, token) => {
        this.state.staff = staff;
        this.state.token = token;
        this.notify();
      },
      clearSession: async () => {
        this.state.staff = null;
        this.state.token = null;
        this.state.orders = [];
        this.state.selectedOrder = null;
        this.state.inFlightOrderIds = {};
        await SecureStore.deleteItemAsync('staff_jwt');
        await SecureStore.deleteItemAsync('staff_info');
        this.notify();
      },
      setActiveFilter: (filter) => {
        this.state.activeFilter = filter;
        this.notify();
      },
      setSelectedOrder: (order) => {
        this.state.selectedOrder = order;
        this.notify();
      },
      fetchOrders: async () => {
        this.state.isLoading = true;
        this.state.error = null;
        this.notify();

        try {
          const data = await apiRequest('/api/staff/orders');
          if (data && Array.isArray(data.orders)) {
            this.state.orders = data.orders;
            if (data.staff) {
              this.state.staff = {
                ...this.state.staff,
                name: data.staff.name || this.state.staff?.name || 'Staff',
                role: data.staff.role || this.state.staff?.role || 'kitchen',
              };
            }
          }
        } catch (err: any) {
          console.error('[Store] Fetch orders error:', err.message);
          const msg = err.message || 'Failed to load live orders';
          this.state.error = msg;
          if (msg.includes('401') || msg.includes('Unauthorized')) {
            await this.state.clearSession();
          }
        } finally {
          this.state.isLoading = false;
          this.state.isRefreshing = false;
          this.notify();
        }
      },
      transitionOrderStatus: async (orderId, targetStatus) => {
        // Prevent duplicate in-flight submissions for the same order
        if (this.state.inFlightOrderIds[orderId]) {
          return { success: false, message: 'Transition request already in progress' };
        }

        const orderIndex = this.state.orders.findIndex((o) => o.id === orderId);
        if (orderIndex === -1) {
          return { success: false, message: 'Order not found in local store' };
        }

        const previousOrder = { ...this.state.orders[orderIndex] };

        // 1. Mark in-flight and perform instant Optimistic UI Update
        this.state.inFlightOrderIds = { ...this.state.inFlightOrderIds, [orderId]: true };
        this.state.orders[orderIndex] = {
          ...previousOrder,
          status: targetStatus,
          updated_at: new Date().toISOString(),
        };
        if (this.state.selectedOrder?.id === orderId) {
          this.state.selectedOrder = { ...this.state.orders[orderIndex] };
        }
        this.notify();

        try {
          const response = await apiRequest(`/api/staff/orders/${orderId}/status`, {
            method: 'POST',
            body: JSON.stringify({ status: targetStatus }),
          });

          if (!response || !response.success) {
            throw new Error(response?.error || 'Status transition rejected by server');
          }

          return { success: true };
        } catch (err: any) {
          const errMsg = err.message || 'Transition rejected by server';
          console.error(`[Store] Transition ${previousOrder.status} -> ${targetStatus} failed:`, errMsg);

          // 2. ROLLBACK Optimistic UI Update on failure
          this.state.orders[orderIndex] = previousOrder;
          if (this.state.selectedOrder?.id === orderId) {
            this.state.selectedOrder = previousOrder;
          }
          this.state.error = errMsg;

          // Standardized Error & Session Handling
          if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
            await this.state.clearSession();
          } else if (errMsg.includes('403') || errMsg.includes('Forbidden')) {
            // Role authorization failure -> preserve session, reconcile orders from backend
            this.state.fetchOrders();
          } else {
            // Reconcile state from backend
            this.state.fetchOrders();
          }

          return { success: false, message: errMsg };
        } finally {
          // Remove in-flight flag
          const copy = { ...this.state.inFlightOrderIds };
          delete copy[orderId];
          this.state.inFlightOrderIds = copy;
          this.notify();
        }
      },
    };
  }

  getState(): StaffOrderStoreState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const staffOrderStore = new StaffOrderStore();
