"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

type DashboardOrder = {
  id: string;
  table_session_id?: string | null;
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
  placed: "bg-amber-50 text-amber-800 border-amber-200",
  accepted: "bg-sky-50 text-sky-800 border-sky-200",
  preparing: "bg-violet-50 text-violet-800 border-violet-200",
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  served: "bg-teal-50 text-teal-800 border-teal-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
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

  const [adminPaymentMethods, setAdminPaymentMethods] = useState<Record<string, string>>({});

  const getSessionPaymentMethod = (sessionId: string) => {
    return adminPaymentMethods[sessionId] || "cash";
  };

  const updatePaymentMethod = (sessionId: string, method: string) => {
    setAdminPaymentMethods(prev => ({
      ...prev,
      [sessionId]: method
    }));
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
          fetch("/api/client/restaurant/orders?limit=30", {
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
    const interval = window.setInterval(() => {
      void loadAll(false);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

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
        ["placed", "accepted", "preparing", "ready"].includes(order.status),
    );
    const readyOrders = orders.filter(
      (order) => order.status === "ready",
    ).length;
    const kitchenQueue = orders.filter((order) =>
      ["placed", "accepted", "preparing"].includes(order.status),
    ).length;
    const revenue = orders.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0,
    );

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
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Compact High-Density Operational KPI Bar */}
        <section className="grid gap-3.5 grid-cols-2 md:grid-cols-5">
          {[
            {
              label: "Active Orders",
              value: metrics.activeOrders,
              icon: <UtensilsCrossed className="h-4 w-4 text-white" />,
              iconBg: "bg-amber-500 shadow-xs",
              cardBg: "bg-[#FFF9EE] border-amber-200/90",
              textColor: "text-amber-950",
              labelColor: "text-amber-800",
            },
            {
              label: "Kitchen Queue",
              value: metrics.kitchenQueue,
              icon: <ChefHat className="h-4 w-4 text-white" />,
              iconBg: "bg-indigo-600 shadow-xs",
              cardBg: "bg-[#F2F5FF] border-indigo-200/90",
              textColor: "text-indigo-950",
              labelColor: "text-indigo-800",
            },
            {
              label: "Ready to Serve",
              value: metrics.readyOrders,
              icon: <LayoutGrid className="h-4 w-4 text-white" />,
              iconBg: "bg-emerald-600 shadow-xs",
              cardBg: "bg-[#F2FBF7] border-emerald-200/90",
              textColor: "text-emerald-950",
              labelColor: "text-emerald-800",
            },
            {
              label: "Active Tables",
              value: sessions.length,
              icon: <CreditCard className="h-4 w-4 text-white" />,
              iconBg: "bg-purple-600 shadow-xs",
              cardBg: "bg-[#FAF5FF] border-purple-200/90",
              textColor: "text-purple-950",
              labelColor: "text-purple-800",
            },
            {
              label: "Tracked Revenue",
              value: formatCurrency(metrics.revenue, currency),
              icon: <Users className="h-4 w-4 text-white" />,
              iconBg: "bg-teal-600 shadow-xs",
              cardBg: "bg-[#F0FDF9] border-teal-200/90",
              textColor: "text-teal-950",
              labelColor: "text-teal-800",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className={`rounded-xl border p-4 shadow-xs transition-all hover:shadow-sm ${metric.cardBg}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${metric.labelColor}`}>{metric.label}</span>
                <div className={`p-1.5 rounded-lg ${metric.iconBg}`}>
                  {metric.icon}
                </div>
              </div>
              <p className={`mt-2 text-2xl font-black tracking-tight font-mono ${metric.textColor}`}>
                {metric.value}
              </p>
            </div>
          ))}
        </section>

        {loading ? (
          <div className="rounded-xl border border-slate-200/80 bg-white px-6 py-12 text-center text-slate-500 shadow-xs my-4">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Syncing live operations...</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 my-4 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <p className="text-xs font-medium">{error}</p>
          </div>
        ) : null}

        {/* Global Search Bar */}
        <div className="relative my-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600/80" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active orders, table #, customer name, phone, or menu items..."
            className="w-full h-11 pl-11 pr-12 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-slate-400 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 text-xs font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tab navigation */}
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-[#F8F9FA] p-1.5 shadow-xs my-4">
          <div className="flex flex-wrap items-center gap-1">
            {[
              {
                id: "live" as const,
                label: "Live Operations",
                icon: <UtensilsCrossed className="h-4 w-4 text-amber-600" />,
              },
              {
                id: "history" as const,
                label: "History & Records",
                icon: <History className="h-4 w-4 text-slate-600" />,
              },
              {
                id: "menu" as const,
                label: "Tables & Menu",
                icon: <LayoutGrid className="h-4 w-4 text-slate-600" />,
              },
              {
                id: "staff" as const,
                label: "Staff Access",
                icon: <Users className="h-4 w-4 text-slate-600" />,
              },
              {
                id: "payment" as const,
                label: "Payment & Settings",
                icon: <QrCode className="h-4 w-4 text-slate-600" />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-white text-amber-950 shadow-xs border border-amber-200/90 ring-1 ring-amber-500/10"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === "live" && metrics.activeOrders > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-1.5 text-[10px] font-bold">
                    {metrics.activeOrders}
                  </span>
                )}
                {tab.id === "history" && historySessions.length > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 text-[10px] font-bold">
                    {historySessions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <NotificationCenter restaurantId={restaurantId} role={userRole} />
            {activeTab === "live" && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">Filter:</span>
                {(["all", "placed", "preparing", "ready"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setOrderStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition cursor-pointer ${
                      orderStatusFilter === status
                        ? "bg-amber-50 text-amber-900 shadow-xs border border-amber-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => void loadAll(true)}
              className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-all cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </nav>

        {/* ═══════════ LIVE TAB — orders + active sessions ═══════════ */}
        {activeTab === "live" && (() => {
          const displayOrders = orders.filter((o) => {
            if (!["placed", "accepted", "preparing", "ready"].includes(o.status)) return false;
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
            <section className="grid gap-4 xl:grid-cols-3">
              {displayOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs text-slate-800 hover:border-amber-300/80 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Table
                  </p>
                  <h2 className="mt-0.5 text-xl font-black text-slate-900 font-mono">
                    {order.table?.table_number ?? "Unknown"}
                  </h2>
                </div>
                <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${SESSION_STATUS_BADGE[order.status] || "bg-amber-50 text-amber-800 border-amber-200"}`}>
                  {order.status}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {order.items.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs text-slate-700 font-medium"
                  >
                    <span>{item.name}</span>
                    <span className="font-mono font-bold text-slate-900">x{item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {formatCurrency(order.total_amount, currency)}
                </span>
              </div>
            </article>
          ))}
          {!loading && !orders.length ? (
            <div className="col-span-full rounded-2xl border border-dashed border-amber-200 bg-gradient-to-b from-[#FFFDF9] to-white px-6 py-12 text-center shadow-xs">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 border border-amber-200">
                <UtensilsCrossed size={22} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Active Kitchen Orders</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                New orders placed by dining guests or waitstaff will arrive here in real time.
              </p>
            </div>
          ) : null}
        </section>

        {/* ============================================================= */}
        {/* LIVE TABLES — session cards with payment + close controls      */}
        {/* ============================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Live Tables & Sessions
              </h2>
              <p className="text-xs text-slate-500">Active dining tables and pending settlements</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            {sessions.map((session) => {
              const latestOrder = session.orders[session.orders.length - 1];
              const latestStatus = latestOrder?.status ?? "—";
              const isForceConfirm = confirmForceClose === session.id;
              const isUnpaidConfirm = confirmUnpaidClose === session.id;
              const isUnpaid = session.payment_status !== "paid";

              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs text-slate-800"
                >
                  {/* Session header */}
                  <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-amber-50/30 -m-5 mb-4 p-4 border-b border-slate-100 rounded-t-xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold font-mono text-slate-900">
                          {session.table?.table_number ?? "Table"}
                        </span>
                        {session.customer_name && (
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {session.customer_name}
                          </span>
                        )}
                      </div>
                      {session.customer_phone && (
                        <p className="mt-1 text-[11px] text-slate-400 font-mono">
                          {session.customer_phone}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        {session.payment_status === "paid" ? (
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Paid ✓
                          </span>
                        ) : (
                          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            Dining Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {timeAgo(session.opened_at)}
                      </span>
                    </div>
                  </div>

                  {/* Session metrics */}
                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Orders
                      </p>
                      <p className="mt-0.5 text-base font-bold text-slate-900 font-mono">
                        {session.order_count}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Total
                      </p>
                      <p className="mt-0.5 text-base font-bold text-amber-700 font-mono">
                        {formatCurrency(session.session_total, currency)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Latest
                      </p>
                      <p
                        className={`mt-0.5 text-xs font-semibold ${SESSION_STATUS_BADGE[latestStatus]?.split(" ").find((c: string) => c.startsWith("text-")) ?? "text-slate-700"}`}
                      >
                        {latestStatus}
                      </p>
                    </div>
                  </div>

                  {/* Order breakdown */}
                  <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                    {session.orders.map((order, idx) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">
                              Order {idx + 1}
                            </span>
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${SESSION_STATUS_BADGE[order.status] ?? "bg-amber-50 text-amber-800 border-amber-200"}`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 font-mono">
                            {formatCurrency(order.total_amount, currency)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs text-slate-600"
                            >
                              <span>
                                {item.name}{" "}
                                <span className="font-mono text-slate-800 font-medium">
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
                    <div className="mt-4 border-t border-slate-100 pt-4 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-mono font-medium text-slate-800">{formatCurrency(session.bill.subtotal, currency)}</span>
                      </div>
                      {Number(session.bill.discount_amount) > 0 && (
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>Discount ({session.bill.discount_type === "percentage" ? `${session.bill.discount_value}%` : "flat"}):</span>
                          <span className="font-mono">-{formatCurrency(session.bill.discount_amount, currency)}</span>
                        </div>
                      )}
                      {session.bill.discount_reason && (
                        <div className="text-[10px] text-slate-400 italic">Reason: {session.bill.discount_reason}</div>
                      )}
                      <div className="flex justify-between">
                        <span>Taxes (5% GST):</span>
                        <span className="font-mono font-medium text-slate-800">{formatCurrency(session.bill.tax_amount, currency)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
                        <span>Grand Total Paid:</span>
                        <span className="text-emerald-700 font-mono">{formatCurrency(session.bill.grand_total, currency)}</span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => openThermalReceipt(session)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition cursor-pointer"
                        >
                          <Printer size={13} /> Print 80mm Receipt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                      {/* Discount Input Form */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-semibold">Billing Discount</span>
                          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => updateDiscount(session.id, "type", "percentage")}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border-0 cursor-pointer ${
                                getSessionDiscount(session.id).type === "percentage"
                                  ? "bg-slate-900 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
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
                                  ? "bg-slate-900 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
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
                            className="col-span-1 h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
                          />
                          <input
                            type="text"
                            placeholder="Reason (e.g. Promo, Staff)"
                            value={getSessionDiscount(session.id).reason}
                            onChange={(e) => updateDiscount(session.id, "reason", e.target.value)}
                            className="col-span-2 h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
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
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 space-y-1.5 font-medium">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span className="font-mono text-slate-800">{formatCurrency(session.session_total, currency)}</span>
                            </div>
                            {discAmt > 0 && (
                              <div className="flex justify-between text-emerald-700">
                                <span>Discount ({discObj.type === "percentage" ? `${discObj.value}%` : "flat"}):</span>
                                <span className="font-mono">-{formatCurrency(discAmt, currency)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>Taxes ({taxRate}% {taxLabel}):</span>
                              <span className="font-mono text-slate-800">{formatCurrency(tax, currency)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200/80 pt-1.5 text-sm font-bold text-slate-900">
                              <span>Estimated Payable:</span>
                              <span className="text-slate-900 font-mono">{formatCurrency(totalPayable, currency)}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Payment Method & Settle Action */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-500">Method:</span>
                          <select
                            value={getSessionPaymentMethod(session.id)}
                            onChange={(e) => updatePaymentMethod(session.id, e.target.value as any)}
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
                          >
                            <option value="CASH">CASH</option>
                            <option value="UPI">UPI</option>
                            <option value="CARD">CARD</option>
                            <option value="SPLIT">SPLIT</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          disabled={paymentActionId === session.id}
                          onClick={() => void togglePayment(session.id, "mark_paid")}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} />
                          {paymentActionId === session.id ? "Settling..." : "Mark Paid ✓"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Close Session Controls */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    {isForceConfirm ? (
                      <div className="space-y-2 rounded-xl bg-rose-50 border border-rose-200 p-3">
                        <p className="text-xs text-rose-700 font-medium">
                          This session has active orders that will be <strong>cancelled</strong>. Are you sure?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={closingSessionId === session.id}
                            onClick={() => void closeSession(session.id, true)}
                            className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1 text-xs font-semibold text-white shadow-xs"
                          >
                            {closingSessionId === session.id ? "Closing..." : "Yes, force close"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmForceClose(null)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isUnpaidConfirm ? (
                      <div className="space-y-2 rounded-xl bg-rose-50 border border-rose-200 p-3">
                        <p className="text-xs text-rose-700 font-medium">
                          This session is <strong>unpaid</strong> ({formatCurrency(session.session_total, currency)}). Close without collecting payment?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={closingSessionId === session.id}
                            onClick={() => {
                              setConfirmUnpaidClose(null);
                              void closeSession(session.id, false);
                            }}
                            className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1 text-xs font-semibold text-white shadow-xs"
                          >
                            {closingSessionId === session.id ? "Closing..." : "Yes, close unpaid"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmUnpaidClose(null)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          {session.all_orders_terminal ? (
                            <p className="text-xs text-emerald-700 font-medium">
                              All orders complete — ready to close
                            </p>
                          ) : (
                            <p className="text-xs text-amber-700 font-medium">
                              Has active orders — requires confirmation
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
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                            session.all_orders_terminal
                              ? "bg-slate-900 hover:bg-slate-800 text-white"
                              : "border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
                          }`}
                        >
                          {closingSessionId === session.id ? "Closing..." : "Close Session"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && !sessions.length ? (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-gradient-to-b from-[#F9FBFF] to-white px-6 py-12 text-center shadow-xs">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 border border-blue-200">
                <LayoutGrid size={22} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Active Table Sessions</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                All dining stations are currently available. Active guest check-ins will populate here.
              </p>
            </div>
          ) : null}
        </section>
        </>
        );
        })()}
        {activeTab === "history" && (
          <section className="space-y-5">
            {/* Sales Summary Cards */}
            <div className="grid gap-3.5 grid-cols-2 md:grid-cols-5">
              <div className="rounded-xl border border-teal-200/90 bg-[#F0FDF9] p-4 shadow-xs">
                <p className="text-[10px] uppercase tracking-wider text-teal-800 font-bold">Total Revenue</p>
                <p className="mt-1 text-2xl font-black text-teal-950 font-mono">
                  {formatCurrency(historyMetrics.totalRevenue || 0, currency)}
                </p>
                <p className="mt-0.5 text-[10px] text-teal-700/80 font-medium">Settled Invoices</p>
              </div>

              <div className="rounded-xl border border-amber-200/90 bg-[#FFF9EE] p-4 shadow-xs">
                <p className="text-[10px] uppercase tracking-wider text-amber-800 font-bold">Cash Payments</p>
                <p className="mt-1 text-xl font-black text-amber-950 font-mono">
                  {formatCurrency(historyMetrics.totalCash || 0, currency)}
                </p>
                <p className="mt-0.5 text-[10px] text-amber-700/80 font-medium">Cash Register</p>
              </div>

              <div className="rounded-xl border border-cyan-200/90 bg-[#F0F9FF] p-4 shadow-xs">
                <p className="text-[10px] uppercase tracking-wider text-cyan-800 font-bold">UPI / QR Payments</p>
                <p className="mt-1 text-xl font-black text-cyan-950 font-mono">
                  {formatCurrency(historyMetrics.totalUPI || 0, currency)}
                </p>
                <p className="mt-0.5 text-[10px] text-cyan-700/80 font-medium">Direct Bank Transfer</p>
              </div>

              <div className="rounded-xl border border-violet-200/90 bg-[#FAF5FF] p-4 shadow-xs">
                <p className="text-[10px] uppercase tracking-wider text-violet-800 font-bold">Card Payments</p>
                <p className="mt-1 text-xl font-black text-violet-950 font-mono">
                  {formatCurrency(historyMetrics.totalCard || 0, currency)}
                </p>
                <p className="mt-0.5 text-[10px] text-violet-700/80 font-medium">POS Terminal</p>
              </div>

              <div className="rounded-xl border border-emerald-200/90 bg-[#F2FBF7] p-4 shadow-xs">
                <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold">Tips Collected</p>
                <p className="mt-1 text-xl font-black text-emerald-950 font-mono">
                  {formatCurrency(historyMetrics.totalTips || 0, currency)}
                </p>
                <p className="mt-0.5 text-[10px] text-emerald-700/80 font-medium">Staff Gratuity</p>
              </div>
            </div>

            {/* History Table Container */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <History size={16} className="text-slate-600" />
                    Session & Invoice History Archive
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View completed customer sessions, payment logs, and re-print receipt tax invoices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadHistory(searchQuery)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-xs cursor-pointer"
                >
                  Refresh History
                </button>
              </div>

              {historyLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2 text-amber-500" />
                  Fetching historical session archives...
                </div>
              ) : historyError ? (
                <div className="py-8 text-center text-xs text-rose-600 font-medium">
                  {historyError}
                </div>
              ) : historySessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No session history records found. Completed sessions will be archived here.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] uppercase text-slate-500 font-bold">
                        <th className="py-3 px-3">Table / Customer</th>
                        <th className="py-3 px-3">Opened / Settled</th>
                        <th className="py-3 px-3">Orders & Items</th>
                        <th className="py-3 px-3">Payment Mode</th>
                        <th className="py-3 px-3 text-right">Grand Total</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historySessions.map((session) => (
                        <tr key={session.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">
                              Table #{session.table?.table_number || "Walk-in"}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {session.customer_name || "Guest Customer"}{" "}
                              {session.customer_phone ? `(${session.customer_phone})` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="text-slate-700">{timeAgo(session.opened_at)}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {session.paid_at ? `Paid ${timeAgo(session.paid_at)}` : session.status}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">
                              {session.order_count} Orders ({session.orders?.reduce((acc: number, o: any) => acc + (o.items?.length || 0), 0) || 0} Items)
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">
                              {session.orders?.flatMap((o: any) => o.items?.map((i: any) => i.name)).join(", ")}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-slate-100 text-slate-800 border-slate-200">
                              {session.payment_method || session.bill?.payment_method || "CASH"}
                            </span>
                            {session.tip_amount > 0 && (
                              <div className="text-[10px] text-emerald-700 font-bold mt-1">
                                +₹{session.tip_amount} Tip
                              </div>
                            )}
                            {session.customer_utr && (
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                UTR: {session.customer_utr}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                            {formatCurrency(session.bill?.grand_total || session.session_total || 0, currency)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => openThermalReceipt(session)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
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
        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Floor Layout
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900 tracking-tight">
                  Dining Tables & QRs
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void generateQrs()}
                disabled={busyKey === "tables:qrs" || !tables.length}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
              />
              <button
                type="submit"
                disabled={busyKey === "table:create"}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-xs"
              >
                {busyKey === "table:create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add Table
              </button>
            </form>

            <div className="mt-4 space-y-2">
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
                    className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 font-mono">
                        {table.table_number}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400 font-mono">
                        Token: {table.table_token.slice(0, 8)}...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteTable(table.id)}
                      disabled={busyKey === `table:${table.id}`}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors border-0 cursor-pointer"
                      title="Delete Table"
                    >
                      {busyKey === `table:${table.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Menu Management
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900 tracking-tight">
                Categories & Menu Items
              </h2>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <form
                onSubmit={createCategory}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3"
              >
                <label className="text-xs font-bold text-slate-800">
                  Add Category
                </label>
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="e.g. Starters, Main Course"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-amber-500 placeholder:text-slate-400 shadow-xs"
                />
                <button
                  type="submit"
                  disabled={busyKey === "category:create"}
                  className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 shadow-xs"
                >
                  Create Category
                </button>
              </form>

              <form
                onSubmit={createItem}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2.5"
              >
                <label className="text-xs font-bold text-slate-800">
                  Add Menu Item
                </label>
                <select
                  value={itemForm.category_id}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      category_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-amber-500 shadow-xs"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
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
                  placeholder="e.g. Paneer Tikka"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-amber-500 placeholder:text-slate-400 shadow-xs"
                />
                <input
                  value={itemForm.description}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Description / ingredients"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-amber-500 placeholder:text-slate-400 shadow-xs"
                />
                <div className="flex gap-2">
                  <input
                    value={itemForm.price}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    placeholder="Price (₹)"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-amber-500 placeholder:text-slate-400 shadow-xs"
                  />
                  <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs">
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
                  className="w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 shadow-xs cursor-pointer"
                >
                  Add Item
                </button>
              </form>
            </div>
            <div className="mt-5 space-y-3">
              {groupedMenu.map((category) => (
                <div
                  key={category.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {category.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {category.items.length} items
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyKey === `category:${category.id}`}
                      onClick={() =>
                        void deleteMenuEntity("category", category.id)
                      }
                      className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200/80 bg-white px-3.5 py-3 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {item.description || "No description."}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-900 font-mono">
                              {formatCurrency(item.price, currency)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busyKey === `item:toggle:${item.id}`}
                              onClick={() => void toggleItemAvailability(item)}
                              className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase transition disabled:opacity-60 cursor-pointer shadow-xs ${
                                item.is_available
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.is_available ? "Available" : "Hidden"}
                            </button>
                            <button
                              type="button"
                              disabled={busyKey === `item:${item.id}`}
                              onClick={() =>
                                void deleteMenuEntity("item", item.id)
                              }
                              className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-60 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!category.items.length ? (
                      <p className="text-xs text-slate-400">
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
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Staff Management
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900 tracking-tight">
                Kitchen & Waiter Operations Access
              </h2>
            </div>
          </div>
          <form
            onSubmit={createStaff}
            className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_140px]"
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
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-amber-500 placeholder:text-slate-400 shadow-xs"
            />
            <select
              value={staffForm.role}
              onChange={(event) =>
                setStaffForm((current) => ({
                  ...current,
                  role: event.target.value as "kitchen" | "waiter",
                }))
              }
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-amber-500 shadow-xs"
            >
              <option value="kitchen">
                Kitchen Staff
              </option>
              <option value="waiter">
                Floor Waiter
              </option>
            </select>
            <button
              type="submit"
              disabled={busyKey === "staff:create"}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              Add Staff
            </button>
          </form>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {staff.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {member.name}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      {member.role}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyKey === `staff:${member.id}`}
                    onClick={() => void deleteStaff(member.id)}
                    className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-60 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 space-y-2 rounded-lg border border-slate-200/80 bg-white p-3 text-xs text-slate-700 shadow-xs">
                  <p className="font-mono text-[11px] text-slate-500 truncate">
                    /staff/ops?role={member.role}&restaurant_id={restaurantId}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyAccessLink(member)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Access Link
                  </button>
                </div>
              </div>
            ))}
            {!staff.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-slate-400 text-xs md:col-span-2 xl:col-span-3">
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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-900 shadow-lg transition-all">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
