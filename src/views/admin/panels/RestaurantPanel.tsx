"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Building2, Plus, Search, CheckCircle2, DollarSign, 
  ExternalLink 
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface RestaurantInsight {
  id: string;
  tenantId: string;
  businessName: string;
  address: string | null;
  currency: string;
  isActive: boolean;
  tenantName: string;
  plan: string;
  status: string;
  createdAt: string;
  tableCount: number;
  activeSessions: number;
  totalOrders: number;
  totalRevenue: number;
}

export default function RestaurantPanel() {
  const { success, error: toastError } = useToast();
  const [restaurants, setRestaurants] = useState<RestaurantInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Onboarding Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState({
    restaurant_name: "",
    owner_name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    plan: "pro"
  });

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/restaurant-insights");
      const data = await res.json();
      if (data.success && Array.isArray(data.insights)) {
        setRestaurants(data.insights);
      } else {
        toastError("Failed to fetch restaurants", data.error || "Unknown error");
      }
    } catch (err: any) {
      toastError("API connection error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  const filtered = useMemo(() => {
    let r = restaurants;
    if (filterStatus !== "all") {
      r = r.filter(x => x.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        x.businessName.toLowerCase().includes(q) ||
        x.tenantName.toLowerCase().includes(q) ||
        x.address?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [restaurants, search, filterStatus]);

  const stats = useMemo(() => {
    const total = restaurants.length;
    const active = restaurants.filter(x => x.isActive && x.status === "active").length;
    const totalSales = restaurants.reduce((sum, r) => sum + r.totalRevenue, 0);
    // Standard subscription fee mappings: starter = 1999, pro = 2999, enterprise = 8999
    const mrr = restaurants.reduce((sum, r) => {
      if (r.status !== "active") return sum;
      if (r.plan === "enterprise") return sum + 8999;
      if (r.plan === "starter") return sum + 1999;
      return sum + 2999;
    }, 0);

    return { total, active, totalSales, mrr };
  }, [restaurants]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      const res = await fetch("/api/v1/admin/onboard-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        success("SaaS Activation Success", `${formData.restaurant_name} onboarded! Default tables and menus seeded.`);
        setModalOpen(false);
        setFormData({
          restaurant_name: "",
          owner_name: "",
          email: "",
          password: "",
          phone: "",
          address: "",
          plan: "pro"
        });
        loadRestaurants();
      } else {
        toastError("Onboarding Failed", data.error || "Please verify credentials.");
      }
    } catch (err: any) {
      toastError("Onboarding Exception", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string, businessName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${businessName}"? All its tables, menu items, and staff will be permanently removed.`)) {
      return;
    }
    try {
      setBusy(true);
      const res = await fetch("/api/v1/admin/delete-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });
      const data = await res.json();
      if (data.success) {
        success("Restaurant Deleted", `"${businessName}" was removed.`);
        loadRestaurants();
      } else {
        toastError("Delete Failed", data.error || "Could not delete restaurant.");
      }
    } catch (err: any) {
      toastError("Delete Error", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePurgeTestRestaurants = async () => {
    if (!window.confirm("WARNING: Are you sure you want to purge ALL test restaurants? This will wipe all test restaurants so you can start fresh.")) {
      return;
    }
    try {
      setBusy(true);
      const res = await fetch("/api/v1/admin/delete-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purge_all_test: true }),
      });
      const data = await res.json();
      if (data.success) {
        success("Purge Complete", "All test restaurants removed. Ready for pristine testing.");
        loadRestaurants();
      } else {
        toastError("Purge Failed", data.error || "Could not purge test restaurants.");
      }
    } catch (err: any) {
      toastError("Purge Error", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Restaurants SaaS Clients", value: stats.total, color: "from-violet-600 to-indigo-600", icon: <Building2 size={18} /> },
          { label: "Active Subscriptions", value: stats.active, color: "from-emerald-600 to-teal-600", icon: <CheckCircle2 size={18} /> },
          { label: "Gross Dining Sales Tracked", value: `₹${(stats.totalSales / 1000).toFixed(1)}K`, color: "from-blue-600 to-cyan-600", icon: <DollarSign size={18} /> },
          { label: "Monthly SaaS Revenue (MRR)", value: `₹${stats.mrr.toLocaleString()}`, color: "from-amber-500 to-orange-600", icon: <DollarSign size={18} /> }
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white shadow-lg`}>
            <div className="opacity-70 mb-3">{s.icon}</div>
            <p className="text-2xl font-black font-mono leading-none">{s.value}</p>
            <p className="text-xs font-bold opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search restaurants..."
              className="w-full h-9 pl-8 pr-3 text-xs bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
            />
          </div>
          <div className="flex gap-1">
            {["all", "active", "suspended"].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors border-0 cursor-pointer capitalize ${
                  filterStatus === s
                    ? "bg-violet-600 text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handlePurgeTestRestaurants}
            disabled={busy}
            className="flex items-center gap-1.5 h-9 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer justify-center"
            title="Wipe all test restaurants to start fresh"
          >
            Purge Test Data
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 bg-violet-600 hover:bg-violet-700 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer border-0 justify-center"
          >
            <Plus size={13} />
            Add Restaurant
          </button>
        </div>
      </div>

      {/* List Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {["Restaurant Details", "Plan", "Status", "Dining Stats", "Billing (MRR)", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_td]:text-slate-300 [&_tr:hover]:bg-white/3 [&_tr]:border-b [&_tr]:border-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-bold">Loading SaaS restaurant client details...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    <Building2 size={28} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-bold">No restaurants found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id}>
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        {r.businessName}
                        {r.isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{r.tenantName} ({r.address || "No Address"})</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 uppercase">
                        {r.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase ${
                        r.status === "active" 
                          ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40" 
                          : "bg-rose-950/60 text-rose-400 border-rose-800/40"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium">
                      <div className="text-white font-bold">{r.tableCount} Tables</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.totalOrders} Orders processed</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono font-bold text-violet-400">
                      ₹{r.plan === "enterprise" ? "8,999/mo" : r.plan === "starter" ? "1,999/mo" : "2,999/mo"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/restaurant?tenant_id=${encodeURIComponent(r.tenantId || r.id)}&restaurant_id=${encodeURIComponent(r.id)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors border border-violet-500/20 bg-violet-500/5 px-2.5 py-1 rounded-lg"
                        >
                          Open Portal
                          <ExternalLink size={10} />
                        </a>
                        <button
                          onClick={() => handleDeleteRestaurant(r.id, r.businessName)}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/20 bg-rose-500/5 px-2.5 py-1 rounded-lg cursor-pointer"
                          title="Delete this test restaurant"
                        >
                          Delete
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

      {/* Onboarding Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-white">Onboard Restaurant Client</h3>
                <p className="text-[10px] text-slate-500 font-medium">Setup new Tenant organization & default config</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-white border-0 bg-transparent cursor-pointer font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateRestaurant} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    name="restaurant_name"
                    value={formData.restaurant_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Pizza Hub"
                    className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Rahul Verma"
                    className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Owner Email</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="rahul@example.com"
                    className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Onboarding Password</label>
                  <input
                    type="password"
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Min 6 characters"
                    className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 9999888877"
                    className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">SaaS Subscription Plan</label>
                  <select
                    name="plan"
                    value={formData.plan}
                    onChange={handleInputChange}
                    className="w-full h-9 px-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500"
                  >
                    <option value="starter" className="bg-[#0c0c0e]">Starter Plan (₹1,999/mo)</option>
                    <option value="pro" className="bg-[#0c0c0e]">Pro Plan (₹2,999/mo)</option>
                    <option value="enterprise" className="bg-[#0c0c0e]">Enterprise Plan (₹8,999/mo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-black mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. Civil Lines, Gorakhpur"
                  className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 h-10 border border-white/10 bg-transparent rounded-xl font-bold text-slate-400 hover:text-white cursor-pointer hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold cursor-pointer transition-all border-0 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Provisioning...
                    </>
                  ) : "Create Restaurant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
