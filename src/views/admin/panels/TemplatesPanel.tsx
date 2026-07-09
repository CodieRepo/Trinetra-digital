import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, MessageSquare, Copy, CheckCircle2, Clock, AlertCircle,
  Edit2, Trash2, Eye, RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { apiService } from "@/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  category: "marketing" | "utility" | "authentication";
  language: string;
  status: "approved" | "pending" | "rejected" | "draft";
  body: string;
  header?: string;
  footer?: string;
  buttons?: string[];
  usedCount: number;
  createdAt: string;
}

// ── Status ────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:   "bg-amber-50   text-amber-700   border-amber-200",
  rejected:  "bg-rose-50    text-rose-700    border-rose-200",
  draft:     "bg-slate-100  text-slate-600   border-slate-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  approved: <CheckCircle2 size={10} />,
  pending:  <Clock size={10} />,
  rejected: <AlertCircle size={10} />,
  draft:    <Edit2 size={10} />,
};

// ── Category Badge ────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  marketing:      "bg-violet-50 text-violet-700",
  utility:        "bg-sky-50    text-sky-700",
  authentication: "bg-amber-50  text-amber-700",
};



// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onDelete,
  onView,
}: {
  template: Template;
  onDelete: () => void;
  onView: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyBody = () => {
    navigator.clipboard.writeText(template.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-indigo-200 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-slate-800 font-mono truncate">{template.name}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_STYLES[template.status]}`}>
              {STATUS_ICONS[template.status]}
              {template.status}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${CAT_COLORS[template.category]}`}>
              {template.category}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">{template.language.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onView}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 transition-colors border-0 cursor-pointer bg-transparent"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={onDelete}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors border-0 cursor-pointer bg-transparent"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Body preview */}
      {template.header && (
        <p className="text-xs font-bold text-slate-700 mb-1">{template.header}</p>
      )}
      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 leading-relaxed line-clamp-3 mb-3">
        {template.body}
      </p>
      {template.footer && (
        <p className="text-[10px] text-slate-400 italic mb-3">{template.footer}</p>
      )}

      {/* Buttons preview */}
      {template.buttons && template.buttons.length > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {template.buttons.map((btn, i) => (
            <span key={i} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded text-[9px] font-bold">
              {btn}
            </span>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-[9px] text-slate-400 font-medium">
          Used {template.usedCount} times
        </span>
        <button
          onClick={copyBody}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 border-0 bg-transparent cursor-pointer transition-colors"
        >
          {copied ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Copy size={11} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Create Template Modal ─────────────────────────────────────────────────────

function CreateTemplateModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (t: Template) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Template["category"]>("marketing");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("Trinetra Digital Solutions");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    onCreate({
      id: `tpl-${Date.now()}`,
      name: name.trim().toLowerCase().replace(/\s+/g, "_"),
      category,
      language: "en",
      status: "draft",
      header: header.trim() || undefined,
      body: body.trim(),
      footer: footer.trim() || undefined,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    });
    setName(""); setCategory("marketing"); setHeader(""); setBody(""); setFooter("Trinetra Digital Solutions");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Template" subtitle="WhatsApp message template" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="welcome_message"
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as Template["category"])}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="marketing">Marketing</option>
              <option value="utility">Utility</option>
              <option value="authentication">Authentication</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Header (optional)</label>
          <input type="text" value={header} onChange={e => setHeader(e.target.value)}
            placeholder="Bold title shown above message..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Body *</label>
            <span className="text-[9px] text-slate-400">Use {"{{1}}, {{2}}"} for variables</span>
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Hello {{1}}! Your appointment is on {{2}}..."
            rows={5}
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Footer (optional)</label>
          <input type="text" value={footer} onChange={e => setFooter(e.target.value)}
            placeholder="Your business name"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none" />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-[10px] text-amber-700 leading-relaxed">
            Templates require Meta approval before use in campaigns. Drafts can be used internally for manual sends.
          </p>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer">
            Save Template
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

export default function TemplatesPanel() {
  const { success } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<Template | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const list = await apiService.templates.sync();
      setTemplates(list);
    } catch (e) {
      console.error("Failed loading templates:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Message Templates</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? "Loading..." : `${templates.length} templates · ${templates.filter(t => t.status === "approved").length} approved`}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer border-0"
        >
          <Plus size={13} />
          New Template
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <MessageSquare size={18} className="text-blue-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-800">WhatsApp Template Messages</p>
          <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
            Templates are pre-approved messages for proactive outreach. Once approved by Meta, you can use them in campaigns and automations. 
            Draft templates can be used for manual sends within active conversations.
          </p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl py-20 text-center">
          <MessageSquare size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-bold text-slate-600 text-sm">No templates yet</p>
          <p className="text-xs text-slate-400 mt-1 mb-5">Create message templates for campaigns and automations</p>
          <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer">
            <Plus size={13} /> Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onDelete={() => setDeleteId(t.id)}
              onView={() => setViewTemplate(t)}
            />
          ))}
        </div>
      )}

      <CreateTemplateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (t) => {
          try {
            await apiService.templates.create(t);
            loadTemplates();
            success("Template saved", t.name);
          } catch (e) {
            console.error(e);
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await apiService.templates.delete(deleteId);
            setDeleteId(null);
            loadTemplates();
            success("Deleted", "Template removed");
          } catch (e) {
            console.error(e);
          }
        }}
        title="Delete Template"
        message="This template will be permanently deleted and removed from any automations using it."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* View Template Modal */}
      <Modal
        open={!!viewTemplate}
        onClose={() => setViewTemplate(null)}
        title={viewTemplate?.name || "Template"}
        maxWidth="md"
      >
        {viewTemplate && (
          <div className="space-y-3">
            {viewTemplate.header && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Header</p>
                <p className="text-sm font-bold text-slate-800">{viewTemplate.header}</p>
              </div>
            )}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Body</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{viewTemplate.body}</p>
            </div>
            {viewTemplate.footer && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Footer</p>
                <p className="text-xs text-slate-500 italic">{viewTemplate.footer}</p>
              </div>
            )}
            {viewTemplate.buttons && (
              <div className="flex gap-2 flex-wrap">
                {viewTemplate.buttons.map((b, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold">{b}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_STYLES[viewTemplate.status]}`}>
                {viewTemplate.status}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${CAT_COLORS[viewTemplate.category]}`}>
                {viewTemplate.category}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
