import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Zap, Trash2,
  Bot,
  ChevronRight, Workflow, Play, Pause
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Trigger {
  type: "new_lead" | "keyword" | "stage_change" | "inactivity" | "human_handoff";
  value?: string;
}

interface Action {
  type: "send_message" | "update_status" | "assign_agent" | "create_task" | "send_template";
  value: string;
  delay?: number;
}

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: Trigger;
  actions: Action[];
  enabled: boolean;
  triggeredCount: number;
  lastTriggeredAt: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  new_lead:      "New Lead Created",
  keyword:       "Keyword Detected",
  stage_change:  "Stage Changed",
  inactivity:    "Lead Inactive for X Days",
  human_handoff: "Human Handoff Requested",
};

const ACTION_LABELS: Record<string, string> = {
  send_message:  "Send WhatsApp Message",
  update_status: "Update Lead Status",
  assign_agent:  "Assign to Agent",
  create_task:   "Create Task",
  send_template: "Send Template Message",
};

// ── Demo Automations (starter templates) ──────────────────────────────────────

const STARTER_AUTOMATIONS: Automation[] = [
  {
    id: "auto-1",
    name: "New Lead Welcome",
    description: "Automatically greet new leads when they first message",
    trigger: { type: "new_lead" },
    actions: [
      { type: "send_message", value: "Hello! Welcome to our business. How can we help you today?", delay: 2 },
      { type: "update_status", value: "ai_qualifying" },
    ],
    enabled: true,
    triggeredCount: 0,
    lastTriggeredAt: null,
  },
  {
    id: "auto-2",
    name: "Human Handoff Alert",
    description: "Notify staff when a customer requests to speak with a human",
    trigger: { type: "human_handoff" },
    actions: [
      { type: "create_task", value: "HUMAN_HANDOFF: Customer requested agent", delay: 0 },
      { type: "send_message", value: "Thank you for your patience! Our team will connect with you shortly.", delay: 1 },
    ],
    enabled: true,
    triggeredCount: 0,
    lastTriggeredAt: null,
  },
  {
    id: "auto-3",
    name: "7-Day Re-engagement",
    description: "Follow up with leads who haven't replied in 7 days",
    trigger: { type: "inactivity", value: "7" },
    actions: [
      { type: "send_message", value: "Hi! We noticed we haven't heard from you. Can we help with anything?", delay: 0 },
    ],
    enabled: false,
    triggeredCount: 0,
    lastTriggeredAt: null,
  },
];

// ── Automation Card ───────────────────────────────────────────────────────────

function AutomationCard({
  automation,
  onToggle,
  onDelete,
}: {
  automation: Automation;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-2xl p-5 transition-all ${
        automation.enabled ? "border-indigo-200" : "border-slate-200/80"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
              automation.enabled
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${automation.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {automation.enabled ? "Active" : "Paused"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              Triggered {automation.triggeredCount} times
            </span>
          </div>
          <h3 className="font-bold text-slate-800 text-sm">{automation.name}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{automation.description}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className={`h-8 px-3 rounded-xl text-[10px] font-bold transition-colors border-0 cursor-pointer ${
              automation.enabled
                ? "bg-amber-50 hover:bg-amber-100 text-amber-700"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
            }`}
          >
            {automation.enabled ? <><Pause size={11} className="inline mr-1" />Pause</> : <><Play size={11} className="inline mr-1" />Enable</>}
          </button>
          <button
            onClick={onDelete}
            className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors border-0 cursor-pointer bg-transparent"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="space-y-2">
        {/* Trigger */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
          <Zap size={12} className="text-blue-600 shrink-0" />
          <div>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-wider">Trigger</p>
            <p className="text-xs font-bold text-blue-800">
              {TRIGGER_LABELS[automation.trigger.type]}
              {automation.trigger.value && ` (${automation.trigger.value} days)`}
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <div className="h-4 w-px bg-slate-200" />
        </div>

        {/* Actions */}
        {automation.actions.map((action, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <ChevronRight size={12} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Action {i + 1}{action.delay ? ` · after ${action.delay}s` : ""}
                </p>
                <p className="text-xs font-bold text-slate-700 truncate">{ACTION_LABELS[action.type]}</p>
                {action.type === "send_message" && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 italic">"{action.value}"</p>
                )}
              </div>
            </div>
            {i < automation.actions.length - 1 && (
              <div className="flex items-center justify-center my-1">
                <div className="h-3 w-px bg-slate-200" />
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Create Automation Modal ───────────────────────────────────────────────────

function CreateAutomationModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (a: Automation) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<Trigger["type"]>("new_lead");
  const [triggerValue, setTriggerValue] = useState("");
  const [messageBody, setMessageBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      id: `auto-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      trigger: { type: triggerType, value: triggerValue || undefined },
      actions: messageBody.trim() ? [{ type: "send_message", value: messageBody.trim(), delay: 2 }] : [],
      enabled: false,
      triggeredCount: 0,
      lastTriggeredAt: null,
    });
    setName(""); setDescription(""); setTriggerType("new_lead"); setTriggerValue(""); setMessageBody("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Automation" subtitle="Create a trigger-based workflow" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Automation Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Welcome New Lead"
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does this automation do?"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trigger</label>
          <select
            value={triggerType}
            onChange={e => setTriggerType(e.target.value as Trigger["type"])}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none cursor-pointer"
          >
            {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {triggerType === "inactivity" && (
            <input
              type="number"
              value={triggerValue}
              onChange={e => setTriggerValue(e.target.value)}
              placeholder="Days of inactivity (e.g. 7)"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none mt-2"
            />
          )}
          {triggerType === "keyword" && (
            <input
              type="text"
              value={triggerValue}
              onChange={e => setTriggerValue(e.target.value)}
              placeholder="Keyword to detect (e.g. price, help)"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none mt-2"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto-Reply Message</label>
          <textarea
            value={messageBody}
            onChange={e => setMessageBody(e.target.value)}
            placeholder="Message to send when triggered..."
            rows={3}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer">
            Create Automation
          </button>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AutomationsPanel() {
  const { success } = useToast();
  const [automations, setAutomations] = useState<Automation[]>(STARTER_AUTOMATIONS);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeCount = automations.filter(a => a.enabled).length;

  const toggle = (id: string) => {
    setAutomations(prev => prev.map(a =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));
    const a = automations.find(x => x.id === id);
    if (a) success(a.enabled ? "Automation paused" : "Automation enabled", a.name);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Automations</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeCount} active · {automations.length} total workflows
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer border-0"
        >
          <Plus size={13} />
          New Automation
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex gap-3">
        <Bot size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-indigo-800">AI + Automation Combined</p>
          <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
            Automations run on top of the AI engine. When a trigger fires, the action executes — even during AI conversations. 
            Human handoff automations always take priority over AI responses.
          </p>
        </div>
      </div>

      {/* Automation Grid */}
      {automations.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl py-20 text-center">
          <Workflow size={32} className="mx-auto mb-3 text-slate-300" />
          <h3 className="font-bold text-slate-700 text-sm">No automations yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">Build trigger-based workflows to automate your CRM</p>
          <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer">
            <Plus size={13} /> Create Automation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {automations.map(a => (
            <AutomationCard
              key={a.id}
              automation={a}
              onToggle={() => toggle(a.id)}
              onDelete={() => setDeleteId(a.id)}
            />
          ))}
        </div>
      )}

      <CreateAutomationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={a => { setAutomations(prev => [a, ...prev]); success("Automation created", "Saved as inactive — enable when ready"); }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          setAutomations(prev => prev.filter(a => a.id !== deleteId));
          setDeleteId(null);
          success("Deleted", "Automation removed");
        }}
        title="Delete Automation"
        message="This automation will stop running immediately and be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
