"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Layers,
  Scale,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Edit3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  UtensilsCrossed,
  DollarSign,
  X,
  RefreshCw,
  TrendingDown,
  ShoppingBag,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  current_stock: number;
  min_stock_alert: number;
  cost_per_unit: number;
  supplier_name: string | null;
  is_low_stock: boolean;
  total_valuation: number;
  created_at: string;
}

interface StockMovement {
  id: string;
  inventory_item_id: string;
  order_id: string | null;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  actor_name: string;
  notes: string | null;
  created_at: string;
  restaurant_inventory_items?: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id?: string;
  is_available: boolean;
}

interface RecipeBOMGroup {
  menu_item_id: string;
  menu_item_name: string;
  menu_item_price: number;
  estimated_cogs: number;
  ingredients: Array<{
    id: string;
    inventory_item_id: string;
    inventory_item_name: string;
    quantity_consumed: number;
    unit: string;
    cost_per_unit: number;
    ingredient_cost: number;
    notes: string | null;
  }>;
}

interface Props {
  restaurantId: string;
  tenantId?: string;
  currency?: string;
  userRole?: string;
}

export function InventoryManagementWorkspace({
  restaurantId,
  tenantId,
  currency = "INR",
  userRole = "admin",
}: Props) {
  const [activeTab, setActiveTab] = useState<"items" | "recipes" | "ledger">("items");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    lowStockCount: 0,
    totalInventoryValuation: 0,
  });
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [recipeGroups, setRecipeGroups] = useState<RecipeBOMGroup[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modals state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isWastageOpen, setIsWastageOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<InventoryItem | null>(null);

  // Forms state
  const [itemForm, setItemForm] = useState({
    id: "",
    name: "",
    sku: "",
    category: "produce",
    unit: "kg",
    current_stock: "0",
    min_stock_alert: "5",
    cost_per_unit: "0",
    supplier_name: "",
  });

  const [stockInForm, setStockInForm] = useState({
    quantity: "",
    notes: "",
  });

  const [wastageForm, setWastageForm] = useState({
    quantity: "",
    reason: "spoilage",
    notes: "",
  });

  const [recipeForm, setRecipeForm] = useState<{
    menu_item_id: string;
    ingredients: Array<{
      inventory_item_id: string;
      quantity_consumed: string;
      unit: string;
      notes: string;
    }>;
  }>({
    menu_item_id: "",
    ingredients: [],
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(amt || 0);
  };

  // Helper fetch with headers
  const authedFetch = useCallback(
    (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      if (tenantId) headers.set("x-tenant-id", tenantId);
      if (restaurantId && restaurantId !== "default") headers.set("x-restaurant-id", restaurantId);
      
      const parsedUrl = new URL(url, window.location.origin);
      if (tenantId && !parsedUrl.searchParams.has("tenant_id")) parsedUrl.searchParams.set("tenant_id", tenantId);
      if (restaurantId && !parsedUrl.searchParams.has("restaurant_id")) parsedUrl.searchParams.set("restaurant_id", restaurantId);

      return fetch(parsedUrl.toString(), {
        ...options,
        headers,
      });
    },
    [tenantId, restaurantId]
  );

  // Load Inventory Items
  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authedFetch("/api/client/restaurant/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (e) {
      console.error("Failed to load inventory:", e);
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  // Load Movements
  const loadMovements = useCallback(async () => {
    try {
      const res = await authedFetch("/api/client/restaurant/inventory/movement?limit=50");
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
      }
    } catch (e) {
      console.error("Failed to load movements:", e);
    }
  }, [authedFetch]);

  // Load Recipes & Menu Items
  const loadRecipesAndMenu = useCallback(async () => {
    try {
      const [recRes, menuRes] = await Promise.all([
        authedFetch("/api/client/restaurant/inventory/recipes"),
        authedFetch("/api/client/restaurant/menu"),
      ]);

      if (recRes.ok) {
        const recData = await recRes.json();
        setRecipeGroups(recData.recipes || []);
      }

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        const itemsList: MenuItem[] = [];
        if (Array.isArray(menuData.categories)) {
          for (const cat of menuData.categories) {
            if (Array.isArray(cat.menu_items)) {
              itemsList.push(...cat.menu_items);
            }
          }
        }
        setMenuItems(itemsList);
      }
    } catch (e) {
      console.error("Failed to load recipes/menu:", e);
    }
  }, [authedFetch]);

  useEffect(() => {
    loadInventory();
    loadMovements();
    loadRecipesAndMenu();
  }, [loadInventory, loadMovements, loadRecipesAndMenu]);

  // Filtered Inventory items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (onlyLowStock && !item.is_low_stock) return false;
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSku = item.sku?.toLowerCase().includes(q);
        const matchesSupplier = item.supplier_name?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesSupplier) return false;
      }
      return true;
    });
  }, [items, selectedCategory, onlyLowStock, searchQuery]);

  // Handle Save Raw Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await authedFetch("/api/client/restaurant/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemForm.id || undefined,
          name: itemForm.name,
          sku: itemForm.sku || null,
          category: itemForm.category,
          unit: itemForm.unit,
          current_stock: parseFloat(itemForm.current_stock) || 0,
          min_stock_alert: parseFloat(itemForm.min_stock_alert) || 5,
          cost_per_unit: parseFloat(itemForm.cost_per_unit) || 0,
          supplier_name: itemForm.supplier_name || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save item");

      setStatusMessage({ type: "success", text: "Raw material saved successfully!" });
      setIsAddItemOpen(false);
      setItemForm({
        id: "",
        name: "",
        sku: "",
        category: "produce",
        unit: "kg",
        current_stock: "0",
        min_stock_alert: "5",
        cost_per_unit: "0",
        supplier_name: "",
      });
      loadInventory();
      loadMovements();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Stock In
  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAction) return;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await authedFetch("/api/client/restaurant/inventory/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_item_id: selectedItemForAction.id,
          movement_type: "purchase_in",
          quantity: parseFloat(stockInForm.quantity),
          actor_name: userRole === "admin" ? "Restaurant Owner" : "Manager",
          notes: stockInForm.notes || "Purchase stock addition",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record stock in");

      setStatusMessage({ type: "success", text: `Added ${stockInForm.quantity} ${selectedItemForAction.unit} to ${selectedItemForAction.name}!` });
      setIsStockInOpen(false);
      setStockInForm({ quantity: "", notes: "" });
      setSelectedItemForAction(null);
      loadInventory();
      loadMovements();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to stock in" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Log Wastage
  const handleWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAction) return;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await authedFetch("/api/client/restaurant/inventory/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_item_id: selectedItemForAction.id,
          movement_type: "wastage_spoilage",
          quantity: parseFloat(wastageForm.quantity),
          actor_name: userRole === "admin" ? "Restaurant Owner" : "Kitchen Chef",
          notes: `[${wastageForm.reason.toUpperCase()}] ${wastageForm.notes || "Wastage registered"}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log wastage");

      setStatusMessage({ type: "success", text: `Logged wastage of ${wastageForm.quantity} ${selectedItemForAction.unit} for ${selectedItemForAction.name}.` });
      setIsWastageOpen(false);
      setWastageForm({ quantity: "", reason: "spoilage", notes: "" });
      setSelectedItemForAction(null);
      loadInventory();
      loadMovements();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to log wastage" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Save Recipe
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeForm.menu_item_id) {
      setStatusMessage({ type: "error", text: "Please select a menu dish" });
      return;
    }
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const formattedIngredients = recipeForm.ingredients
        .filter((ing) => ing.inventory_item_id && parseFloat(ing.quantity_consumed) > 0)
        .map((ing) => ({
          inventory_item_id: ing.inventory_item_id,
          quantity_consumed: parseFloat(ing.quantity_consumed),
          unit: ing.unit,
          notes: ing.notes || null,
        }));

      const res = await authedFetch("/api/client/restaurant/inventory/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_item_id: recipeForm.menu_item_id,
          ingredients: formattedIngredients,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save recipe");

      setStatusMessage({ type: "success", text: "Recipe Bill of Materials (BOM) saved!" });
      setIsRecipeModalOpen(false);
      loadRecipesAndMenu();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save recipe" });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Recipe Edit Modal
  const openRecipeEditor = (group?: RecipeBOMGroup) => {
    if (group) {
      setRecipeForm({
        menu_item_id: group.menu_item_id,
        ingredients: group.ingredients.map((ing) => ({
          inventory_item_id: ing.inventory_item_id,
          quantity_consumed: ing.quantity_consumed.toString(),
          unit: ing.unit,
          notes: ing.notes || "",
        })),
      });
    } else {
      setRecipeForm({
        menu_item_id: menuItems[0]?.id || "",
        ingredients: [
          {
            inventory_item_id: items[0]?.id || "",
            quantity_consumed: "0.200",
            unit: items[0]?.unit || "kg",
            notes: "",
          },
        ],
      });
    }
    setIsRecipeModalOpen(true);
  };

  const addIngredientRow = () => {
    const firstItem = items[0];
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          inventory_item_id: firstItem?.id || "",
          quantity_consumed: "0.100",
          unit: firstItem?.unit || "kg",
          notes: "",
        },
      ],
    }));
  };

  const removeIngredientRow = (index: number) => {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const updateIngredientField = (index: number, field: string, val: string) => {
    setRecipeForm((prev) => {
      const updated = [...prev.ingredients];
      if (field === "inventory_item_id") {
        const found = items.find((i) => i.id === val);
        updated[index] = {
          ...updated[index],
          inventory_item_id: val,
          unit: found?.unit || updated[index].unit,
        };
      } else {
        updated[index] = { ...updated[index], [field]: val };
      }
      return { ...prev, ingredients: updated };
    });
  };

  // Calculate live COGS for modal
  const liveCalculatedCOGS = useMemo(() => {
    let total = 0;
    for (const ing of recipeForm.ingredients) {
      const inv = items.find((i) => i.id === ing.inventory_item_id);
      if (inv) {
        const qty = parseFloat(ing.quantity_consumed) || 0;
        total += qty * (inv.cost_per_unit || 0);
      }
    }
    return Math.round(total * 100) / 100;
  }, [recipeForm.ingredients, items]);

  const selectedDishPrice = useMemo(() => {
    const dish = menuItems.find((m) => m.id === recipeForm.menu_item_id);
    return dish?.price || 0;
  }, [recipeForm.menu_item_id, menuItems]);

  const liveGrossMargin = useMemo(() => {
    if (selectedDishPrice <= 0) return 0;
    return Math.round(((selectedDishPrice - liveCalculatedCOGS) / selectedDishPrice) * 100);
  }, [selectedDishPrice, liveCalculatedCOGS]);

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-semibold transition-all shadow-xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Raw Items */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Ingredients</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{summary.totalItems} Items</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tracked in Kitchen Store</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Boxes className="h-6 w-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`rounded-2xl p-5 border shadow-xs flex items-center justify-between transition-all ${
          summary.lowStockCount > 0
            ? "bg-rose-50/70 border-rose-200 text-rose-900"
            : "bg-white border-slate-200/80 text-slate-900"
        }`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${summary.lowStockCount > 0 ? "text-rose-600" : "text-slate-500"}`}>
              Low Stock Alerts
            </p>
            <h3 className={`text-2xl font-black mt-1 ${summary.lowStockCount > 0 ? "text-rose-700" : "text-slate-900"}`}>
              {summary.lowStockCount} Items
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Below re-order threshold</p>
          </div>
          <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${
            summary.lowStockCount > 0
              ? "bg-rose-100 border-rose-300 text-rose-600 animate-pulse"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Total Stock Valuation */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stock Value</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(summary.totalInventoryValuation)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Asset cost in inventory</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Recipes & BOM */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Recipes (BOM)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{recipeGroups.length} Dishes</h3>
            <p className="text-xs text-slate-500 mt-0.5">Auto-deducted on order</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Sub-tabs bar & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab("items")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "items"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Boxes className="h-4 w-4" />
            Raw Materials Stock
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/15 font-bold">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("recipes")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "recipes"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="h-4 w-4" />
            Recipe BOM & Costing
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/15 font-bold">
              {recipeGroups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ledger"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Scale className="h-4 w-4" />
            Stock Movements Ledger
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/15 font-bold">
              {movements.length}
            </span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === "items" && (
            <button
              onClick={() => {
                setItemForm({
                  id: "",
                  name: "",
                  sku: "",
                  category: "produce",
                  unit: "kg",
                  current_stock: "0",
                  min_stock_alert: "5",
                  cost_per_unit: "0",
                  supplier_name: "",
                });
                setIsAddItemOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-xs cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4 text-amber-400" />
              Add Raw Item
            </button>
          )}

          {activeTab === "recipes" && (
            <button
              onClick={() => openRecipeEditor()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-xs cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4 text-amber-400" />
              Configure Dish Recipe
            </button>
          )}

          <button
            onClick={() => {
              loadInventory();
              loadMovements();
              loadRecipesAndMenu();
            }}
            title="Refresh inventory"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: RAW INVENTORY STOCK */}
      {activeTab === "items" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search raw ingredient by name, SKU, or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="all">All Categories</option>
                <option value="dairy">Dairy & Cheese</option>
                <option value="produce">Fresh Produce / Veg</option>
                <option value="meat">Meat & Poultry</option>
                <option value="spices">Spices & Seasoning</option>
                <option value="bakery">Bakery & Flour</option>
                <option value="beverages">Beverages & Syrups</option>
                <option value="oils">Cooking Oils & Ghee</option>
                <option value="packaging">Packaging & Disposables</option>
                <option value="misc">Miscellaneous</option>
              </select>

              <button
                onClick={() => setOnlyLowStock(!onlyLowStock)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  onlyLowStock
                    ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                Low Stock Only
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Raw Ingredient Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Current Stock</th>
                    <th className="py-3 px-3">Alert Threshold</th>
                    <th className="py-3 px-3">Cost / Unit</th>
                    <th className="py-3 px-3">Valuation</th>
                    <th className="py-3 px-3">Stock Status</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Boxes className="h-10 w-10 mx-auto text-slate-300 mb-2 stroke-1" />
                        <p className="font-semibold text-slate-600">No raw inventory items found</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Click &quot;Add Raw Item&quot; to begin tracking kitchen stock and linking recipes.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.supplier_name && <span>• Vendor: {item.supplier_name}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-black text-slate-900 text-sm">
                            {item.current_stock.toFixed(2)}
                          </span>{" "}
                          <span className="text-[11px] font-medium text-slate-500">{item.unit}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-medium">
                          {item.min_stock_alert} {item.unit}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {formatCurrency(item.cost_per_unit)} / {item.unit}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {formatCurrency(item.total_valuation)}
                        </td>
                        <td className="py-3 px-3">
                          {item.is_low_stock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertTriangle className="h-3 w-3" />
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              OPTIMAL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedItemForAction(item);
                                setStockInForm({ quantity: "", notes: "" });
                                setIsStockInOpen(true);
                              }}
                              title="Purchase Stock In"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <ArrowUpRight className="h-3 w-3" />
                              Stock In
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItemForAction(item);
                                setWastageForm({ quantity: "", reason: "spoilage", notes: "" });
                                setIsWastageOpen(true);
                              }}
                              title="Log Spoilage / Wastage"
                              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <ArrowDownRight className="h-3 w-3" />
                              Wastage
                            </button>
                            <button
                              onClick={() => {
                                setItemForm({
                                  id: item.id,
                                  name: item.name,
                                  sku: item.sku || "",
                                  category: item.category,
                                  unit: item.unit,
                                  current_stock: item.current_stock.toString(),
                                  min_stock_alert: item.min_stock_alert.toString(),
                                  cost_per_unit: item.cost_per_unit.toString(),
                                  supplier_name: item.supplier_name || "",
                                });
                                setIsAddItemOpen(true);
                              }}
                              title="Edit Item Details"
                              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECIPE BOM & COGS */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-amber-900">Automatic Recipe Bill of Materials (BOM) Deduction</h4>
              <p className="text-amber-700 mt-0.5">
                Each time an order for a menu item is placed via POS or QR, Trinetra OS automatically calculates
                and deducts the exact raw ingredients from your kitchen stock. Accurate margins and real-time inventory control.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipeGroups.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/80 p-8">
                <UtensilsCrossed className="h-10 w-10 mx-auto text-slate-300 mb-2 stroke-1" />
                <h4 className="font-bold text-slate-700 text-base">No Recipe Mappings Configured</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Map your menu dishes (e.g. Paneer Butter Masala, Burgers, Shakes) to raw inventory ingredients to enable automatic stock deduction.
                </p>
                <button
                  onClick={() => openRecipeEditor()}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4 text-amber-400" />
                  Map First Recipe
                </button>
              </div>
            ) : (
              recipeGroups.map((group) => {
                const margin = group.menu_item_price > 0
                  ? Math.round(((group.menu_item_price - group.estimated_cogs) / group.menu_item_price) * 100)
                  : 0;

                return (
                  <div
                    key={group.menu_item_id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:border-amber-300 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{group.menu_item_name}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Selling Price: <span className="font-bold text-slate-800">{formatCurrency(group.menu_item_price)}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => openRecipeEditor(group)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Edit Recipe BOM"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Margin & COGS Bar */}
                      <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. COGS</span>
                          <span className="font-black text-slate-800">{formatCurrency(group.estimated_cogs)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Margin</span>
                          <span className={`font-black ${margin >= 60 ? "text-emerald-600" : margin >= 40 ? "text-amber-600" : "text-rose-600"}`}>
                            {margin}%
                          </span>
                        </div>
                      </div>

                      {/* Ingredients List */}
                      <div className="mt-4 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Ingredients Consumed:
                        </span>
                        {group.ingredients.map((ing) => (
                          <div
                            key={ing.id}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50/50"
                          >
                            <span className="text-slate-700 font-medium">{ing.inventory_item_name}</span>
                            <span className="font-mono text-[11px] text-slate-600 font-bold">
                              {ing.quantity_consumed} {ing.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {group.ingredients.length} raw ingredients
                      </span>
                      <button
                        onClick={() => openRecipeEditor(group)}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                      >
                        Adjust Recipe →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STOCK MOVEMENTS LEDGER */}
      {activeTab === "ledger" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Stock Movement Audit Trail</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Every purchase, order consumption, wastage, and adjustment logged chronologically.
              </p>
            </div>
            <button
              onClick={() => loadMovements()}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">Raw Material</th>
                  <th className="py-3 px-3">Movement Type</th>
                  <th className="py-3 px-3">Change (Qty)</th>
                  <th className="py-3 px-3">Prev → New Stock</th>
                  <th className="py-3 px-3">User / Actor</th>
                  <th className="py-3 px-4">Notes / Order Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Scale className="h-8 w-8 mx-auto text-slate-300 mb-2 stroke-1" />
                      <p className="font-semibold text-slate-600">No stock movements recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  movements.map((mov) => {
                    const isPositive = mov.quantity > 0;
                    const itemName = mov.restaurant_inventory_items?.name || "Raw Item";
                    const itemUnit = mov.restaurant_inventory_items?.unit || "";

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                          {new Date(mov.created_at).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">{itemName}</td>
                        <td className="py-3 px-3">
                          {mov.movement_type === "purchase_in" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800">
                              <ArrowUpRight className="h-3 w-3" /> PURCHASE IN
                            </span>
                          )}
                          {mov.movement_type === "order_consumption" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800">
                              <ShoppingBag className="h-3 w-3" /> AUTO DEDUCTED
                            </span>
                          )}
                          {mov.movement_type === "wastage_spoilage" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800">
                              <TrendingDown className="h-3 w-3" /> WASTAGE
                            </span>
                          )}
                          {mov.movement_type === "manual_adjustment" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-800">
                              <RotateCcw className="h-3 w-3" /> MANUAL ADJUST
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                            {isPositive ? `+${mov.quantity}` : `${mov.quantity}`} {itemUnit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {mov.previous_stock} → <span className="font-bold text-slate-900">{mov.new_stock}</span> {itemUnit}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{mov.actor_name}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{mov.notes || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT RAW MATERIAL */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {itemForm.id ? "Edit Raw Material" : "Add New Raw Material"}
              </h3>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amul Fresh Paneer, Fresh Tomatoes"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="dairy">Dairy & Cheese</option>
                    <option value="produce">Fresh Produce / Veg</option>
                    <option value="meat">Meat & Poultry</option>
                    <option value="spices">Spices & Seasoning</option>
                    <option value="bakery">Bakery & Flour</option>
                    <option value="beverages">Beverages & Syrups</option>
                    <option value="oils">Cooking Oils & Ghee</option>
                    <option value="packaging">Packaging & Disposables</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Liter (l)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="box">Box / Packet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.current_stock}
                    onChange={(e) => setItemForm({ ...itemForm, current_stock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Min Alert
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.min_stock_alert}
                    onChange={(e) => setItemForm({ ...itemForm, min_stock_alert: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Cost / Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.cost_per_unit}
                    onChange={(e) => setItemForm({ ...itemForm, cost_per_unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    SKU / Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RAW-PAN-01"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Wholesale"
                    value={itemForm.supplier_name}
                    onChange={(e) => setItemForm({ ...itemForm, supplier_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : itemForm.id ? "Update Raw Item" : "Create Raw Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK STOCK IN (PURCHASE) */}
      {isStockInOpen && selectedItemForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Purchase Stock In</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Item: <span className="font-bold text-slate-800">{selectedItemForAction.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsStockInOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStockIn} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Stock Level:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedItemForAction.current_stock} {selectedItemForAction.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Quantity to Add ({selectedItemForAction.unit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  placeholder={`e.g. 5 ${selectedItemForAction.unit}`}
                  value={stockInForm.quantity}
                  onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Purchase Invoice / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Invoice #4812 from Local Dairy"
                  value={stockInForm.notes}
                  onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStockInOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Confirm Stock In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG WASTAGE / SPOILAGE */}
      {isWastageOpen && selectedItemForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Log Wastage / Spoilage</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Item: <span className="font-bold text-slate-800">{selectedItemForAction.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsWastageOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleWastage} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Available Stock:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedItemForAction.current_stock} {selectedItemForAction.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Wastage Reason *
                </label>
                <select
                  value={wastageForm.reason}
                  onChange={(e) => setWastageForm({ ...wastageForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="spoilage">Expired / Spoiled</option>
                  <option value="burnt">Burnt during cooking</option>
                  <option value="spilled">Spilled / Dropped</option>
                  <option value="prep_loss">Prep trimming / Peeling loss</option>
                  <option value="other">Other reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Quantity Lost ({selectedItemForAction.unit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={selectedItemForAction.current_stock}
                  required
                  placeholder={`e.g. 0.500 ${selectedItemForAction.unit}`}
                  value={wastageForm.quantity}
                  onChange={(e) => setWastageForm({ ...wastageForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Freezer power outage incident"
                  value={wastageForm.notes}
                  onChange={(e) => setWastageForm({ ...wastageForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWastageOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Deduct Wastage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECIPE BOM EDITOR */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Configure Recipe (BOM)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specify raw ingredients consumed whenever this dish is ordered.
                </p>
              </div>
              <button
                onClick={() => setIsRecipeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target Menu Dish *
                </label>
                <select
                  value={recipeForm.menu_item_id}
                  onChange={(e) => setRecipeForm({ ...recipeForm, menu_item_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="" disabled>Select a dish from menu...</option>
                  {menuItems.map((dish) => (
                    <option key={dish.id} value={dish.id}>
                      {dish.name} — {formatCurrency(dish.price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time COGS Preview Banner */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Selling Price</span>
                  <p className="font-black text-slate-900">{formatCurrency(selectedDishPrice)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Calculated COGS</span>
                  <p className="font-black text-amber-700">{formatCurrency(liveCalculatedCOGS)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Gross Margin</span>
                  <p className={`font-black ${liveGrossMargin >= 50 ? "text-emerald-600" : "text-amber-600"}`}>
                    {liveGrossMargin}%
                  </p>
                </div>
              </div>

              {/* Ingredient Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Raw Ingredients Consumed:
                  </label>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Ingredient
                  </button>
                </div>

                {recipeForm.ingredients.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No ingredients added yet. Click &quot;Add Ingredient&quot; above.
                  </p>
                ) : (
                  recipeForm.ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-5">
                        <select
                          value={ing.inventory_item_id}
                          onChange={(e) => updateIngredientField(idx, "inventory_item_id", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                        >
                          <option value="" disabled>Select raw material...</option>
                          {items.map((raw) => (
                            <option key={raw.id} value={raw.id}>
                              {raw.name} ({raw.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          required
                          placeholder="Qty"
                          value={ing.quantity_consumed}
                          onChange={(e) => updateIngredientField(idx, "quantity_consumed", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                        />
                      </div>

                      <div className="col-span-3 text-[11px] font-mono text-slate-500 font-bold truncate">
                        {ing.unit}
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Recipe BOM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
