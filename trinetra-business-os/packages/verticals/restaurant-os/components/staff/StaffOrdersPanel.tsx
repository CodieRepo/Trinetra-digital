import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  X, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Receipt,
  Clock,
  User,
  ArrowRight
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Floor = {
  id: string;
  name: string;
  display_order?: number;
};

export type RestaurantTable = {
  id: string;
  table_number: string;
  floor_id: string | null;
  status: string;
  is_active: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  display_order?: number;
};

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  is_veg: boolean;
  is_available: boolean;
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  is_veg: boolean;
  quantity: number;
  notes: string;
};

type StaffOrder = {
  id: string;
  status: string;
  notes: string | null;
  total_amount: number;
  created_at: string;
  order_source?: string | null;
  created_by_staff_id?: string | null;
  staff_name?: string | null;
  table: {
    id: string;
    table_number: string;
    floor_id?: string | null;
    floor_name?: string | null;
  } | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price?: number;
    notes: string | null;
  }>;
};

type StaffPayload = {
  staff: {
    name: string;
    role: "kitchen" | "waiter";
  };
  orders: StaffOrder[];
};

type SessionOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    notes: string | null;
  }>;
};

type TableSession = {
  id: string;
  table_id?: string;
  table: { 
    id: string; 
    table_number: string;
    floor_id?: string | null;
    floor_name?: string | null;
  } | null;
  status: string;
  opened_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  payment_status: string;
  paid_at: string | null;
  order_count: number;
  session_total: number;
  all_orders_terminal: boolean;
  orders: SessionOrder[];
};

type SessionsPayload = {
  sessions: TableSession[];
};

// ---------------------------------------------------------------------------
// Constants & Semantic Helpers (Warm Hospitality Theme)
// ---------------------------------------------------------------------------

const ACTIONS: Record<
  "kitchen" | "waiter",
  Record<string, Array<{ label: string; status: string }>>
> = {
  kitchen: {
    placed: [
      { label: "Accept Ticket", status: "accepted" },
      { label: "Cancel", status: "cancelled" },
    ],
    accepted: [
      { label: "Start Preparing", status: "preparing" },
      { label: "Cancel", status: "cancelled" },
    ],
    preparing: [
      { label: "Mark Ready", status: "ready" },
      { label: "Cancel", status: "cancelled" },
    ],
    ready: [],
  },
  waiter: {
    ready: [{ label: "Mark Served", status: "served" }],
    served: [{ label: "Close Order", status: "closed" }],
  },
};

const STATUS_BADGE: Record<string, string> = {
  placed: "bg-amber-50 text-amber-900 border-amber-200",
  accepted: "bg-sky-50 text-sky-900 border-sky-200",
  preparing: "bg-indigo-50 text-indigo-900 border-indigo-200",
  ready: "bg-teal-50 text-teal-900 border-teal-200",
  served: "bg-emerald-50 text-emerald-900 border-emerald-200",
  closed: "bg-stone-100 text-stone-700 border-stone-300",
  cancelled: "bg-rose-50 text-rose-900 border-rose-200",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function timeAgo(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function dwellMinutes(isoString: string) {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
}

function getDwellTier(isoString: string): "normal" | "warning" | "urgent" {
  const mins = dwellMinutes(isoString);
  if (mins >= 20) return "urgent";
  if (mins >= 10) return "warning";
  return "normal";
}

function getInFlightLabel(actionStatus: string) {
  if (actionStatus === "accepted") return "Accepting…";
  if (actionStatus === "preparing") return "Starting…";
  if (actionStatus === "ready") return "Marking Ready…";
  if (actionStatus === "served") return "Serving…";
  if (actionStatus === "closed") return "Closing…";
  if (actionStatus === "cancelled") return "Cancelling…";
  return "Updating…";
}

function classifyStaffApiError(status?: number, rawError?: string, errorObj?: any): {
  is401: boolean;
  message: string;
} {
  if (
    status === 401 ||
    rawError?.toLowerCase().includes("unauthorized") ||
    rawError?.toLowerCase().includes("invalid or expired staff token")
  ) {
    return { is401: true, message: "Session expired. Please sign in again." };
  }
  if (
    status === 403 ||
    rawError?.toLowerCase().includes("forbidden") ||
    rawError?.toLowerCase().includes("not have permission") ||
    rawError?.toLowerCase().includes("cannot transition")
  ) {
    return { is401: false, message: rawError || "You are not authorized for this restaurant or action." };
  }
  if (status && status >= 500) {
    return { is401: false, message: "Restaurant service temporarily unavailable." };
  }
  if (errorObj instanceof TypeError || (typeof window !== "undefined" && !window.navigator?.onLine)) {
    return { is401: false, message: "Network connection lost. Retrying..." };
  }
  return { is401: false, message: rawError || errorObj?.message || "An unexpected error occurred." };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaffOrdersPanel({
  restaurantId,
  role,
  token,
  restaurantName,
  onUnauthorized,
}: {
  restaurantId: string;
  role: "kitchen" | "waiter";
  token?: string;
  restaurantName?: string;
  onUnauthorized?: (message?: string) => void;
}) {
  const effectiveToken =
    token ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("trinetra_staff_token") ||
        new URLSearchParams(window.location.search).get("token") ||
        ""
      : "");

  // Waiter Tabs: 'tables' (Floor/Table Map) | 'orders' (Live Orders) | 'sessions' (Billing)
  // Kitchen Tabs: 'orders' (Live Kitchen Queue)
  const [activeTab, setActiveTab] = useState<"tables" | "orders" | "sessions">(
    role === "waiter" ? "tables" : "orders"
  );

  // --- Floor / Table Discovery State ---
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>("all");
  const [loadingStructure, setLoadingStructure] = useState(false);

  // --- Menu State (for Take Order) ---
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // --- Live Orders State ---
  const [payload, setPayload] = useState<StaffPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set());
  const [kitchenStatusFilter, setKitchenStatusFilter] = useState<"all" | "placed" | "accepted" | "preparing" | "ready" | "urgent">("all");

  // Centralized 401 state eviction callback
  const handleAuthEviction = useCallback((msg?: string) => {
    setPayload(null);
    setSessionsPayload(null);
    setFloors([]);
    setTables([]);
    setMenuItems([]);
    setCategories([]);
    setError(msg || "Session expired. Please sign in again.");
    onUnauthorized?.(msg || "Session expired. Please enter your PIN.");
  }, [onUnauthorized]);

  const { totalActiveCount, placedCount, acceptedCount, preparingCount, readyCount, urgentCount } = useMemo(() => {
    const orders = payload?.orders ?? [];
    let placed = 0;
    let accepted = 0;
    let preparing = 0;
    let ready = 0;
    let urgent = 0;
    orders.forEach((o) => {
      if (o.status === "placed") placed++;
      if (o.status === "accepted") accepted++;
      if (o.status === "preparing") preparing++;
      if (o.status === "ready") ready++;
      if (getDwellTier(o.created_at) === "urgent" && o.status !== "ready") urgent++;
    });
    return {
      totalActiveCount: orders.length,
      placedCount: placed,
      acceptedCount: accepted,
      preparingCount: preparing,
      readyCount: ready,
      urgentCount: urgent,
    };
  }, [payload?.orders]);

  const visibleOrders = useMemo(() => {
    const orders = payload?.orders ?? [];
    if (role !== "kitchen" || kitchenStatusFilter === "all") return orders;
    if (kitchenStatusFilter === "urgent") {
      return orders.filter((o) => getDwellTier(o.created_at) === "urgent" && o.status !== "ready");
    }
    return orders.filter((o) => o.status === kitchenStatusFilter);
  }, [payload?.orders, role, kitchenStatusFilter]);

  // --- Sessions State ---
  const [sessionsPayload, setSessionsPayload] = useState<SessionsPayload | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [staffPaymentMethods, setStaffPaymentMethods] = useState<Record<string, string>>({});
  const [staffSettlingId, setStaffSettlingId] = useState<string | null>(null);

  // --- Take Order Modal State ---
  const [isTakeOrderOpen, setIsTakeOrderOpen] = useState(false);
  const [orderTargetTable, setOrderTargetTable] = useState<RestaurantTable | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderToast, setOrderToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showMobileCartDrawer, setShowMobileCartDrawer] = useState(false);

  // --- Load Floors & Tables ---
  const loadFloorsAndTables = useCallback(async () => {
    if (!effectiveToken) return;
    try {
      setLoadingStructure(true);
      const headers = { Authorization: `Bearer ${effectiveToken}` };
      const [floorsRes, tablesRes] = await Promise.all([
        fetch("/api/client/restaurant/floors", { headers, cache: "no-store" }),
        fetch("/api/client/restaurant/tables", { headers, cache: "no-store" }),
      ]);

      if (floorsRes.status === 401 || tablesRes.status === 401) {
        handleAuthEviction();
        return;
      }

      if (floorsRes.ok) {
        const fData = await floorsRes.json();
        setFloors(Array.isArray(fData.floors) ? fData.floors : []);
      }
      if (tablesRes.ok) {
        const tData = await tablesRes.json();
        setTables(Array.isArray(tData.tables) ? tData.tables : []);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoadingStructure(false);
    }
  }, [effectiveToken, handleAuthEviction]);

  // --- Load Menu ---
  const loadMenu = useCallback(async () => {
    if (!effectiveToken) return;
    try {
      setLoadingMenu(true);
      const headers = { Authorization: `Bearer ${effectiveToken}` };
      const res = await fetch("/api/client/restaurant/menu", { headers, cache: "no-store" });
      if (res.status === 401) {
        handleAuthEviction();
        return;
      }
      if (res.ok) {
        const mData = await res.json();
        setCategories(Array.isArray(mData.categories) ? mData.categories : []);
        setMenuItems(Array.isArray(mData.items) ? mData.items : []);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoadingMenu(false);
    }
  }, [effectiveToken, handleAuthEviction]);

  // --- Load Orders ---
  const loadOrders = useCallback(async () => {
    if (!effectiveToken) return;
    try {
      const endpoint = restaurantId
        ? `/api/staff/orders?restaurant_id=${encodeURIComponent(restaurantId)}`
        : `/api/staff/orders`;
      const res = await fetch(endpoint, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        handleAuthEviction();
        return;
      }
      if (!res.ok) {
        const classified = classifyStaffApiError(res.status, data.error);
        if (classified.is401) {
          handleAuthEviction(classified.message);
          return;
        }
        throw new Error(classified.message);
      }
      setPayload(data as StaffPayload);
      setError(null);
    } catch (err: any) {
      const classified = classifyStaffApiError(undefined, undefined, err);
      if (classified.is401) {
        handleAuthEviction(classified.message);
      } else {
        setError(classified.message);
      }
    } finally {
      setLoadingOrders(false);
    }
  }, [restaurantId, effectiveToken, handleAuthEviction]);

  // --- Load Sessions ---
  const loadSessions = useCallback(async () => {
    if (!effectiveToken) return;
    try {
      setSessionsLoading(true);
      const endpoint = restaurantId
        ? `/api/staff/sessions?restaurant_id=${encodeURIComponent(restaurantId)}`
        : `/api/staff/sessions`;
      const res = await fetch(endpoint, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        handleAuthEviction();
        return;
      }
      if (!res.ok) {
        const classified = classifyStaffApiError(res.status, data.error);
        if (classified.is401) {
          handleAuthEviction(classified.message);
          return;
        }
        throw new Error(classified.message);
      }
      setSessionsPayload(data as SessionsPayload);
      setSessionsError(null);
    } catch (err: any) {
      const classified = classifyStaffApiError(undefined, undefined, err);
      if (classified.is401) {
        handleAuthEviction(classified.message);
      } else {
        setSessionsError(classified.message);
      }
    } finally {
      setSessionsLoading(false);
    }
  }, [restaurantId, effectiveToken, handleAuthEviction]);

  // --- Initial, Realtime WebSocket & Polling Lifecycle ---
  useEffect(() => {
    if (!effectiveToken) {
      setError("Missing access token. Please access using a valid staff link or sign in.");
      setLoadingOrders(false);
      return;
    }

    void loadOrders();
    if (role === "waiter") {
      void loadFloorsAndTables();
      void loadMenu();
      void loadSessions();
    }

    // Continuous Live Sync Polling Engine (Every 4s for zero-console-error live operations)
    const interval = window.setInterval(() => {
      void loadOrders();
      if (role === "waiter") {
        void loadSessions();
        void loadFloorsAndTables();
      }
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [restaurantId, role, effectiveToken, loadOrders, loadSessions, loadFloorsAndTables, loadMenu]);

  // --- Update Order Status ---
  async function updateStatus(orderId: string, status: string) {
    // Duplicate-action guard: prevent rapid repeated taps
    if (updatingOrderIds.has(orderId)) return;
    try {
      setUpdatingOrderIds((prev) => new Set(prev).add(orderId));
      const res = await fetch(`/api/staff/orders/${orderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({ status, restaurant_id: restaurantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        handleAuthEviction();
        return;
      }
      if (!res.ok) {
        const classified = classifyStaffApiError(res.status, data.error);
        if (classified.is401) {
          handleAuthEviction(classified.message);
          return;
        }
        throw new Error(classified.message);
      }

      setError(null);
      await loadOrders();
      if (role === "waiter") await loadSessions();
    } catch (updateError: any) {
      const classified = classifyStaffApiError(undefined, undefined, updateError);
      if (classified.is401) {
        handleAuthEviction(classified.message);
      } else {
        setError(classified.message);
      }
    } finally {
      setUpdatingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  // --- Floor Map Lookup ---
  const floorNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of floors) {
      map.set(f.id, f.name);
    }
    return map;
  }, [floors]);

  // --- Active Session Lookup by Table ID ---
  const activeSessionByTableId = useMemo(() => {
    const map = new Map<string, TableSession>();
    for (const s of sessionsPayload?.sessions || []) {
      const tid = s.table?.id || (s as any).table_id;
      if (tid && s.status === "active") {
        map.set(tid, s);
      }
    }
    return map;
  }, [sessionsPayload]);

  // --- Filtered Tables by Floor (Canonical floor_id check) ---
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (selectedFloorId === "all") return true;
      if (selectedFloorId === "unassigned") return !t.floor_id;
      return t.floor_id === selectedFloorId;
    });
  }, [tables, selectedFloorId]);

  // --- Filtered Menu Items ---
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategoryId === "all" || item.category_id === selectedCategoryId;
      const matchesSearch =
        !menuSearchQuery ||
        item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(menuSearchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategoryId, menuSearchQuery]);

  // --- Cart Calculations ---
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartTotalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // --- Cart Handlers ---
  function handleAddToCart(item: MenuItem) {
    if (!item.is_available) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          is_veg: item.is_veg,
          quantity: 1,
          notes: "",
        },
      ];
    });
  }

  function handleUpdateQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function handleUpdateItemNotes(itemId: string, notes: string) {
    setCart((prev) => prev.map((i) => (i.id === itemId ? { ...i, notes } : i)));
  }

  function handleRemoveItem(itemId: string) {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  }

  // --- Open Take Order Modal for Table ---
  function openTakeOrderForTable(table: RestaurantTable) {
    setOrderTargetTable(table);
    setCart([]);
    setOrderNotes("");
    setSelectedCategoryId("all");
    setMenuSearchQuery("");
    setOrderToast(null);
    setShowMobileCartDrawer(false);
    setIsTakeOrderOpen(true);
  }

  // --- Submit Order ---
  async function handleSubmitOrder() {
    if (!orderTargetTable || cart.length === 0 || isSubmittingOrder) return;

    try {
      setIsSubmittingOrder(true);
      setOrderToast(null);

      const payload = {
        table_id: orderTargetTable.id,
        notes: orderNotes.trim() || undefined,
        items: cart.map((i) => ({
          item_id: i.id,
          quantity: i.quantity,
          notes: i.notes.trim() || undefined,
        })),
      };

      const res = await fetch("/api/staff/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        handleAuthEviction();
        return;
      }
      if (!res.ok) {
        const classified = classifyStaffApiError(res.status, data.error);
        if (classified.is401) {
          handleAuthEviction(classified.message);
          return;
        }
        throw new Error(classified.message);
      }

      setOrderToast({
        message: `Order confirmed for Table ${orderTargetTable.table_number}! (${cartTotalItems} items • ${formatCurrency(cartSubtotal)})`,
        type: "success",
      });

      // Clear cart and close modal after brief confirmation feedback
      setTimeout(() => {
        setCart([]);
        setOrderNotes("");
        setIsTakeOrderOpen(false);
        setOrderToast(null);
        setShowMobileCartDrawer(false);
        void loadOrders();
        void loadSessions();
        setActiveTab("orders");
      }, 1200);
    } catch (e: any) {
      const classified = classifyStaffApiError(undefined, undefined, e);
      if (classified.is401) {
        handleAuthEviction(classified.message);
      } else {
        setOrderToast({
          message: classified.message || "Failed to place order. Please retry.",
          type: "error",
        });
      }
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render (Warm Hospitality Design System)
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      
      {/* Top Operational Summary Card */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {restaurantName && (
              <span className="text-xs font-black uppercase tracking-wider text-stone-900 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full">
                {restaurantName}
              </span>
            )}
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              {role === "kitchen" ? "Kitchen Station" : "Waiter Operations"}
            </span>
            <span className="text-xs font-semibold text-stone-500">
              {payload?.staff?.name ? `Staff: ${payload.staff.name}` : "Verified Staff Session"}
            </span>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {role === "kitchen" ? "Kitchen Dispatch Board" : "Dining Tables & Floors"}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 font-medium">
            {role === "kitchen"
              ? "Real-time kitchen orders stream and preparation lifecycle."
              : "Select a dining floor and tap any table to begin tableside ordering."}
          </p>
        </div>

        {/* Quick Operational Metrics */}
        {role === "waiter" && (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 px-3.5 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Tables</p>
              <p className="text-lg sm:text-xl font-black text-stone-900 mt-0.5">{tables.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Occupied</p>
              <p className="text-lg sm:text-xl font-black text-amber-900 mt-0.5">{sessionsPayload?.sessions?.length || 0}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Live Orders</p>
              <p className="text-lg sm:text-xl font-black text-emerald-900 mt-0.5">{payload?.orders?.length || 0}</p>
            </div>
          </div>
        )}
      </div>

      {/* Waiter Navigation Tabs (Tablet-friendly 44px+ touch targets) */}
      {role === "waiter" && (
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("tables")}
            className={`min-h-[46px] rounded-2xl px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "tables"
                ? "bg-amber-500 text-stone-950 shadow-sm border border-amber-400"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            <Layers size={16} />
            <span>Floors & Tables</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              activeTab === "tables" ? "bg-amber-600/30 text-stone-950" : "bg-stone-100 text-stone-600"
            }`}>
              {tables.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`min-h-[46px] rounded-2xl px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "orders"
                ? "bg-amber-500 text-stone-950 shadow-sm border border-amber-400"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            <UtensilsCrossed size={16} />
            <span>Live Orders</span>
            {payload?.orders && payload.orders.length > 0 && (
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                activeTab === "orders" ? "bg-amber-600/30 text-stone-950" : "bg-amber-100 text-amber-900"
              }`}>
                {payload.orders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`min-h-[46px] rounded-2xl px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "sessions"
                ? "bg-amber-500 text-stone-950 shadow-sm border border-amber-400"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            <Receipt size={16} />
            <span>Active Bills & Settlement</span>
            {sessionsPayload?.sessions && sessionsPayload.sessions.length > 0 && (
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                activeTab === "sessions" ? "bg-amber-600/30 text-stone-950" : "bg-emerald-100 text-emerald-900"
              }`}>
                {sessionsPayload.sessions.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Global Error Banner (Only for non-orders tab to avoid duplicate) */}
      {error && activeTab !== "orders" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 flex items-center gap-3 shadow-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: FLOORS & TABLES MAP (Waiter Primary Operational Workspace)  */}
      {/* =================================================================== */}
      {activeTab === "tables" && role === "waiter" && (
        <div className="space-y-6">
          
          {/* Floor Selection Bar (Canonical floor_id filtering) */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-stone-500 mr-1 flex items-center gap-1.5">
              <Layers size={14} className="text-amber-600" />
              Floor:
            </span>
            <button
              type="button"
              onClick={() => setSelectedFloorId("all")}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                selectedFloorId === "all"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              All Tables ({tables.length})
            </button>

            {floors.map((floor) => {
              const count = tables.filter((t) => t.floor_id === floor.id).length;
              return (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => setSelectedFloorId(floor.id)}
                  className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    selectedFloorId === floor.id
                      ? "bg-stone-900 text-white shadow-sm"
                      : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                  }`}
                >
                  {floor.name} ({count})
                </button>
              );
            })}

            {tables.some((t) => !t.floor_id) && (
              <button
                type="button"
                onClick={() => setSelectedFloorId("unassigned")}
                className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  selectedFloorId === "unassigned"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                Unassigned ({tables.filter((t) => !t.floor_id).length})
              </button>
            )}
          </div>

          {/* Tables Grid */}
          {loadingStructure && tables.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-stone-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Loading dining tables...</p>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500 shadow-sm">
              <UtensilsCrossed size={36} className="mx-auto mb-3 text-stone-400" />
              <p className="text-base font-extrabold text-stone-800">No tables on this floor</p>
              <p className="text-xs text-stone-500 mt-1">Select another floor or configure tables in Admin Settings.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTables.map((table) => {
                const activeSession = activeSessionByTableId.get(table.id);
                const isOccupied = Boolean(activeSession);
                const floorName = table.floor_id ? floorNameMap.get(table.floor_id) || "Floor" : "Unassigned";

                return (
                  <div
                    key={table.id}
                    className={`rounded-3xl border p-5 transition-all shadow-sm flex flex-col justify-between ${
                      isOccupied
                        ? "border-amber-300 bg-amber-50/30"
                        : "border-stone-200/90 bg-white hover:border-stone-300"
                    }`}
                  >
                    <div>
                      {/* Card Header: Table # & Floor */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                            {floorName}
                          </span>
                          <h3 className="text-3xl font-black text-stone-900 tracking-tight mt-0.5">
                            {table.table_number}
                          </h3>
                        </div>
                        <span
                          className={`rounded-xl border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                            isOccupied
                              ? "border-amber-200 bg-amber-100/90 text-amber-900"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {isOccupied ? "Occupied" : "Available"}
                        </span>
                      </div>

                      {/* Seated Session Details */}
                      {isOccupied && activeSession ? (
                        <div className="mt-4 rounded-2xl border border-stone-200/80 bg-white p-3.5 space-y-2 shadow-xs">
                          {activeSession.customer_name && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 truncate">
                              <User size={13} className="text-stone-400 shrink-0" />
                              <span className="truncate">{activeSession.customer_name}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500 font-medium">Orders: {activeSession.order_count}</span>
                            <span className="font-black text-amber-900 text-sm">
                              {formatCurrency(activeSession.session_total)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1.5 border-t border-stone-100 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="text-stone-400" />
                              {timeAgo(activeSession.opened_at)}
                            </span>
                            <span className={activeSession.payment_status === "paid" ? "text-emerald-700 font-bold" : "text-amber-800 font-bold"}>
                              {activeSession.payment_status === "paid" ? "Paid ✓" : "Unpaid"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-3.5 text-center text-xs text-stone-500">
                          Ready for guests
                        </div>
                      )}
                    </div>

                    {/* Primary Action Button (48px Touch Target) */}
                    <div className="mt-5 space-y-2">
                      <button
                        type="button"
                        onClick={() => openTakeOrderForTable(table)}
                        className="h-12 w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Plus size={16} />
                        <span>Take Order</span>
                      </button>

                      {isOccupied && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab("orders")}
                            className="min-h-[40px] rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-[11px] font-bold text-stone-700 transition cursor-pointer text-center"
                          >
                            Orders
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("sessions")}
                            className="min-h-[40px] rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-[11px] font-bold text-stone-700 transition cursor-pointer text-center"
                          >
                            Bill
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: LIVE ORDERS QUEUE (Warm Hospitality Kitchen KDS)            */}
      {/* =================================================================== */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {/* Error State Banner */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs sm:text-sm text-rose-900 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <p className="font-bold truncate">{error || "Couldn't refresh kitchen orders."}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider shrink-0 transition cursor-pointer shadow-xs active:scale-95"
              >
                Retry
              </button>
            </div>
          )}

          {/* Kitchen Operational Summary & Status Filter Chips */}
          {role === "kitchen" && (
            <div className="space-y-4">
              {/* Staff Station Status Sub-Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-stone-200/90 rounded-2xl px-4 py-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-950 flex items-center justify-center font-black text-xs shrink-0">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-stone-900 truncate">
                      {payload?.staff?.name ? `${payload.staff.name} • Kitchen Staff` : "Kitchen Station Active"}
                    </p>
                    <p className="text-[11px] text-stone-500 font-medium truncate">
                      Oldest-first dispatch queue • Auto-refreshes every 5s
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadOrders()}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
                >
                  <Clock size={13} />
                  <span>Refresh Queue</span>
                </button>
              </div>

              {/* Metric Summary Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xs">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">Total Active</p>
                  <p className="text-2xl font-black text-stone-900 mt-0.5">{totalActiveCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 shadow-xs">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">New / Placed</p>
                  <p className="text-2xl font-black text-amber-950 mt-0.5">{placedCount}</p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3.5 shadow-xs">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800">Preparing</p>
                  <p className="text-2xl font-black text-indigo-950 mt-0.5">{preparingCount}</p>
                </div>
                <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3.5 shadow-xs">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">Ready</p>
                  <p className="text-2xl font-black text-teal-950 mt-0.5">{readyCount}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 shadow-xs">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Urgent (&gt;20m)</p>
                  <p className="text-2xl font-black text-rose-950 mt-0.5">{urgentCount}</p>
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: "all", label: "All Tickets", count: totalActiveCount },
                  { id: "placed", label: "New (Placed)", count: placedCount },
                  { id: "accepted", label: "Accepted", count: acceptedCount },
                  { id: "preparing", label: "Preparing", count: preparingCount },
                  { id: "ready", label: "Ready", count: readyCount },
                  { id: "urgent", label: "Urgent (>20m)", count: urgentCount },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setKitchenStatusFilter(f.id as any)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border shrink-0 active:scale-95 ${
                      kitchenStatusFilter === f.id
                        ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                        : "bg-white text-stone-700 border-stone-200/90 hover:bg-stone-50"
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loadingOrders && !payload?.orders ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-stone-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Loading kitchen orders...</p>
            </div>
          ) : null}

          {/* Orders Grid */}
          <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleOrders.map((order) => {
              const dwellTier = getDwellTier(order.created_at);
              const dwellMins = dwellMinutes(order.created_at);

              return (
                <div
                  key={order.id}
                  className={`rounded-3xl border-2 p-5 shadow-sm transition-all flex flex-col justify-between ${
                    dwellTier === "urgent" && order.status !== "ready"
                      ? "border-rose-300 bg-rose-50/50"
                      : order.status === "placed"
                      ? "border-amber-300 bg-amber-50/30"
                      : order.status === "accepted"
                      ? "border-sky-300 bg-sky-50/30"
                      : order.status === "preparing"
                      ? "border-indigo-300 bg-indigo-50/30"
                      : order.status === "ready"
                      ? "border-teal-300 bg-teal-50/30"
                      : "border-stone-200/90 bg-white"
                  }`}
                >
                  <div>
                    {/* Card Top Meta */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block truncate">
                          {order.table?.floor_name || "Dining Floor"}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <h3 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                            {order.table?.table_number ?? "Table"}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[11px] font-black tracking-wider text-stone-500 uppercase">
                          ORDER #{order.id.slice(0, 6).toUpperCase()}
                        </span>
                        <span
                          className={`rounded-xl border px-3 py-1 text-xs font-black uppercase tracking-wider ${
                            STATUS_BADGE[order.status] ?? "bg-stone-100 text-stone-800 border-stone-200"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Operational Context Sub-Bar */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap text-xs text-stone-600 font-semibold border-b border-stone-200/60 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {order.staff_name ? (
                          <span className="text-stone-800 font-bold">
                            Waiter: {order.staff_name}
                          </span>
                        ) : order.order_source === "qr" ? (
                          <span className="text-amber-900 font-bold">
                            Customer QR
                          </span>
                        ) : (
                          <span className="text-stone-600">
                            POS Direct
                          </span>
                        )}

                        {order.order_source && (
                          <span className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-stone-700">
                            {order.order_source === "waiter"
                              ? "Waiter Order"
                              : order.order_source === "qr"
                              ? "QR Order"
                              : "POS Order"}
                          </span>
                        )}
                      </div>

                      {/* Elapsed Dwell Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide border ${
                          dwellTier === "urgent"
                            ? "bg-rose-100 text-rose-950 border-rose-300"
                            : dwellTier === "warning"
                            ? "bg-amber-100 text-amber-950 border-amber-300"
                            : "bg-stone-100 text-stone-700 border-stone-200"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            dwellTier === "urgent"
                              ? "bg-rose-600 animate-pulse"
                              : dwellTier === "warning"
                              ? "bg-amber-600"
                              : "bg-stone-400"
                          }`}
                        />
                        {dwellMins}m Dwell
                      </span>
                    </div>

                    {/* Order Items with Quantity Dominance */}
                    <div className="mt-3.5 space-y-2.5 rounded-2xl border border-stone-200/80 bg-stone-50/90 p-3.5">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 text-stone-900">
                          {/* Visual Quantity Dominance */}
                          <span className="rounded-xl font-black bg-stone-900 text-white px-3 py-1 text-sm sm:text-base shrink-0 shadow-xs">
                            {item.quantity} ×
                          </span>

                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="font-black text-stone-900 text-sm sm:text-base uppercase tracking-tight leading-snug">
                              {item.name}
                            </p>
                            {item.notes ? (
                              <p className="text-xs text-amber-950 font-bold bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300 mt-1 inline-block">
                                ⚠️ Note: {item.notes}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Special Order Instructions / Allergies Callout Box */}
                    {order.notes && (
                      <div className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-3 text-xs font-black text-amber-950 uppercase tracking-wide flex items-start gap-2 shadow-xs">
                        <span className="text-amber-800 font-extrabold shrink-0">⚠️ SPECIAL INSTRUCTIONS:</span>
                        <span className="font-black text-stone-950">{order.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer & Action Buttons (52–56px Primary Touch Targets) */}
                  <div className="mt-4 pt-3 border-t border-stone-200/60">
                    <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-3">
                      <span>Placed {timeAgo(order.created_at)}</span>
                      <span className="font-extrabold text-stone-900 text-sm">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>

                    {/* Action Buttons (52–56px touch target — H-4B) */}
                    <div className="flex flex-col gap-2">
                      {(ACTIONS[role][order.status] ?? []).map((action) => {
                        const isPrimary = action.status !== "cancelled";
                        const isUpdating = updatingOrderIds.has(order.id);

                        return (
                          <button
                            key={action.status}
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateStatus(order.id, action.status)}
                            className={`w-full rounded-2xl px-4 py-3 text-xs sm:text-sm font-black uppercase tracking-wider transition shadow-sm cursor-pointer border flex items-center justify-center gap-2 ${
                              isPrimary ? "min-h-[52px]" : "min-h-[44px]"
                            } ${
                              action.status === "accepted"
                                ? "bg-sky-600 hover:bg-sky-500 text-white border-sky-600 active:scale-[0.98]"
                                : action.status === "preparing"
                                ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600 active:scale-[0.98]"
                                : action.status === "ready"
                                ? "bg-teal-600 hover:bg-teal-500 text-white border-teal-600 active:scale-[0.98]"
                                : action.status === "served"
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 active:scale-[0.98]"
                                : "bg-white hover:bg-rose-50 text-rose-800 border-rose-200 active:scale-[0.98]"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {isUpdating
                              ? getInFlightLabel(action.status)
                              : action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {!loadingOrders && visibleOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-stone-500 shadow-sm">
              <UtensilsCrossed size={48} className="mx-auto mb-3.5 text-stone-400" />
              <h3 className="text-lg font-black text-stone-900">
                {kitchenStatusFilter !== "all" ? `No ${kitchenStatusFilter} orders` : "Kitchen is clear"}
              </h3>
              <p className="mt-1.5 text-xs text-stone-500 font-medium max-w-sm mx-auto">
                {kitchenStatusFilter !== "all"
                  ? "Switch to 'All Tickets' or wait for new tickets to enter this stage."
                  : "No active orders right now. Incoming guest and tableside orders will appear here automatically."}
              </p>
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="mt-4 min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 px-4 py-2 text-xs font-extrabold uppercase text-stone-700 transition cursor-pointer active:scale-95"
              >
                Refresh Queue
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: ACTIVE BILLS & SETTLEMENT (Waiter Settlement Surface)        */}
      {/* =================================================================== */}
      {activeTab === "sessions" && role === "waiter" && (
        <div className="space-y-6">
          {sessionsError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800">
              {sessionsError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {(sessionsPayload?.sessions ?? []).map((session) => {
              return (
                <div
                  key={session.id}
                  className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Session Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-stone-500 font-extrabold">
                          {session.table?.floor_name || "Dining Floor"}
                        </p>
                        <h3 className="mt-0.5 text-3xl font-black text-stone-900 tracking-tight">
                          {session.table?.table_number ?? "Table"}
                        </h3>
                        {session.customer_name && (
                          <p className="text-xs font-bold text-stone-700 mt-1 flex items-center gap-1">
                            <User size={13} className="text-stone-400" />
                            <span>{session.customer_name} {session.customer_phone ? `(${session.customer_phone})` : ""}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-xl border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                            session.payment_status === "paid"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-900"
                          }`}
                        >
                          {session.payment_status === "paid" ? "Paid ✓" : "Unpaid"}
                        </span>
                        <span className="text-[11px] font-medium text-stone-500">
                          Opened {timeAgo(session.opened_at)}
                        </span>
                      </div>
                    </div>

                    {/* Orders Summary */}
                    <div className="mt-4 rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5 space-y-2 max-h-48 overflow-y-auto">
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        Session Orders ({session.orders.length})
                      </p>
                      {session.orders.map((o, idx) => (
                        <div key={o.id} className="flex items-center justify-between text-xs text-stone-700 py-1 border-b border-stone-200/60 last:border-0">
                          <span className="font-medium">Order #{idx + 1} ({o.items.length} items)</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${STATUS_BADGE[o.status] || ""}`}>
                              {o.status}
                            </span>
                            <span className="font-bold text-stone-900">{formatCurrency(o.total_amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment & Settlement Controls (44px+ touch targets) */}
                  <div className="mt-5 border-t border-stone-100 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-600 font-bold">Total Bill:</span>
                      <span className="text-2xl font-black text-amber-900">{formatCurrency(session.session_total)}</span>
                    </div>

                    {session.payment_status !== "paid" ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200 text-xs font-bold">
                            {["cash", "upi", "card"].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() =>
                                  setStaffPaymentMethods((prev) => ({ ...prev, [session.id]: m }))
                                }
                                className={`min-h-[36px] px-3.5 py-1 rounded-lg uppercase transition cursor-pointer ${
                                  (staffPaymentMethods[session.id] || "cash") === m
                                    ? "bg-amber-500 text-stone-950 font-black shadow-xs"
                                    : "text-stone-600 hover:text-stone-900"
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            disabled={staffSettlingId === session.id}
                            onClick={async () => {
                              try {
                                setStaffSettlingId(session.id);
                                const method = staffPaymentMethods[session.id] || "cash";
                                const res = await fetch("/api/staff/sessions/payment", {
                                  method: "POST",
                                  headers: { 
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${effectiveToken}`,
                                  },
                                  body: JSON.stringify({
                                    session_id: session.id,
                                    payment_method: method,
                                  }),
                                });
                                const d = await res.json().catch(() => ({}));
                                if (res.status === 401) {
                                  handleAuthEviction();
                                  return;
                                }
                                if (!res.ok) {
                                  const classified = classifyStaffApiError(res.status, d.error);
                                  if (classified.is401) {
                                    handleAuthEviction(classified.message);
                                    return;
                                  }
                                  throw new Error(classified.message);
                                }
                                void loadSessions();
                              } catch (e: any) {
                                const classified = classifyStaffApiError(undefined, undefined, e);
                                if (classified.is401) {
                                  handleAuthEviction(classified.message);
                                } else {
                                  alert(classified.message || "Failed to record payment");
                                }
                              } finally {
                                setStaffSettlingId(null);
                              }
                            }}
                            className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-black text-white uppercase tracking-wider transition shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {staffSettlingId === session.id ? "Settling..." : "Record Payment ✓"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 size={15} /> Payment Settled
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/staff/sessions/close", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${effectiveToken}`,
                                },
                                body: JSON.stringify({ session_id: session.id }),
                              });
                              const d = await res.json().catch(() => ({}));
                              if (res.status === 401) {
                                handleAuthEviction();
                                return;
                              }
                              if (!res.ok) {
                                const classified = classifyStaffApiError(res.status, d.error);
                                if (classified.is401) {
                                  handleAuthEviction(classified.message);
                                  return;
                                }
                                throw new Error(classified.message);
                              }
                              void loadSessions();
                              void loadFloorsAndTables();
                            } catch (e: any) {
                              const classified = classifyStaffApiError(undefined, undefined, e);
                              if (classified.is401) {
                                handleAuthEviction(classified.message);
                              } else {
                                alert(classified.message || "Failed to close table session");
                              }
                            }
                          }}
                          className="min-h-[44px] rounded-xl border border-stone-300 bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition cursor-pointer"
                        >
                          Close Table Session
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!sessionsLoading && !sessionsPayload?.sessions?.length && (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-stone-500 shadow-sm">
              <Receipt size={40} className="mx-auto mb-3 text-stone-400" />
              <p className="text-base font-extrabold text-stone-800">No active dining sessions</p>
              <p className="mt-1 text-xs text-stone-500 font-medium">Occupied tables with open sessions will appear here for billing settlement.</p>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAKE ORDER WORKSPACE MODAL (Tablet-First Responsive Workspace)     */}
      {/* =================================================================== */}
      {isTakeOrderOpen && orderTargetTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-3xl border border-stone-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 sm:px-6 py-4 bg-stone-50/90">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-stone-950 shrink-0">
                  <UtensilsCrossed size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-stone-900">
                      Take Order: Table {orderTargetTable.table_number}
                    </h3>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {orderTargetTable.floor_id ? floorNameMap.get(orderTargetTable.floor_id) || "Floor" : "Dining Floor"}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-medium">Browse menu, select items, and submit kitchen ticket.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTakeOrderOpen(false)}
                className="h-11 w-11 rounded-2xl border border-stone-200 bg-white flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Responsive Layout (Side-by-side on desktop/tablet-landscape, stack on tablet-portrait/mobile) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              
              {/* Left Column: Menu Search & Items List (lg:col-span-7) */}
              <div className="lg:col-span-7 border-r border-stone-200 flex flex-col overflow-hidden bg-white">
                
                {/* Search & Category Filter Bar */}
                <div className="p-4 border-b border-stone-200 space-y-3 bg-stone-50/50">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search menu items..."
                      value={menuSearchQuery}
                      onChange={(e) => setMenuSearchQuery(e.target.value)}
                      className="h-12 w-full rounded-xl border border-stone-200 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none shadow-xs font-medium"
                    />
                  </div>

                  {/* Category Filter Pills (44px touch targets) */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId("all")}
                      className={`min-h-[40px] rounded-xl px-4 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedCategoryId === "all"
                          ? "bg-amber-500 text-stone-950 font-black shadow-xs"
                          : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                      }`}
                    >
                      All ({menuItems.length})
                    </button>
                    {categories.map((cat) => {
                      const count = menuItems.filter((i) => i.category_id === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`min-h-[40px] rounded-xl px-4 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                            selectedCategoryId === cat.id
                              ? "bg-amber-500 text-stone-950 font-black shadow-xs"
                              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                          }`}
                        >
                          {cat.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Menu Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {loadingMenu ? (
                    <div className="py-12 text-center text-stone-500 text-xs font-bold">Loading menu items...</div>
                  ) : filteredMenuItems.length === 0 ? (
                    <div className="py-12 text-center text-stone-400 text-xs font-medium">No menu items match your search.</div>
                  ) : (
                    filteredMenuItems.map((item) => {
                      const inCart = cart.find((i) => i.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-3.5 sm:p-4 flex items-center justify-between gap-3 transition ${
                            !item.is_available
                              ? "border-stone-100 bg-stone-50/60 opacity-60"
                              : inCart
                              ? "border-amber-300 bg-amber-50/30"
                              : "border-stone-200/90 bg-white hover:border-stone-300"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                  item.is_veg ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                                title={item.is_veg ? "Vegetarian" : "Non-Vegetarian"}
                              />
                              <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">{item.name}</h4>
                            </div>
                            <p className="text-xs sm:text-sm font-extrabold text-amber-900 mt-1">
                              {formatCurrency(item.price)}
                            </p>
                            {item.description && (
                              <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div>
                            {!item.is_available ? (
                              <span className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-bold uppercase text-rose-800">
                                Sold Out
                              </span>
                            ) : inCart ? (
                              <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.id, -1)}
                                  className="h-10 w-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  <Minus size={15} />
                                </button>
                                <span className="w-7 text-center text-xs font-black text-amber-950">
                                  {inCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.id, 1)}
                                  className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center text-stone-950 font-black hover:bg-amber-400 transition cursor-pointer"
                                  title="Increase quantity"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddToCart(item)}
                                className="h-11 rounded-xl bg-stone-100 hover:bg-amber-500 hover:text-stone-950 border border-stone-200 px-4 text-xs font-extrabold text-stone-800 transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                              >
                                <Plus size={15} /> Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Mobile / Portrait Tablet Sticky Bottom Cart Bar */}
                {cart.length > 0 && (
                  <div className="lg:hidden p-3 border-t border-stone-200 bg-amber-50/95 backdrop-blur-xs flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-stone-900">{cartTotalItems} items in cart</p>
                      <p className="text-sm font-black text-amber-950">{formatCurrency(cartSubtotal)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMobileCartDrawer((prev) => !prev)}
                      className="min-h-[44px] rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                    >
                      <ShoppingBag size={15} />
                      <span>{showMobileCartDrawer ? "Back to Menu" : "Review Cart"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Order Cart & Submission (lg:col-span-5) */}
              <div
                className={`lg:col-span-5 flex-col justify-between bg-stone-50/80 p-5 overflow-y-auto custom-scrollbar border-t lg:border-t-0 ${
                  showMobileCartDrawer ? "flex" : "hidden lg:flex"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                      <ShoppingBag size={15} className="text-amber-600" />
                      Order Cart ({cartTotalItems} items)
                    </span>
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCart([])}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear Cart
                      </button>
                    )}
                  </div>

                  {/* Toast Feedback */}
                  {orderToast && (
                    <div
                      className={`my-3 rounded-2xl p-3 text-xs font-bold border flex items-center gap-2 shadow-sm ${
                        orderToast.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-rose-200 bg-rose-50 text-rose-900"
                      }`}
                    >
                      {orderToast.type === "success" ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-600 shrink-0" />
                      )}
                      <span>{orderToast.message}</span>
                    </div>
                  )}

                  {/* Cart Items List */}
                  <div className="mt-3 space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {cart.length === 0 ? (
                      <div className="py-12 text-center text-stone-400 text-xs font-medium">
                        Cart is empty. Select items from the menu to build the order ticket.
                      </div>
                    ) : (
                      cart.map((cItem) => (
                        <div key={cItem.id} className="rounded-2xl border border-stone-200 bg-white p-3 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-xs font-bold text-stone-900">{cItem.name}</h5>
                              <p className="text-[11px] text-amber-900 font-extrabold">
                                {formatCurrency(cItem.price)} × {cItem.quantity} = {formatCurrency(cItem.price * cItem.quantity)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(cItem.id, -1)}
                                className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-6 text-center text-xs font-black text-stone-900">
                                {cItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(cItem.id, 1)}
                                className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-stone-950 font-black hover:bg-amber-400 transition cursor-pointer"
                              >
                                <Plus size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(cItem.id)}
                                className="h-8 w-8 ml-1 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            placeholder="Special item note (e.g. less spicy)..."
                            value={cItem.notes}
                            onChange={(e) => handleUpdateItemNotes(cItem.id, e.target.value)}
                            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                      ))
                    )}
                  </div>

                  {/* Kitchen Special Notes Input */}
                  <div className="mt-4">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                      Kitchen Special Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Serve starters first, VIP table..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none shadow-2xs font-medium"
                    />
                  </div>
                </div>

                {/* Cart Subtotal & Place Order Submission (48px Primary CTA) */}
                <div className="mt-5 border-t border-stone-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-600 font-bold">Order Subtotal:</span>
                    <span className="text-xl font-black text-stone-900">{formatCurrency(cartSubtotal)}</span>
                  </div>

                  <button
                    type="button"
                    disabled={cart.length === 0 || isSubmittingOrder}
                    onClick={handleSubmitOrder}
                    className="h-12 w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                  >
                    {isSubmittingOrder ? (
                      <span>Placing Order...</span>
                    ) : (
                      <>
                        <span>Place Order Ticket</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
