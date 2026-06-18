import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, MessageSquare,
  Plus, Search, MoreVertical, Eye, Pause, Play, Trash2,
  CheckCircle2, DollarSign, Building2
} from "lucide-react";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantClient {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  plan: "starter" | "pro" | "enterprise";
  status: "active" | "suspended" | "trial" | "churned";
  leadsCount: number;
  messagesThisMonth: number;
  mrr: number;
  waConnected: boolean;
  createdAt: string;
  expiresAt: string;
  sector: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_CLIENTS: TenantClient[] = [
  {
    id: "c1", name: "PropWise Realty",     ownerName: "Rajesh Sharma",   phone: "+91 98765 43210", email: "rajesh@propwise.in",
    plan: "pro", status: "active", leadsCount: 847, messagesThisMonth: 3240, mrr: 4999, waConnected: true,
    createdAt: "2025-01-10", expiresAt: "2026-01-10", sector: "Real Estate",
  },
  {
    id: "c2", name: "Dr. Mehta's Clinic",  ownerName: "Dr. Priya Mehta", phone: "+91 90000 12345", email: "priya@mehtaclinic.com",
    plan: "starter", status: "active", leadsCount: 312, messagesThisMonth: 980, mrr: 1999, waConnected: true,
    createdAt: "2025-03-15", expiresAt: "2026-03-15", sector: "Healthcare",
  },
  {
    id: "c3", name: "EduVista Coaching",   ownerName: "Ankit Verma",     phone: "+91 88800 55566", email: "ankit@eduvista.com",
    plan: "pro", status: "trial", leadsCount: 45, messagesThisMonth: 210, mrr: 0, waConnected: false,
    createdAt: "2026-06-01", expiresAt: "2026-06-15", sector: "Education",
  },
  {
    id: "c4", name: "GlobalConsult LLP",   ownerName: "Sonia Kapoor",    phone: "+91 77700 99900", email: "sonia@globalconsult.in",
    plan: "enterprise", status: "active", leadsCount: 2341, messagesThisMonth: 11800, mrr: 14999, waConnected: true,
    createdAt: "2024-11-01", expiresAt: "2025-11-01", sector: "Consulting",
  },
  {
    id: "c5", name: "QuickFix Services",   ownerName: "Mohan Das",       phone: "+91 99900 11100", email: "mohan@quickfix.in",
    plan: "starter", status: "suspended", leadsCount: 89, messagesThisMonth: 0, mrr: 0, waConnected: false,
    createdAt: "2025-05-01", expiresAt: "2025-06-01", sector: "Services",
  },
];

// ── Config Maps ───────────────────────────────────────────────────────────────

const PLAN_STYLES: Record<string, string> = {
  starter:    "bg-slate-100  text-slate-600",
  pro:        "bg-indigo-50  text-indigo-700",
  enterprise: "bg-amber-50   text-amber-700",
};

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  trial:     "bg-blue-50    text-blue-700    border-blue-200",
  suspended: "bg-rose-50    text-rose-700    border-rose-200",
  churned:   "bg-slate-100  text-slate-500   border-slate-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active:    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />,
  trial:     <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" />,
  suspended: <span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block" />,
  churned:   <span className="w-1.5 h-1.5 bg-slate-400 rounded-full inline-block" />,
};

// ── Client Row ────────────────────────────────────────────────────────────────

function ClientRow({
  client,
  onView,
  onToggleSuspend,
  onDelete,
}: {
  client: TenantClient;
  onView: () => void;
  onToggleSuspend: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 group transition-colors">
      {/* Client */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0">
            {client.name.charAt(0)}
          </div>
          <div>
            <button onClick={onView} className="font-bold text-sm text-slate-800 hover:text-indigo-600 transition-colors border-0 bg-transparent cursor-pointer text-left">
              {client.name}
            </button>
            <p className="text-[10px] text-slate-400 mt-0.5">{client.ownerName} · {client.sector}</p>
          </div>
        </div>
      </td>

      {/* Plan */}
      <td className="px-4 py-4">
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${PLAN_STYLES[client.plan]}`}>
          {client.plan}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border ${STATUS_STYLES[client.status]}`}>
          {STATUS_ICONS[client.status]}
          {client.status}
        </span>
      </td>

      {/* Leads */}
      <td className="px-4 py-4 hidden md:table-cell">
        <p className="text-sm font-black text-slate-700 font-mono">{client.leadsCount.toLocaleString()}</p>
        <p className="text-[9px] text-slate-400">{client.messagesThisMonth.toLocaleString()} msgs/mo</p>
      </td>

      {/* MRR */}
      <td className="px-4 py-4 hidden lg:table-cell">
        <p className="text-sm font-black text-emerald-600 font-mono">₹{client.mrr.toLocaleString()}</p>
        <p className="text-[9px] text-slate-400">monthly</p>
      </td>

      {/* WA */}
      <td className="px-4 py-4 hidden lg:table-cell">
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
          client.waConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${client.waConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
          {client.waConnected ? "Connected" : "Offline"}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-colors border-0 cursor-pointer bg-transparent"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 w-40" onClick={() => setMenuOpen(false)}>
              <button onClick={onView} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer">
                <Eye size={11} /> View Details
              </button>
              <button onClick={onToggleSuspend} className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer ${
                client.status === "suspended" ? "text-emerald-600" : "text-amber-600"
              }`}>
                {client.status === "suspended" ? <><Play size={11} /> Activate</> : <><Pause size={11} /> Suspend</>}
              </button>
              <hr className="my-1 border-slate-100" />
              <button onClick={onDelete} className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer">
                <Trash2 size={11} /> Delete Client
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Add Client Modal ──────────────────────────────────────────────────────────

function AddClientModal({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (c: TenantClient) => void;
}) {
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("Real Estate");
  const [plan, setPlan] = useState<TenantClient["plan"]>("starter");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: `c-${Date.now()}`,
      name: name.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      sector,
      plan,
      status: "trial",
      leadsCount: 0,
      messagesThisMonth: 0,
      mrr: plan === "starter" ? 1999 : plan === "pro" ? 4999 : 14999,
      waConnected: false,
      createdAt: new Date().toISOString().split("T")[0],
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    });
    setName(""); setOwnerName(""); setPhone("+91 "); setEmail(""); setSector("Real Estate"); setPlan("starter");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Client" subtitle="Create a new tenant workspace" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PropWise Realty" required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner Name *</label>
            <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Rajesh Sharma" required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Number *</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@business.com"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sector</label>
            <select value={sector} onChange={e => setSector(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none cursor-pointer">
              {["Real Estate", "Healthcare", "Education", "Consulting", "Services", "Retail", "Finance", "Other"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value as any)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none cursor-pointer">
              <option value="starter">Starter — ₹1,999/mo</option>
              <option value="pro">Pro — ₹4,999/mo</option>
              <option value="enterprise">Enterprise — ₹14,999/mo</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer">
            Create Client (14-day Trial)
          </button>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-0 cursor-pointer">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const { success } = useToast();
  const [clients, setClients] = useState<TenantClient[]>(MOCK_CLIENTS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [viewClient, setViewClient] = useState<TenantClient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = clients;
    if (filterStatus !== "all") r = r.filter(c => c.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q)
      );
    }
    return r;
  }, [clients, search, filterStatus]);

  const stats = useMemo(() => ({
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === "active").length,
    totalMRR: clients.filter(c => c.status === "active").reduce((s, c) => s + c.mrr, 0),
    totalLeads: clients.reduce((s, c) => s + c.leadsCount, 0),
    totalMessages: clients.reduce((s, c) => s + c.messagesThisMonth, 0),
  }), [clients]);

  const toggleSuspend = (id: string) => {
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, status: c.status === "suspended" ? "active" : "suspended" } : c
    ));
    const c = clients.find(x => x.id === id);
    if (c) success(c.status === "suspended" ? "Client activated" : "Client suspended", c.name);
  };

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Super Admin</h1>
            <p className="text-[10px] text-slate-500 font-medium">Trinetra Platform Control</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
            ← Back to CRM
          </a>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-[10px] text-slate-500 font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            SUPER ADMIN MODE
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8 space-y-8">

        {/* Platform KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Clients",    value: stats.totalClients,                     color: "from-violet-600 to-indigo-600",   icon: <Building2 size={18} /> },
            { label: "Active Clients",   value: stats.activeClients,                    color: "from-emerald-600 to-teal-600",    icon: <CheckCircle2 size={18} /> },
            { label: "Platform MRR",     value: `₹${(stats.totalMRR / 1000).toFixed(1)}K`, color: "from-amber-500 to-orange-600", icon: <DollarSign size={18} /> },
            { label: "Total Leads",      value: stats.totalLeads.toLocaleString(),        color: "from-blue-600 to-cyan-600",       icon: <Users size={18} /> },
            { label: "Messages/Month",   value: stats.totalMessages.toLocaleString(),     color: "from-rose-600 to-pink-600",       icon: <MessageSquare size={18} /> },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white`}
            >
              <div className="opacity-70 mb-3">{s.icon}</div>
              <p className="text-2xl font-black font-mono leading-none">{s.value}</p>
              <p className="text-xs font-bold opacity-70 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Client Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full h-9 pl-8 pr-3 text-xs bg-white/5 border border-white/10 rounded-xl text-slate-300 focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
                />
              </div>
              <div className="flex gap-1">
                {["all", "active", "trial", "suspended", "churned"].map(s => (
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
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 h-9 px-4 bg-violet-600 hover:bg-violet-700 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer border-0"
            >
              <Plus size={13} />
              Add Client
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  {["Client", "Plan", "Status", "Leads / Messages", "MRR", "WhatsApp", "Actions"].map(h => (
                    <th key={h} className={`px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-wider ${
                      h === "Leads / Messages" ? "hidden md:table-cell" :
                      h === "MRR" ? "hidden lg:table-cell" :
                      h === "WhatsApp" ? "hidden lg:table-cell" : ""
                    }`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_td]:text-slate-300 [&_tr:hover]:bg-white/3 [&_tr]:border-b [&_tr]:border-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                      <Building2 size={28} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-bold">No clients found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(client => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      onView={() => setViewClient(client)}
                      onToggleSuspend={() => toggleSuspend(client.id)}
                      onDelete={() => setDeleteId(client.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-white/5">
            <p className="text-[10px] text-slate-500 font-medium">
              Showing {filtered.length} of {clients.length} clients
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddClientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={c => { setClients(prev => [c, ...prev]); success("Client created", `${c.name} — 14-day trial started`); }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          setClients(prev => prev.filter(c => c.id !== deleteId));
          setDeleteId(null);
          success("Client deleted", "All data removed");
        }}
        title="Delete Client Account"
        message="This will permanently delete the client workspace and ALL their data including leads, conversations, and settings. This cannot be undone."
        confirmLabel="Yes, Delete Forever"
        variant="danger"
      />

      {/* Client Detail Modal */}
      <Modal open={!!viewClient} onClose={() => setViewClient(null)} title={viewClient?.name || ""} subtitle={`${viewClient?.sector} · ${viewClient?.plan} plan`} maxWidth="md">
        {viewClient && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Owner",    value: viewClient.ownerName },
                { label: "Phone",    value: viewClient.phone },
                { label: "Email",    value: viewClient.email },
                { label: "Status",   value: viewClient.status },
                { label: "Created",  value: viewClient.createdAt },
                { label: "Expires",  value: viewClient.expiresAt },
                { label: "Leads",    value: viewClient.leadsCount.toLocaleString() },
                { label: "Messages", value: `${viewClient.messagesThisMonth.toLocaleString()}/mo` },
                { label: "MRR",      value: `₹${viewClient.mrr.toLocaleString()}` },
              ].map(f => (
                <div key={f.label} className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase">{f.label}</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { toggleSuspend(viewClient.id); setViewClient(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-0 cursor-pointer ${
                  viewClient.status === "suspended"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}
              >
                {viewClient.status === "suspended" ? "Activate Account" : "Suspend Account"}
              </button>
              <button
                onClick={() => { setDeleteId(viewClient.id); setViewClient(null); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white border-0 cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
