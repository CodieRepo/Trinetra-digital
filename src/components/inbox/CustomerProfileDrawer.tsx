import React, { useState } from "react";
import { 
  X, Sparkles, RefreshCw, Clock, CheckSquare, Plus, FileText
} from "lucide-react";
import { Lead, TimelineEvent, Task, LeadNote, LeadStatus } from "../../types/crm";

interface CustomerProfileDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  timeline: TimelineEvent[];
  tasks: Task[];
  notes: LeadNote[];
  onUpdateStage: (leadId: string, stage: LeadStatus) => void;
  onAddNote: (leadId: string, note: string) => void;
  onAddTask: (leadId: string, title: string, priority: string, dueDate: string) => void;
  onReanalyzeAI: (leadId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

export const CustomerProfileDrawer: React.FC<CustomerProfileDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  timeline,
  tasks,
  notes,
  onUpdateStage,
  onAddNote,
  onAddTask,
  onReanalyzeAI,
  onCompleteTask,
}) => {
  const [activeTab, setActiveTab] = useState<"ai" | "timeline" | "notes" | "tasks">("ai");
  const [newNote, setNewNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen || !lead) return null;

  const STAGES: LeadStatus[] = ["new", "contacted", "qualified", "quotation", "negotiation", "won", "lost"];

  const handleReanalyze = async () => {
    setIsAnalyzing(true);
    await onReanalyzeAI(lead.id);
    setIsAnalyzing(false);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(lead.id, newNote.trim());
    setNewNote("");
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onAddTask(lead.id, taskTitle.trim(), taskPriority, taskDueDate);
    setTaskTitle("");
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col font-sans text-slate-100 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-lg">
            {lead.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-black text-slate-100">{lead.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400 font-mono">{lead.phone}</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-indigo-400 font-semibold">{lead.source}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors border-0 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stage Selector & AI Meter Bar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
        {/* Stage Selector */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Pipeline Stage
          </label>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => onUpdateStage(lead.id, s)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition-all border border-transparent cursor-pointer shrink-0 ${
                  lead.status === s
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* AI Score & Re-analyze trigger */}
        <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800/50 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Score {lead.score || 50}/100</span>
            </div>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                lead.lead_temperature === "hot"
                  ? "bg-rose-950 text-rose-400 border-rose-800"
                  : lead.lead_temperature === "warm"
                  ? "bg-amber-950 text-amber-400 border-amber-800"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {lead.lead_temperature || "warm"}
            </span>
          </div>

          <button
            onClick={handleReanalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 px-3 py-1 rounded-lg border border-indigo-800/60 transition-colors border-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>Re-analyze</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-4">
        {[
          { key: "ai", label: "AI Insights", icon: Sparkles },
          { key: "timeline", label: `Timeline (${timeline.length})`, icon: Clock },
          { key: "notes", label: `Notes (${notes.length})`, icon: FileText },
          { key: "tasks", label: `Tasks (${tasks.length})`, icon: CheckSquare },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 border-transparent cursor-pointer bg-transparent ${
                activeTab === t.key
                  ? "border-indigo-500 text-indigo-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* TAB 1: AI INSIGHTS */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>AI Summary</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {lead.ai_summary || "AI analysis will update automatically on incoming messages."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Customer Intent
                </span>
                <p className="text-xs font-bold text-slate-200">{lead.ai_intent || "General Inquiry"}</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Suggested Action
                </span>
                <p className="text-xs font-bold text-emerald-400">
                  {lead.ai_suggested_action || "Follow up with client"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TIMELINE (Heart of CRM) */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500">No activity timeline recorded yet.</p>
              ) : (
                timeline.map((evt) => (
                  <div key={evt.id} className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-950 border-2 border-indigo-500 flex items-center justify-center text-[9px] text-indigo-400 font-bold">
                      •
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-200">{evt.title}</h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {evt.description && (
                        <p className="text-xs text-slate-400 mt-1 bg-slate-950/60 border border-slate-800/60 rounded-xl p-2.5">
                          {evt.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INTERNAL NOTES */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            <form onSubmit={handleAddNoteSubmit} className="space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write private team note (e.g. Budget ₹50,000, decision maker is owner)..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Internal Note</span>
              </button>
            </form>

            <div className="space-y-2.5 pt-2">
              {notes.map((n) => (
                <div key={n.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-indigo-400">{n.author}</span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-300">{n.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TASKS */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <form onSubmit={handleAddTaskSubmit} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="New Task Title (e.g. Send Quotation, Call back)..."
                className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="h-8 bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs text-slate-300"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>

                <input
                  type="datetime-local"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="h-8 bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs text-slate-300"
                />

                <button
                  type="submit"
                  className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ml-auto"
                >
                  Add Task
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    t.status === "completed"
                      ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={t.status === "completed"}
                    onChange={() => onCompleteTask(t.id)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${t.status === "completed" ? "line-through text-slate-500" : "text-slate-200"}`}>
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="capitalize text-amber-400 font-bold">{t.priority} Priority</span>
                      <span>•</span>
                      <span>Due {new Date(t.due_date).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
