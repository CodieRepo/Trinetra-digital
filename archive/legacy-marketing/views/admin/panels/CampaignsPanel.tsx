import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus, Send, Users, CheckCircle2, Clock, AlertCircle,
  Play, Trash2, Megaphone, RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  targetGroup: string;
  status: "draft" | "sending" | "completed" | "failed" | "scheduled";
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  scheduledAt: string;
  body: string;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     bg: "bg-slate-100",   text: "text-slate-600",   icon: <Clock size={10} /> },
  sending:   { label: "Sending",   bg: "bg-blue-50",     text: "text-blue-600",    icon: <RefreshCw size={10} className="animate-spin" /> },
  scheduled: { label: "Scheduled", bg: "bg-amber-50",    text: "text-amber-600",   icon: <Clock size={10} /> },
  completed: { label: "Completed", bg: "bg-emerald-50",  text: "text-emerald-600", icon: <CheckCircle2 size={10} /> },
  failed:    { label: "Failed",    bg: "bg-rose-50",     text: "text-rose-600",    icon: <AlertCircle size={10} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onDelete }: { campaign: Campaign; onDelete: (id: string) => void }) {
  const deliveryRate = campaign.sentCount > 0
    ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
    : 0;
  const readRate = campaign.deliveredCount > 0
    ? Math.round((campaign.readCount / campaign.deliveredCount) * 100)
    : 0;

  const scheduledDate = new Date(campaign.scheduledAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={campaign.status} />
            <span className="text-[9px] text-slate-400 font-medium">{scheduledDate}</span>
          </div>
          <h3 className="font-bold text-slate-800 text-sm truncate">{campaign.name}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Users size={9} />
            {campaign.targetGroup}
          </p>
        </div>
        <button
          onClick={() => onDelete(campaign.id)}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors border-0 cursor-pointer bg-transparent"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Preview */}
      <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed line-clamp-2 mb-4 border border-slate-100">
        {campaign.body || "No message body"}
      </p>

      {/* Stats */}
      {campaign.status !== "draft" && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Sent", value: campaign.sentCount, color: "text-blue-600" },
            { label: "Delivered", value: `${deliveryRate}%`, color: "text-indigo-600" },
            { label: "Read Rate", value: `${readRate}%`, color: "text-emerald-600" },
          ].map(s => (
            <div key={s.label} className="text-center bg-slate-50/60 rounded-xl p-2 border border-slate-100">
              <p className={`text-sm font-black font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-slate-400 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {campaign.status === "draft" && (
        <button className="w-full flex items-center justify-center gap-2 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer">
          <Send size={12} />
          Launch Campaign
        </button>
      )}
    </motion.div>
  );
}

// ── Create Campaign Modal ─────────────────────────────────────────────────────

function CreateCampaignModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: Partial<Campaign>) => void;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [targetGroup, setTargetGroup] = useState("all");
  const charCount = body.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    onCreate({
      name: name.trim(),
      body: body.trim(),
      targetGroup,
      status: "draft",
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      scheduledAt: new Date().toISOString(),
    });
    setName(""); setBody(""); setTargetGroup("all");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Campaign" subtitle="Broadcast a WhatsApp message to a group of contacts" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. June Offer - Real Estate Leads"
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Audience</label>
          <select
            value={targetGroup}
            onChange={e => setTargetGroup(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Contacts</option>
            <option value="new">New Leads</option>
            <option value="nurturing">Nurturing Leads</option>
            <option value="qualified">Qualified Leads</option>
            <option value="hot">Hot Intent Only</option>
            <option value="real_estate">Real Estate Sector</option>
            <option value="healthcare">Healthcare Sector</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Body *</label>
            <span className={`text-[9px] font-bold ${charCount > 1000 ? "text-rose-500" : "text-slate-400"}`}>
              {charCount}/1024
            </span>
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Hello {name}! We have an exciting offer for you..."
            rows={5}
            maxLength={1024}
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none"
          />
          <p className="text-[9px] text-slate-400">Use {"{name}"} to personalize with contact name</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[10px] text-amber-700 leading-relaxed">
            <strong>Note:</strong> Campaigns require WhatsApp Business API approval for template messages. 
            Non-template broadcasts may be flagged by WhatsApp.
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CampaignsPanel() {
  const { success } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() =>
    filterStatus === "all" ? campaigns : campaigns.filter(c => c.status === filterStatus),
    [campaigns, filterStatus]
  );

  const stats = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter(c => c.status === "sending" || c.status === "scheduled").length,
    completed: campaigns.filter(c => c.status === "completed").length,
    totalReach: campaigns.reduce((s, c) => s + c.sentCount, 0),
  }), [campaigns]);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Campaigns</h1>
          <p className="text-xs text-slate-400 mt-0.5">{stats.total} campaigns · {stats.totalReach.toLocaleString()} contacts reached</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer border-0"
        >
          <Plus size={13} />
          New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: <Megaphone size={16} className="text-indigo-600" />, bg: "bg-indigo-50" },
          { label: "Active", value: stats.active, icon: <Play size={16} className="text-blue-600" />, bg: "bg-blue-50" },
          { label: "Completed", value: stats.completed, icon: <CheckCircle2 size={16} className="text-emerald-600" />, bg: "bg-emerald-50" },
          { label: "Total Reach", value: stats.totalReach.toLocaleString(), icon: <Users size={16} className="text-amber-600" />, bg: "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-xl font-black text-slate-900 font-mono leading-none">{s.value}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "scheduled", "sending", "completed", "failed"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer capitalize ${
              filterStatus === s ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {s === "all" ? "All Campaigns" : s}
          </button>
        ))}
      </div>

      {/* Campaign Grid / Empty */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-indigo-400" />
          </div>
          <h3 className="font-bold text-slate-700 text-sm">No campaigns yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">Create your first WhatsApp broadcast campaign</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer"
          >
            <Plus size={13} />
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onDelete={id => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateCampaignModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={data => {
          const newC: Campaign = { id: `c-${Date.now()}`, ...data } as Campaign;
          setCampaigns(prev => [newC, ...prev]);
          success("Campaign created", "Saved as draft — review and launch when ready");
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          setCampaigns(prev => prev.filter(c => c.id !== deleteId));
          setDeleteId(null);
          success("Deleted", "Campaign removed");
        }}
        title="Delete Campaign"
        message="This campaign and all its stats will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
