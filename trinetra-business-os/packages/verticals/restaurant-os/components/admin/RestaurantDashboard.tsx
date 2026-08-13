"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NotificationCenter from "@/components/common/NotificationCenter";
import PaymentSettingsPanel from "@/views/admin/panels/PaymentSettingsPanel";
import ThermalReceiptModal, { ReceiptData } from "./ThermalReceiptModal";
import {
  Copy,
  Download,
  Loader2,
  Plus,
  Trash2,
  UtensilsCrossed,
  Users,
  LayoutGrid,
  ChefHat,
  CreditCard,
  CheckCircle2,
  QrCode,
  Printer,
  Search,
  History,
  Receipt,
} from "lucide-react";

type DashboardOrder = {
  id: string;
  status: string;
  notes: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
  table: {
    id: string;
    table_number: string;
  } | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes: string | null;
  }>;
};

type TableRecord = {
  id: string;
  table_number: string;
  table_token: string;
  is_active: boolean;
  created_at: string;
};

type MenuCategory = {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_veg: boolean;
  display_order: number;
};

type StaffRecord = {
  id: string;
  name: string;
  role: "kitchen" | "waiter";
  access_token: string;
  is_active: boolean;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Session types (Live Tables)
// ---------------------------------------------------------------------------

type SessionOrderItem = {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
};

type SessionOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: SessionOrderItem[];
};

type DashboardSession = {
  id: string;
  table: { id: string; table_number: string } | null;
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
  bill?: {
    id: string;
    subtotal: number;
    discount_type: "percentage" | "flat" | "none";
    discount_value: number;
    discount_amount: number;
    discount_reason: string | null;
    tax_amount: number;
    service_charge: number;
    round_off: number;
    grand_total: number;
  } | null;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
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

const SESSION_STATUS_BADGE: Record<string, string> = {
  placed: "bg-amber-400/10 text-amber-200 border-amber-400/20",
  accepted: "bg-sky-400/10 text-sky-200 border-sky-400/20",
  preparing: "bg-violet-400/10 text-violet-200 border-violet-400/20",
  ready: "bg-emerald-400/10 text-emerald-200 border-emerald-400/20",
  served: "bg-teal-400/10 text-teal-200 border-teal-400/20",
  closed: "bg-slate-400/10 text-slate-300 border-slate-400/20",
  cancelled: "bg-rose-400/10 text-rose-300 border-rose-400/20",
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(text || `Request failed with HTTP status ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }
  return data as T;
}

export default function RestaurantDashboard({
  restaurantId,
  restaurantName,
  currency,
  tenantId,
  userRole = "waiter",
  taxRate = 5.0,
  taxLabel = "GST",
}: {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  tenantId?: string;
  userRole?: string;
  taxRate?: number;
  taxLabel?: string;
}) {
  // Shadow global fetch to automatically inject tenant and restaurant context
  const fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === "string" ? input : input.toString();
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const url = new URL(urlStr, origin);
    
    if (tenantId) {
      url.searchParams.set("tenant_id", tenantId);
    }
    if (restaurantId && restaurantId !== "default") {
      url.searchParams.set("restaurant_id", restaurantId);
    }
    
    const headers = new Headers(init?.headers);
    if (tenantId) headers.set("x-tenant-id", tenantId);
    if (restaurantId && restaurantId !== "default") headers.set("x-restaurant-id", restaurantId);
    
    return typeof window !== "undefined"
      ? window.fetch(url.toString(), {
          ...init,
          headers,
        })
      : globalThis.fetch(url.toString(), {
          ...init,
          headers,
        });
  };

  // Discount / Auditing States
  const [sessionDiscounts, setSessionDiscounts] = useState<Record<string, { type: "percentage" | "flat"; value: number; reason: string }>>({});

  const getSessionDiscount = (sessionId: string) => {
    return sessionDiscounts[sessionId] || { type: "percentage", value: 0, reason: "" };
  };

  const updateDiscount = (sessionId: string, field: string, val: any) => {
    setSessionDiscounts(prev => ({
      ...prev,
      [sessionId]: {
        ...getSessionDiscount(sessionId),
        [field]: val
      }
    }));
  };

  const calculateDiscountAmount = (subtotal: number, discount: { type: "percentage" | "flat"; value: number }) => {
    if (discount.type === "percentage") {
      return (subtotal * discount.value) / 100;
    }
    return Math.min(subtotal, discount.value);
  };
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [itemForm, setItemForm] = useState({
    category_id: "",
    name: "",
    description: "",
    price: "",
    is_veg: true,
  });
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "kitchen" as "kitchen" | "waiter",
  });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- Tab navigation & Search state ---
  const [activeTab, setActiveTab] = useState<"live" | "menu" | "staff" | "payment" | "history">("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "placed" | "preparing" | "ready">("all");
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [historyMetrics, setHistoryMetrics] = useState<any>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [thermalReceiptData, setThermalReceiptData] = useState<ReceiptData | null>(null);
  const [adminPaymentMethods, setAdminPaymentMethods] = useState<Record<string, string>>({});

  const loadHistory = useCallback(async (query = "") => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const url = `/api/client/restaurant/history?restaurant_id=${restaurantId}&search=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistorySessions(data.sessions || []);
        setHistoryMetrics(data.metrics || {});
      } else {
        console.error("History fetch failed with status:", res.status);
        setHistoryError("Unable to load session history. Please retry.");
      }
    } catch (err) {
      console.error("Failed to fetch session history:", err);
      setHistoryError("Unable to load session history. Please retry.");
    } finally {
      setHistoryLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (activeTab === "history") {
      void loadHistory(searchQuery);
    }
  }, [activeTab, searchQuery, loadHistory]);

  const openThermalReceipt = (session: DashboardSession) => {
    setThermalReceiptData({
      restaurantName: restaurantName || "Trinetra Restaurant OS",
      restaurantAddress: null,
      businessGstin: null,
      tableNumber: session.table?.table_number || "1",
      sessionId: session.id,
      customerName: session.customer_name || null,
      customerPhone: session.customer_phone || null,
      openedAt: session.opened_at || new Date().toISOString(),
      paidAt: session.paid_at || new Date().toISOString(),
      orders: (session.orders || []).map((ord) => ({
        id: ord.id,
        totalAmount: Number(ord.total_amount || 0),
        items: (ord.items || []).map((it) => ({
          id: it.id,
          name: it.name,
          price: Number((it as any).price || 0),
          quantity: Number(it.quantity || 1),
        })),
      })),
      bill: {
        subtotal: Number(session.bill?.subtotal ?? session.session_total),
        discountType: session.bill?.discount_type || "none",
        discountValue: Number(session.bill?.discount_value || 0),
        discountAmount: Number(session.bill?.discount_amount || 0),
        discountReason: session.bill?.discount_reason || null,
        taxAmount: Number(session.bill?.tax_amount || 0),
        serviceCharge: Number(session.bill?.service_charge || 0),
        roundOff: Number(session.bill?.round_off || 0),
        grandTotal: Number(session.bill?.grand_total ?? session.session_total),
      },
    });
  };

  // --- Sessions state (Live Tables) ---
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [paymentActionId, setPaymentActionId] = useState<string | null>(null);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [confirmForceClose, setConfirmForceClose] = useState<string | null>(
    null,
  );
  const [confirmUnpaidClose, setConfirmUnpaidClose] = useState<string | null>(
    null,
  );

  async function loadAll(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [ordersRes, tablesRes, menuRes, staffRes, sessionsRes] =
        await Promise.all([
          fetch("/api/client/restaurant/orders?limit=30&active_only=true", {
            cache: "no-store",
          }),
          fetch("/api/client/restaurant/tables", { cache: "no-store" }),
          fetch("/api/client/restaurant/menu", { cache: "no-store" }),
          fetch("/api/client/restaurant/staff", { cache: "no-store" }),
          fetch("/api/client/restaurant/sessions", { cache: "no-store" }),
        ]);

      const [ordersData, tablesData, menuData, staffData, sessionsData] =
        await Promise.all([
          readJson<{ orders: DashboardOrder[] }>(ordersRes),
          readJson<{ tables: TableRecord[] }>(tablesRes),
          readJson<{ categories: MenuCategory[]; items: MenuItem[] }>(menuRes),
          readJson<{ staff: StaffRecord[] }>(staffRes),
          readJson<{ sessions: DashboardSession[] }>(sessionsRes),
        ]);

      setOrders(ordersData.orders);
      setTables(tablesData.tables);
      setCategories(menuData.categories);
      if (menuData.categories.length > 0) {
        setItemForm((prev) => {
          const isValid = menuData.categories.some((c) => c.id === prev.category_id);
          return {
            ...prev,
            category_id: isValid ? prev.category_id : menuData.categories[0].id,
          };
        });
      }
      setItems(menuData.items);
      setStaff(staffData.staff);
      setSessions(sessionsData.sessions);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load restaurant dashboard.",
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadAll(true);

    if (!restaurantId || restaurantId === "default") return;

    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerDebouncedReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void loadAll(false);
      }, 500);
    };

    const channelName = `restaurant-ops-${restaurantId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => triggerDebouncedReload()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_table_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => triggerDebouncedReload()
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void loadAll(false);
    }, 20000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, tenantId]);

  const groupedMenu = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        items: items.filter((item) => item.category_id === category.id),
      })),
    [categories, items],
  );

  const metrics = useMemo(() => {
    const activeOrders = orders.filter(
      (order) =>
        !["served", "closed", "cancelled"].includes(order.status) &&
        (order as any).session_status !== "closed",
    );
    const readyOrders = orders.filter(
      (order) => order.status === "ready" && (order as any).session_status !== "closed",
    ).length;
    const kitchenQueue = orders.filter(
      (order) =>
        ["placed", "accepted", "preparing"].includes(order.status) &&
        (order as any).session_status !== "closed",
    ).length;
    const revenue = orders.reduce((sum, order) => sum + order.total_amount, 0);

    return {
      activeOrders: activeOrders.length,
      readyOrders,
      kitchenQueue,
      revenue,
    };
  }, [orders]);

  async function createTable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusyKey("table:create");
      const response = await fetch("/api/client/restaurant/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: tableNumber }),
      });
      await readJson(response);
      setTableNumber("");
      await loadAll(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create table.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteTable(id: string) {
    try {
      setBusyKey(`table:${id}`);
      const response = await fetch("/api/client/restaurant/tables", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: id }),
      });
      await readJson(response);
      await loadAll(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to delete table.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function generateQrs() {
    try {
      setBusyKey("tables:qrs");
      const response = await fetch(
        "/api/client/restaurant/tables/generate-qrs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table_ids: tables.map((table) => table.id) }),
        },
      );
      const data = await readJson<{ download_url: string }>(response);
      if (data.download_url && data.download_url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = data.download_url;
        link.download = `Tables_QR_Codes_${restaurantName.replace(/\s+/g, "_")}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(data.download_url, "_blank", "noopener,noreferrer");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to generate QRs.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusyKey("category:create");
      const response = await fetch("/api/client/restaurant/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", name: categoryName }),
      });
      const data = await readJson<{ category?: { id: string } }>(response);
      if (data?.category?.id) {
        setItemForm((prev) => ({ ...prev, category_id: data.category!.id }));
      }
      setCategoryName("");
      await loadAll(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create category.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function createItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!itemForm.category_id) {
      setError("Please select or create a menu category first.");
      return;
    }
    if (!itemForm.name.trim()) {
      setError("Please enter a valid item name.");
      return;
    }
    if (!itemForm.price || isNaN(Number(itemForm.price)) || Number(itemForm.price) < 0) {
      setError("Please enter a valid price.");
      return;
    }

    try {
      setBusyKey("item:create");
      const response = await fetch("/api/client/restaurant/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "item",
          category_id: itemForm.category_id,
          name: itemForm.name.trim(),
          description: itemForm.description.trim(),
          price: Number(itemForm.price),
          is_veg: itemForm.is_veg,
        }),
      });
      await readJson(response);
      setItemForm((current) => ({
        ...current,
        name: "",
        description: "",
        price: "",
        is_veg: true,
      }));
      setError(null);
      await loadAll(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create item.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteMenuEntity(type: "category" | "item", id: string) {
    try {
      setBusyKey(`${type}:${id}`);
      const response = await fetch("/api/client/restaurant/menu", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      await readJson(response);
      await loadAll(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : `Failed to delete ${type}.`,
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleItemAvailability(item: MenuItem) {
    try {
      setBusyKey(`item:toggle:${item.id}`);
      const response = await fetch("/api/client/restaurant/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "item",
          id: item.id,
          is_available: !item.is_available,
        }),
      });
      await readJson(response);
      await loadAll(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update item.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusyKey("staff:create");
      const response = await fetch("/api/client/restaurant/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });
      await readJson(response);
      setStaffForm({ name: "", role: "kitchen" });
      await loadAll(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create staff access.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteStaff(id: string) {
    try {
      setBusyKey(`staff:${id}`);
      const response = await fetch("/api/client/restaurant/staff", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: id }),
      });
      await readJson(response);
      await loadAll(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to delete staff member.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function copyAccessLink(member: StaffRecord) {
    const accessUrl = `${window.location.origin}/staff/ops?role=${member.role}&restaurant_id=${restaurantId}&token=${member.access_token}`;
    await navigator.clipboard.writeText(accessUrl);
    setToastMessage(`Copied staff access link for ${member.name} (${member.role})`);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // --- Session actions (Live Tables) ---

  const togglePayment = useCallback(
    async (sessionId: string, action: "mark_paid" | "undo_paid") => {
      try {
        setPaymentActionId(sessionId);
        const discount = sessionDiscounts[sessionId];
        const selectedMethod = adminPaymentMethods[sessionId] || "cash";
        const body: any = { session_id: sessionId, action, payment_method: selectedMethod };
        
        if (action === "mark_paid" && discount && discount.value > 0) {
          body.discount_type = discount.type;
          body.discount_value = discount.value;
          body.discount_reason = discount.reason || "Manager discount";
        }

        const res = await fetch("/api/client/restaurant/sessions/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to update payment status.");
        
        if (action === "mark_paid") {
          setSessionDiscounts((prev) => {
            const next = { ...prev };
            delete next[sessionId];
            return next;
          });
        }
        await loadAll(false);
      } catch (paymentError) {
        setError(
          paymentError instanceof Error
            ? paymentError.message
            : "Failed to update payment status.",
        );
      } finally {
        setPaymentActionId(null);
      }
    },
    [sessionDiscounts, loadAll],
  );

  const closeSession = useCallback(
    async (sessionId: string, force: boolean) => {
      try {
        setClosingSessionId(sessionId);
        const res = await fetch("/api/client/restaurant/sessions/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, force }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.requires_force) {
            setConfirmForceClose(sessionId);
            return;
          }
          throw new Error(data.error || "Failed to close session.");
        }

        setConfirmForceClose(null);
        setConfirmUnpaidClose(null);
        await loadAll(false);
      } catch (closeError) {
        setError(
          closeError instanceof Error
            ? closeError.message
            : "Failed to close session.",
        );
      } finally {
        setClosingSessionId(null);
      }
    },
    [],
  );

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-6 shadow-xl shadow-indigo-950/20">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-xs uppercase tracking-widest text-indigo-400 font-bold">
                  Trinetra Business OS • Vertical Module
                </p>
              </div>
              <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">
                Restaurant OS
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Live table management, QR digital menu, kitchen KDS queue, waiter ops, and real-time settlement for {restaurantName || "Default Organization"}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter restaurantId={restaurantId} role={userRole} />
              <button
                type="button"
                onClick={() => void loadAll(true)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                Refresh Module
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: "Active Orders",
                value: metrics.activeOrders,
                icon: <UtensilsCrossed className="h-5 w-5 text-amber-400" />,
                bgGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
                borderColor: "border-amber-500/20",
              },
              {
                label: "Kitchen Queue",
                value: metrics.kitchenQueue,
                icon: <ChefHat className="h-5 w-5 text-indigo-400" />,
                bgGradient: "from-indigo-500/10 via-indigo-500/5 to-transparent",
                borderColor: "border-indigo-500/20",
              },
              {
                label: "Ready to Serve",
                value: metrics.readyOrders,
                icon: <LayoutGrid className="h-5 w-5 text-emerald-400" />,
                bgGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
                borderColor: "border-emerald-500/20",
              },
              {
                label: "Active Tables",
                value: sessions.length,
                icon: <CreditCard className="h-5 w-5 text-purple-400" />,
                bgGradient: "from-purple-500/10 via-purple-500/5 to-transparent",
                borderColor: "border-purple-500/20",
              },
              {
                label: "Tracked Revenue",
                value: formatCurrency(metrics.revenue, currency),
                icon: <Users className="h-5 w-5 text-teal-400" />,
                bgGradient: "from-teal-500/10 via-teal-500/5 to-transparent",
                borderColor: "border-teal-500/20",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className={`rounded-[24px] border ${metric.borderColor} bg-gradient-to-b ${metric.bgGradient} bg-[#0d0e12]/80 p-5 backdrop-blur-xl shadow-lg transition-all hover:scale-[1.02] hover:border-white/20`}
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">{metric.label}</span>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    {metric.icon}
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-white tracking-tight">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-[#0d0e12]/80 px-6 py-16 text-center text-slate-300 backdrop-blur-xl my-6">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-400" />
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Loading Restaurant OS State...</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-950/40 px-5 py-4 text-sm text-rose-200 backdrop-blur-xl my-6 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            {error}
          </div>
        ) : null}

        {/* Global Search Bar */}
        <div className="relative my-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active orders, table numbers, customer names, phone numbers, or menu items..."
            className="w-full h-12 pl-12 pr-12 text-xs bg-[#0d0e12]/90 border border-white/10 rounded-2xl text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500 transition-all shadow-inner backdrop-blur-xl"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-extrabold px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tab navigation */}
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0d0e12]/90 p-2 backdrop-blur-xl shadow-xl my-6">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              {
                id: "live" as const,
                label: "Live Operations",
                icon: <UtensilsCrossed className="h-4 w-4" />,
              },
              {
                id: "history" as const,
                label: "History & Records",
                icon: <History className="h-4 w-4" />,
              },
              {
                id: "menu" as const,
                label: "Tables & Menu",
                icon: <LayoutGrid className="h-4 w-4" />,
              },
              {
                id: "staff" as const,
                label: "Staff Access",
                icon: <Users className="h-4 w-4" />,
              },
              {
                id: "payment" as const,
                label: "Payment & Settings",
                icon: <QrCode className="h-4 w-4" />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400/40 text-white shadow-lg shadow-indigo-600/30"
                    : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === "live" && sessions.length > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/30 px-1.5 text-[10px] font-black">
                    {sessions.length}
                  </span>
                )}
                {tab.id === "history" && historySessions.length > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 text-[10px] font-black">
                    {historySessions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "live" && (
            <div className="flex items-center gap-1 bg-black/50 p-1.5 rounded-2xl border border-white/10 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2">Filter:</span>
              {(["all", "placed", "preparing", "ready"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setOrderStatusFilter(status)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition cursor-pointer ${
                    orderStatusFilter === status
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* ═══════════ LIVE TAB — orders + active sessions ═══════════ */}
        {activeTab === "live" && (() => {
          const displayOrders = orders.filter((o) => {
            if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const tableNo = (o.table?.table_number || "").toLowerCase();
            const orderId = (o.id || "").toLowerCase();
            const itemMatch = o.items.some((i) => i.name.toLowerCase().includes(q));
            return tableNo.includes(q) || orderId.includes(q) || itemMatch;
          });

          return (
            <>
            <section className="grid gap-5 xl:grid-cols-3">
              {displayOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_22px_55px_rgba(0,0,0,0.22)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                    Table
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {order.table?.table_number ?? "Unknown"}
                  </h2>
                </div>
                <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-amber-100">
                  {order.status}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {order.items.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm text-stone-300"
                  >
                    <span>{item.name}</span>
                    <span>x{item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-stone-400">
                <span>{new Date(order.created_at).toLocaleString()}</span>
                <span className="font-semibold text-white">
                  {formatCurrency(order.total_amount, currency)}
                </span>
              </div>
            </article>
          ))}
          {!loading && !orders.length ? (
            <div className="rounded-[28px] border border-dashed border-white/12 px-6 py-12 text-center text-stone-400 xl:col-span-3">
              No restaurant orders yet.
            </div>
          ) : null}
        </section>

        {/* ============================================================= */}
        {/* LIVE TABLES — session cards with payment + close controls      */}
        {/* ============================================================= */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                Live Tables
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Active sessions
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
            {sessions.map((session) => {
              const latestOrder = session.orders[session.orders.length - 1];
              const latestStatus = latestOrder?.status ?? "—";
              const isForceConfirm = confirmForceClose === session.id;
              const isUnpaidConfirm = confirmUnpaidClose === session.id;
              const isUnpaid = session.payment_status !== "paid";

              return (
                <div
                  key={session.id}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_22px_55px_rgba(0,0,0,0.22)]"
                >
                  {/* Session header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                        Table
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">
                        {session.table?.table_number ?? "Unknown"}
                      </h3>
                      {session.customer_name && (
                        <p className="mt-1 text-sm text-amber-200">
                          {session.customer_name}
                          {session.customer_phone && (
                            <span className="ml-2 text-xs text-stone-400">
                              {session.customer_phone}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {(session.payment_status === "requested" || (session as any).bill_requested_at) && (
                          <span className="rounded-full border border-amber-400/40 bg-amber-400/20 px-3 py-1 text-xs uppercase tracking-[0.24em] text-amber-300 font-black animate-pulse flex items-center gap-1">
                            <Receipt size={12} /> Bill Requested
                          </span>
                        )}
                        {session.payment_status === "paid" && (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/20 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-100">
                            Paid
                          </span>
                        )}
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-200">
                          Active
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500">
                        {timeAgo(session.opened_at)}
                      </span>
                    </div>
                  </div>

                  {/* Session metrics */}
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5 text-center">
                      <p className="text-[11px] uppercase tracking-wider text-stone-500">
                        Orders
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {session.order_count}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5 text-center">
                      <p className="text-[11px] uppercase tracking-wider text-stone-500">
                        Total
                      </p>
                      <p className="mt-1 text-lg font-semibold text-amber-200">
                        {formatCurrency(session.session_total, currency)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5 text-center">
                      <p className="text-[11px] uppercase tracking-wider text-stone-500">
                        Latest
                      </p>
                      <p
                        className={`mt-1 text-sm font-medium ${SESSION_STATUS_BADGE[latestStatus]?.split(" ").find((c: string) => c.startsWith("text-")) ?? "text-stone-200"}`}
                      >
                        {latestStatus}
                      </p>
                    </div>
                  </div>

                  {/* Order breakdown */}
                  <div className="mt-4 max-h-48 space-y-2.5 overflow-y-auto">
                    {session.orders.map((order, idx) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500">
                              Order {idx + 1}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${SESSION_STATUS_BADGE[order.status] ?? "bg-amber-300/10 text-amber-100 border-amber-300/20"}`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-stone-200">
                            {formatCurrency(order.total_amount, currency)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs text-stone-400"
                            >
                              <span>
                                {item.name}{" "}
                                <span className="text-stone-600">
                                  x{item.quantity}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Billing Details & Discount Controls */}
                  {session.payment_status === "paid" && session.bill ? (
                    <div className="mt-4 border-t border-white/5 pt-4 space-y-1.5 text-xs text-stone-400">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-mono">{formatCurrency(session.bill.subtotal, currency)}</span>
                      </div>
                      {Number(session.bill.discount_amount) > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Discount ({session.bill.discount_type === "percentage" ? `${session.bill.discount_value}%` : "flat"}):</span>
                          <span className="font-mono">-{formatCurrency(session.bill.discount_amount, currency)}</span>
                        </div>
                      )}
                      {session.bill.discount_reason && (
                        <div className="text-[10px] text-stone-500 italic">Reason: {session.bill.discount_reason}</div>
                      )}
                      <div className="flex justify-between">
                        <span>Taxes (5% GST):</span>
                        <span className="font-mono">{formatCurrency(session.bill.tax_amount, currency)}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-semibold text-white">
                        <span>Grand Total Paid:</span>
                        <span className="text-amber-200 font-mono">{formatCurrency(session.bill.grand_total, currency)}</span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => openThermalReceipt(session)}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition cursor-pointer"
                        >
                          <Printer size={13} /> Print 80mm Receipt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-white/5 pt-4 space-y-3">
                      {/* Discount Input Form */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-stone-400 font-bold">Billing Discount</span>
                          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                            <button
                              type="button"
                              onClick={() => updateDiscount(session.id, "type", "percentage")}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border-0 cursor-pointer ${
                                getSessionDiscount(session.id).type === "percentage"
                                  ? "bg-violet-600 text-white"
                                  : "text-stone-400 hover:text-white"
                              }`}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              disabled={userRole === "waiter"}
                              onClick={() => updateDiscount(session.id, "type", "flat")}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border-0 cursor-pointer ${
                                getSessionDiscount(session.id).type === "flat"
                                  ? "bg-violet-600 text-white"
                                  : "text-stone-400 hover:text-white"
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                              title={userRole === "waiter" ? "Waiters cannot apply flat discounts" : ""}
                            >
                              ₹
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            min="0"
                            placeholder={getSessionDiscount(session.id).type === "percentage" ? `Max ${userRole === "waiter" ? "5%" : userRole === "manager" ? "20%" : "100%"}` : "Value"}
                            value={getSessionDiscount(session.id).value || ""}
                            onChange={(e) => {
                              let val = parseFloat(e.target.value) || 0;
                              // Validate role-based constraints on the frontend
                              if (getSessionDiscount(session.id).type === "percentage") {
                                if (userRole === "waiter" && val > 5) val = 5;
                                if (userRole === "manager" && val > 20) val = 20;
                              } else {
                                if (userRole === "waiter") val = 0;
                                const maxFlat = session.session_total * 0.20;
                                if (userRole === "manager" && val > maxFlat) val = maxFlat;
                              }
                              updateDiscount(session.id, "value", val);
                            }}
                            className="col-span-1 h-8 px-2.5 text-xs bg-black/40 border border-white/10 rounded-xl text-stone-200 focus:outline-none focus:border-violet-500 placeholder:text-stone-600"
                          />
                          <input
                            type="text"
                            placeholder="Reason (e.g. Promo, Staff)"
                            value={getSessionDiscount(session.id).reason}
                            onChange={(e) => updateDiscount(session.id, "reason", e.target.value)}
                            className="col-span-2 h-8 px-2.5 text-xs bg-black/40 border border-white/10 rounded-xl text-stone-200 focus:outline-none focus:border-violet-500 placeholder:text-stone-600"
                          />
                        </div>
                      </div>

                      {/* Math Summary */}
                      {(() => {
                        const discObj = getSessionDiscount(session.id);
                        const discAmt = calculateDiscountAmount(session.session_total, discObj);
                        const netPayable = Math.max(0, session.session_total - discAmt);
                        const tax = (netPayable * (taxRate / 100));
                        const totalPayable = Math.round(netPayable + tax);
                        return (
                          <div className="bg-black/30 border border-white/5 rounded-2xl p-3 text-xs text-stone-400 space-y-1.5 font-medium">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>{formatCurrency(session.session_total, currency)}</span>
                            </div>
                            {discAmt > 0 && (
                              <div className="flex justify-between text-emerald-400">
                                <span>Discount ({discObj.type === "percentage" ? `${discObj.value}%` : "flat"}):</span>
                                <span>-{formatCurrency(discAmt, currency)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>Taxes ({taxRate}% {taxLabel}):</span>
                              <span>{formatCurrency(tax, currency)}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-semibold text-white">
                              <span>Estimated Payable:</span>
                              <span className="text-amber-200 font-mono">{formatCurrency(totalPayable, currency)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Payment action */}
                  <div className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-stone-400">
                        {session.payment_status === "paid"
                          ? "Bill settled"
                          : "Collect & Settle Payment:"}
                      </p>
                      <button
                        type="button"
                        disabled={paymentActionId === session.id}
                        onClick={() =>
                          void togglePayment(
                            session.id,
                            session.payment_status === "paid"
                              ? "undo_paid"
                              : "mark_paid",
                          )
                        }
                        className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                          session.payment_status === "paid"
                            ? "border border-stone-400/30 bg-stone-400/15 text-stone-200 hover:bg-stone-400/25"
                            : "border border-emerald-400/30 bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                        }`}
                      >
                        {paymentActionId === session.id
                          ? "Updating..."
                          : session.payment_status === "paid"
                            ? "Undo Paid"
                            : "Mark Paid ✓"}
                      </button>
                    </div>

                    {session.payment_status !== "paid" && (
                      <div className="flex items-center gap-1.5 rounded-xl bg-white/5 p-1 border border-white/10 text-xs font-bold w-fit">
                        {["cash", "upi", "card", "split"].map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() =>
                              setAdminPaymentMethods((prev) => ({
                                ...prev,
                                [session.id]: method,
                              }))
                            }
                            className={`px-3 py-1 rounded-lg uppercase transition ${
                              (adminPaymentMethods[session.id] || "cash") === method
                                ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm"
                                : "text-stone-400 hover:text-white"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Close session action */}
                  <div className="mt-3 border-t border-white/8 pt-4">
                    {isForceConfirm ? (
                      <div className="space-y-3">
                        <p className="text-sm text-rose-200">
                          This session has active orders that will be{" "}
                          <strong>cancelled</strong>. Are you sure?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={closingSessionId === session.id}
                            onClick={() => void closeSession(session.id, true)}
                            className="rounded-full border border-rose-400/30 bg-rose-400/15 px-4 py-2 text-sm font-medium text-rose-100 hover:bg-rose-400/25 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {closingSessionId === session.id
                              ? "Closing..."
                              : "Yes, force close"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmForceClose(null)}
                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-stone-300 hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isUnpaidConfirm ? (
                      <div className="space-y-3">
                        <p className="text-sm text-rose-200">
                          This session is <strong>unpaid</strong> (
                          {formatCurrency(session.session_total, currency)}).
                          Close without collecting payment?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={closingSessionId === session.id}
                            onClick={() => {
                              setConfirmUnpaidClose(null);
                              void closeSession(session.id, false);
                            }}
                            className="rounded-full border border-rose-400/30 bg-rose-400/15 px-4 py-2 text-sm font-medium text-rose-100 hover:bg-rose-400/25 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {closingSessionId === session.id
                              ? "Closing..."
                              : "Yes, close unpaid"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmUnpaidClose(null)}
                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-stone-300 hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          {session.all_orders_terminal ? (
                            <p className="text-xs text-emerald-300/80">
                              All orders complete — safe to close
                            </p>
                          ) : (
                            <p className="text-xs text-amber-300/80">
                              Has active orders — will require confirmation
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={closingSessionId === session.id}
                          onClick={() => {
                            if (isUnpaid) {
                              setConfirmUnpaidClose(session.id);
                            } else {
                              void closeSession(session.id, false);
                            }
                          }}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            session.all_orders_terminal
                              ? "border border-emerald-400/30 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25"
                              : "border border-amber-400/30 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25"
                          }`}
                        >
                          {closingSessionId === session.id
                            ? "Closing..."
                            : "Close Table Session"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && !sessions.length ? (
            <div className="rounded-[28px] border border-dashed border-white/12 px-6 py-12 text-center text-stone-400">
              No active table sessions right now.
            </div>
          ) : null}
        </section>
        </>
        );
        })()}
        {activeTab === "history" && (
          <section className="space-y-6">
            {/* Sales Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Revenue</p>
                <p className="mt-2 text-2xl font-black text-emerald-400">
                  {formatCurrency(historyMetrics.totalRevenue || 0, currency)}
                </p>
                <p className="mt-1 text-[10px] text-slate-500 font-medium">Settled Invoices</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cash Payments</p>
                <p className="mt-2 text-xl font-bold text-amber-300">
                  {formatCurrency(historyMetrics.totalCash || 0, currency)}
                </p>
                <p className="mt-1 text-[10px] text-slate-500 font-medium">Cash Register</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">UPI / QR Payments</p>
                <p className="mt-2 text-xl font-bold text-cyan-300">
                  {formatCurrency(historyMetrics.totalUPI || 0, currency)}
                </p>
                <p className="mt-1 text-[10px] text-slate-500 font-medium">Direct Bank Transfer</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Card Payments</p>
                <p className="mt-2 text-xl font-bold text-violet-300">
                  {formatCurrency(historyMetrics.totalCard || 0, currency)}
                </p>
                <p className="mt-1 text-[10px] text-slate-500 font-medium">POS Terminal</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Tips Collected</p>
                <p className="mt-2 text-xl font-bold text-pink-300">
                  {formatCurrency(historyMetrics.totalTips || 0, currency)}
                </p>
                <p className="mt-1 text-[10px] text-slate-500 font-medium">Staff Gratuity</p>
              </div>
            </div>

            {/* History Table Container */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <History size={18} className="text-indigo-400" />
                    Session & Invoice History Archive
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    View completed customer sessions, payment logs, and re-print receipt tax invoices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadHistory(searchQuery)}
                  className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 transition cursor-pointer"
                >
                  Refresh History
                </button>
              </div>

              {historyLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                  Fetching historical session archives...
                </div>
              ) : historyError ? (
                <div className="py-12 text-center text-xs text-rose-400 font-medium">
                  {historyError}
                </div>
              ) : historySessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No session history records found. Completed sessions will be archived here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase text-slate-400 font-bold">
                        <th className="py-3 px-3">Table / Customer</th>
                        <th className="py-3 px-3">Opened / Settled</th>
                        <th className="py-3 px-3">Orders & Items</th>
                        <th className="py-3 px-3">Payment Mode</th>
                        <th className="py-3 px-3 text-right">Grand Total</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {historySessions.map((session) => (
                        <tr key={session.id} className="hover:bg-white/5 transition">
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-white">
                              Table #{session.table?.table_number || "Walk-in"}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {session.customer_name || "Guest Customer"}{" "}
                              {session.customer_phone ? `(${session.customer_phone})` : ""}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="text-slate-300">{timeAgo(session.opened_at)}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {session.paid_at ? `Paid ${timeAgo(session.paid_at)}` : session.status}
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-200">
                              {session.order_count} Orders ({session.orders?.reduce((acc: number, o: any) => acc + (o.items?.length || 0), 0) || 0} Items)
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                              {session.orders?.flatMap((o: any) => o.items?.map((i: any) => i.name)).join(", ")}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                              {session.payment_method || session.bill?.payment_method || "CASH"}
                            </span>
                            {session.tip_amount > 0 && (
                              <div className="text-[10px] text-pink-400 font-bold mt-1">
                                +₹{session.tip_amount} Tip
                              </div>
                            )}
                            {session.customer_utr && (
                              <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                UTR: {session.customer_utr}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-white whitespace-nowrap">
                            {formatCurrency(session.bill?.grand_total || session.session_total || 0, currency)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => openThermalReceipt(session)}
                              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 transition cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Printer size={12} />
                              Re-print
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════════ MENU TAB — tables + categories + items ═══════════ */}
        {activeTab === "menu" && (
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-bold">
                  Tables
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  QR Stations
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void generateQrs()}
                disabled={busyKey === "tables:qrs" || !tables.length}
                className="rounded-xl border border-indigo-500/30 bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {busyKey === "tables:qrs" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export QRs
              </button>
            </div>

            <form onSubmit={createTable} className="mt-4 flex gap-2">
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Table No. (e.g. T-12)"
                required
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={busyKey === "table:create"}
                className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                {busyKey === "table:create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add Table
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {[...tables]
                .sort((a, b) => {
                  const numA = parseInt(a.table_number.replace(/\D/g, ""), 10);
                  const numB = parseInt(b.table_number.replace(/\D/g, ""), 10);
                  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                  return a.table_number.localeCompare(b.table_number);
                })
                .map((table) => (
                  <div
                    key={table.id}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {table.table_number}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Token: {table.table_token.slice(0, 8)}...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteTable(table.id)}
                      disabled={busyKey === `table:${table.id}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors border-0 cursor-pointer"
                      title="Delete Table"
                    >
                      {busyKey === `table:${table.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                Menu
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Categories and items
              </h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <form
                onSubmit={createCategory}
                className="rounded-3xl border border-white/8 bg-black/20 p-4"
              >
                <label className="text-sm font-medium text-white">
                  Create category
                </label>
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Starters"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500"
                />
                <button
                  type="submit"
                  disabled={busyKey === "category:create"}
                  className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950 disabled:opacity-60"
                >
                  Add category
                </button>
              </form>

              <form
                onSubmit={createItem}
                className="rounded-3xl border border-white/8 bg-black/20 p-4"
              >
                <label className="text-sm font-medium text-white">
                  Create menu item
                </label>
                <select
                  value={itemForm.category_id}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      category_id: event.target.value,
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                      className="bg-stone-900"
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  value={itemForm.name}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Paneer Tikka"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500"
                />
                <input
                  value={itemForm.description}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Smoked cottage cheese skewers"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500"
                />
                <div className="mt-3 flex gap-3">
                  <input
                    value={itemForm.price}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    placeholder="Price"
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500"
                  />
                  <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-300">
                    <input
                      type="checkbox"
                      checked={itemForm.is_veg}
                      onChange={(event) =>
                        setItemForm((current) => ({
                          ...current,
                          is_veg: event.target.checked,
                        }))
                      }
                    />
                    Veg
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={busyKey === "item:create"}
                  className="mt-4 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 disabled:opacity-60"
                >
                  Add item
                </button>
              </form>
            </div>
            <div className="mt-6 space-y-4">
              {groupedMenu.map((category) => (
                <div
                  key={category.id}
                  className="rounded-3xl border border-white/8 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {category.name}
                      </h3>
                      <p className="text-sm text-stone-400">
                        {category.items.length} items
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyKey === `category:${category.id}`}
                      onClick={() =>
                        void deleteMenuEntity("category", category.id)
                      }
                      className="rounded-full border border-rose-400/25 bg-rose-400/10 p-2 text-rose-100 hover:bg-rose-400/20 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-white">
                              {item.name}
                            </p>
                            <p className="mt-1 text-sm text-stone-400">
                              {item.description || "No description yet."}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-amber-100">
                              {formatCurrency(item.price, currency)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busyKey === `item:toggle:${item.id}`}
                              onClick={() => void toggleItemAvailability(item)}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.24em] text-white disabled:opacity-60"
                            >
                              {item.is_available ? "Available" : "Hidden"}
                            </button>
                            <button
                              type="button"
                              disabled={busyKey === `item:${item.id}`}
                              onClick={() =>
                                void deleteMenuEntity("item", item.id)
                              }
                              className="rounded-full border border-rose-400/25 bg-rose-400/10 p-2 text-rose-100 hover:bg-rose-400/20 disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!category.items.length ? (
                      <p className="text-sm text-stone-500">
                        No items in this category yet.
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* ═══════════ STAFF TAB — kitchen + waiter access ═══════════ */}
        {activeTab === "staff" && (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
                Staff
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Kitchen and waiter access
              </h2>
            </div>
          </div>
          <form
            onSubmit={createStaff}
            className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_140px]"
          >
            <input
              value={staffForm.name}
              onChange={(event) =>
                setStaffForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Staff member name"
              className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-stone-500"
            />
            <select
              value={staffForm.role}
              onChange={(event) =>
                setStaffForm((current) => ({
                  ...current,
                  role: event.target.value as "kitchen" | "waiter",
                }))
              }
              className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="kitchen" className="bg-stone-900">
                Kitchen
              </option>
              <option value="waiter" className="bg-stone-900">
                Waiter
              </option>
            </select>
            <button
              type="submit"
              disabled={busyKey === "staff:create"}
              className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-950 disabled:opacity-60"
            >
              Add staff
            </button>
          </form>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {staff.map((member) => (
              <div
                key={member.id}
                className="rounded-3xl border border-white/8 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {member.name}
                    </p>
                    <p className="mt-1 text-sm uppercase tracking-[0.24em] text-stone-400">
                      {member.role}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyKey === `staff:${member.id}`}
                    onClick={() => void deleteStaff(member.id)}
                    className="rounded-full border border-rose-400/25 bg-rose-400/10 p-2 text-rose-100 hover:bg-rose-400/20 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-stone-300">
                  <p className="font-mono text-xs text-stone-400 truncate">
                    /staff/ops?role={member.role}&restaurant_id={restaurantId}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyAccessLink(member)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4" />
                    Copy access link
                  </button>
                </div>
              </div>
            ))}
            {!staff.length ? (
              <div className="rounded-3xl border border-dashed border-white/12 px-6 py-12 text-center text-stone-400 md:col-span-2 xl:col-span-3">
                No staff access links created yet.
              </div>
            ) : null}
          </div>
        </section>
        )}

        {/* ═══════════ PAYMENT & SETTINGS TAB ═══════════ */}
        {activeTab === "payment" && (
          <PaymentSettingsPanel restaurantId={restaurantId} tenantId={tenantId} />
        )}
      </div>

      {thermalReceiptData && (
        <ThermalReceiptModal
          receipt={thermalReceiptData}
          onClose={() => setThermalReceiptData(null)}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-slate-900/95 px-5 py-3.5 text-xs font-bold text-emerald-300 shadow-2xl backdrop-blur-md transition-all">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
