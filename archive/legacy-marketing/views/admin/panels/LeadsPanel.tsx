import { useState, useMemo } from "react";
import {
  Search, Plus, Download, Pencil,
  Calendar, ChevronDown,
  Users, MessageSquare, X
} from "lucide-react";
import type { Lead } from "@/services/api";
import { getDisplayName, formatPhoneForDisplay } from "@/utils/contact";
import { useToast } from "@/components/ui/Toast";
import { PromptDialog } from "@/components/ui/Modal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeadsPanelProps {
  leads: Lead[];
  updateLeadStatus: (id: string, status: Lead["status"]) => Promise<boolean>;
  updateLeadField: (id: string, fields: Partial<Lead>) => Promise<boolean>;
  onViewConversation: (leadId: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  new:           { label: "New Lead",      bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200" },
  ai_qualifying: { label: "AI Qualifying", bg: "bg-violet-50",  text: "text-violet-700", border: "border-violet-200" },
  qualified:     { label: "Qualified",     bg: "bg-indigo-50",  text: "text-indigo-700", border: "border-indigo-200" },
  nurturing:     { label: "Nurturing",     bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200" },
  won:           { label: "Won 🏆",        bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200" },
  lost:          { label: "Lost",          bg: "bg-slate-100",  text: "text-slate-500",  border: "border-slate-200" },
};

const INTENT_CONFIG: Record<string, { bg: string; text: string }> = {
  HOT:               { bg: "bg-rose-50",   text: "text-rose-700" },
  WARM:              { bg: "bg-orange-50", text: "text-orange-700" },
  COLD:              { bg: "bg-sky-50",    text: "text-sky-700" },
  QUOTATION_REQUIRED:{ bg: "bg-amber-50",  text: "text-amber-700" },
};

// ── Row ───────────────────────────────────────────────────────────────────────

function LeadTableRow({
  lead,
  onView,
  onEdit,
  onStatusChange,
}: {
  lead: Lead;
  onView: () => void;
  onEdit: () => void;
  onStatusChange: (s: Lead["status"]) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  const intent = lead.intent_level ? INTENT_CONFIG[lead.intent_level] : null;

  const created = new Date(lead.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 group transition-colors">
      {/* Contact */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 ${
            lead.status === "won" ? "bg-emerald-500" :
            lead.status === "new" ? "bg-blue-500" :
            lead.status === "nurturing" ? "bg-amber-500" :
            "bg-slate-500"
          }`}>
            {getDisplayName(lead).charAt(0).toUpperCase()}
          </div>
          <div>
            <button
              onClick={onView}
              className="font-bold text-sm text-slate-800 hover:text-indigo-600 transition-colors border-0 bg-transparent cursor-pointer text-left"
            >
              {getDisplayName(lead)}
            </button>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {formatPhoneForDisplay(lead.phone)}
            </p>
          </div>
        </div>
      </td>

      {/* Company / Service */}
      <td className="px-4 py-3.5 hidden md:table-cell">
        <p className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
          {lead.company || <span className="text-slate-300">—</span>}
        </p>
        {lead.service && (
          <p className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">{lead.service}</p>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            {cfg.label}
            <ChevronDown size={9} />
          </button>
          {menuOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 w-40">
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { onStatusChange(key as Lead["status"]); setMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer border-0 bg-transparent ${
                    lead.status === key ? "text-indigo-600 font-bold" : "text-slate-600"
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Intent */}
      <td className="px-4 py-3.5 hidden lg:table-cell">
        {intent ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${intent.bg} ${intent.text}`}>
            {lead.intent_level === "HOT" ? "🔥" : lead.intent_level === "WARM" ? "🌡" : "❄️"}
            {lead.intent_level?.replace("_", " ")}
          </span>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>

      {/* AI Score */}
      <td className="px-4 py-3.5 hidden xl:table-cell">
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                lead.ai_score >= 75 ? "bg-emerald-500" :
                lead.ai_score >= 50 ? "bg-amber-500" : "bg-slate-300"
              }`}
              style={{ width: `${lead.ai_score}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500">{lead.ai_score}%</span>
        </div>
      </td>

      {/* Added */}
      <td className="px-4 py-3.5 hidden xl:table-cell">
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Calendar size={10} />
          {created}
        </div>
        <div className="text-[9px] text-slate-300 mt-0.5">{lead.source}</div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onView}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors border-0 cursor-pointer"
            title="Open conversation"
          >
            <MessageSquare size={12} />
          </button>
          <button
            onClick={onEdit}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border-0 cursor-pointer"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LeadsPanel({
  leads,
  updateLeadStatus,
  updateLeadField,
  onViewConversation,
}: LeadsPanelProps) {
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterIntent, setFilterIntent] = useState("all");
  const [sortBy, setSortBy] = useState<"created_at" | "ai_score" | "updated_at">("updated_at");

  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editField, setEditField] = useState<"name" | "company" | "phone" | null>(null);

  const filtered = useMemo(() => {
    let r = leads;
    if (filterStatus !== "all") r = r.filter(l => l.status === filterStatus);
    if (filterIntent !== "all") r = r.filter(l => l.intent_level === filterIntent);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(l =>
        getDisplayName(l).toLowerCase().includes(q) ||
        (l.company || "").toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.email || "").toLowerCase().includes(q)
      );
    }
    return [...r].sort((a, b) => {
      if (sortBy === "ai_score") return b.ai_score - a.ai_score;
      return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime();
    });
  }, [leads, filterStatus, filterIntent, search, sortBy]);

  const handleEditSubmit = async (value: string) => {
    if (!editLead || !editField) return;
    const ok = await updateLeadField(editLead.id, { [editField]: value });
    if (ok) success("Updated", `${editField} updated successfully`);
    else toastError("Update failed", "Could not update the field");
    setEditLead(null);
    setEditField(null);
  };

  // Summary counts
  const counts = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    hot: leads.filter(l => l.intent_level === "HOT").length,
    won: leads.filter(l => l.status === "won").length,
  }), [leads]);

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Leads & Contacts</h1>
          <p className="text-xs text-slate-400 mt-0.5">{counts.total} total · {counts.new} new · {counts.hot} hot</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 h-9 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            <Download size={13} />
            Export
          </button>
          <button className="flex items-center gap-2 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer border-0">
            <Plus size={13} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.total, color: "from-slate-600 to-slate-800" },
          { label: "New", value: counts.new, color: "from-blue-500 to-blue-700" },
          { label: "Hot 🔥", value: counts.hot, color: "from-rose-500 to-rose-700" },
          { label: "Won 🏆", value: counts.won, color: "from-emerald-500 to-emerald-700" },
        ].map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-2xl p-4 text-white`}>
            <p className="text-2xl font-black font-mono leading-none">{c.value}</p>
            <p className="text-xs font-bold opacity-70 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, company, phone..."
            className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={filterIntent}
          onChange={e => setFilterIntent(e.target.value)}
          className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer"
        >
          <option value="all">All Intent</option>
          <option value="HOT">🔥 Hot</option>
          <option value="WARM">🌡 Warm</option>
          <option value="COLD">❄️ Cold</option>
          <option value="QUOTATION_REQUIRED">💬 Quote Needed</option>
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer"
        >
          <option value="updated_at">Latest Activity</option>
          <option value="created_at">Date Added</option>
          <option value="ai_score">AI Score</option>
        </select>

        {(filterStatus !== "all" || filterIntent !== "all" || search) && (
          <button
            onClick={() => { setSearch(""); setFilterStatus("all"); setFilterIntent("all"); }}
            className="flex items-center gap-1 h-9 px-3 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border-0 cursor-pointer"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Contact", "Company", "Status", "Intent", "AI Score", "Added", "Actions"].map(h => (
                  <th key={h} className={`px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider ${
                    h === "AI Score" ? "hidden xl:table-cell" :
                    h === "Added" ? "hidden xl:table-cell" :
                    h === "Company" ? "hidden md:table-cell" :
                    h === "Intent" ? "hidden lg:table-cell" : ""
                  }`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold">No leads found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map(lead => (
                  <LeadTableRow
                    key={lead.id}
                    lead={lead}
                    onView={() => onViewConversation(lead.id)}
                    onEdit={() => { setEditLead(lead); setEditField("name"); }}
                    onStatusChange={async (status) => {
                      const ok = await updateLeadStatus(lead.id, status);
                      if (ok) success("Status updated", `${getDisplayName(lead)} → ${STATUS_CONFIG[status]?.label}`);
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-medium">
              Showing {filtered.length} of {leads.length} leads
            </p>
          </div>
        )}
      </div>

      {/* Edit Prompt */}
      <PromptDialog
        open={!!(editLead && editField)}
        onClose={() => { setEditLead(null); setEditField(null); }}
        onSubmit={handleEditSubmit}
        title={`Edit ${editField || "field"}`}
        label={editField?.charAt(0).toUpperCase() + (editField?.slice(1) || "")}
        defaultValue={
          editField === "name" ? editLead?.name :
          editField === "company" ? (editLead?.company || "") :
          editField === "phone" ? editLead?.phone : ""
        }
        submitLabel="Save Changes"
      />
    </div>
  );
}
