import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Bot, Phone, Building2, Tag,
  Clock, CheckCheck, Check, AlertCircle, Loader2,
  MessageSquare, Zap, UserCheck, MoreVertical, Circle, FileText, Calendar, Plus, Paperclip
} from "lucide-react";
import { apiService, type Lead, type ChatMessage } from "@/services/api";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneForDisplay, getDisplayName } from "@/utils/contact";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/Modal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InboxPanelProps {
  leads: Lead[];
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  leadDetail: { lead: Lead; chats: ChatMessage[]; followup: any | null } | null;
  sendManualMessage: (
    id: string, 
    body: string, 
    mediaUrl?: string, 
    mediaType?: string,
    templateName?: string,
    templateParams?: string[]
  ) => Promise<boolean>;
  updateLeadStatus: (id: string, status: Lead["status"]) => Promise<boolean>;
  updateLeadField: (id: string, fields: Partial<Lead>) => Promise<boolean>;
  toggleAI: (id: string, enabled: boolean) => Promise<boolean>;
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isOut = msg.direction === "outbound";
  const time = new Date(msg.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const StatusIcon = () => {
    if (!isOut) return null;
    if (msg.status === "read") return <CheckCheck size={11} className="text-sky-400" />;
    if (msg.status === "sent") return <Check size={11} className="text-slate-400" />;
    if (msg.status === "failed") return <AlertCircle size={11} className="text-rose-400" />;
    return <Circle size={11} className="text-slate-300" />;
  };

  const isImage = msg.media_type?.toLowerCase().includes("image") || msg.media_url?.match(/\.(jpeg|jpg|gif|png|webp)/i);
  const isVideo = msg.media_type?.toLowerCase().includes("video") || msg.media_url?.match(/\.(mp4|webm|ogg)/i);

  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOut
            ? "bg-emerald-600 text-white rounded-br-sm"
            : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-xs"
        }`}
      >
        {msg.media_url && (
          <div className="mb-2 overflow-hidden rounded-xl">
            {isImage ? (
              <img 
                src={msg.media_url} 
                alt="Attachment" 
                className="max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(msg.media_url!, "_blank")}
              />
            ) : isVideo ? (
              <video src={msg.media_url} controls className="max-w-full max-h-48 rounded-lg" />
            ) : (
              <a 
                href={msg.media_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold ${
                  isOut 
                    ? "bg-emerald-700/50 border-emerald-500 text-white hover:bg-emerald-700" 
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Paperclip size={13} />
                <span className="truncate max-w-[150px]">View Attachment</span>
              </a>
            )}
          </div>
        )}
        {msg.body && <p className="whitespace-pre-wrap break-words">{msg.body}</p>}
        <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-end" : "justify-start"}`}>
          <span className={`text-[9px] font-medium ${isOut ? "text-emerald-200" : "text-slate-400"}`}>
            {time}
          </span>
          <StatusIcon />
        </div>
      </div>
    </div>
  );
}

// ── Lead Row ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new:           "bg-blue-500",
  ai_qualifying: "bg-violet-500",
  qualified:     "bg-indigo-500",
  nurturing:     "bg-amber-500",
  won:           "bg-emerald-500",
  lost:          "bg-slate-400",
};

function LeadRow({
  lead,
  active,
  onClick,
}: {
  lead: Lead;
  active: boolean;
  onClick: () => void;
}) {
  const lastActivity = lead.updated_at;
  const diff = Date.now() - new Date(lastActivity).getTime();
  const mins = Math.floor(diff / 60000);
  const timeStr = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-start gap-3 border-0 ${
        active ? "bg-indigo-50/70 border-l-2 border-l-indigo-500" : ""
      }`}
    >
      {/* Avatar */}
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 ${
        STATUS_COLORS[lead.status] || "bg-slate-400"
      }`}>
        {getDisplayName(lead).charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-800 truncate">{getDisplayName(lead)}</p>
          <span className="text-[9px] text-slate-400 shrink-0 font-medium">{timeStr}</span>
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {lead.company || formatPhoneForDisplay(lead.phone)}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${STATUS_COLORS[lead.status]}`}>
            {lead.status.replace("_", " ")}
          </span>
          {lead.ai_enabled === 1 && (
            <span className="text-[9px] text-violet-600 font-bold">
              <Bot size={9} className="inline mr-0.5" />AI
            </span>
          )}
          {lead.intent_level === "HOT" && (
            <span className="text-[9px] text-rose-600 font-bold">🔥 HOT</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Contact Profile Sidebar ───────────────────────────────────────────────────

function ContactSidebar({
  lead,
  onToggleAI,
  onUpdateStatus,
}: {
  lead: Lead;
  onToggleAI: (enabled: boolean) => void;
  onUpdateStatus: (status: Lead["status"]) => void;
}) {
  const statuses: Lead["status"][] = ["new", "ai_qualifying", "qualified", "nurturing", "won", "lost"];
  const { success: toastSuccess, error: toastError } = useToast();
  const [notes, setNotes] = useState<any[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Fetch notes on lead change
  useEffect(() => {
    const fetchNotes = async () => {
      setNotesLoading(true);
      try {
        const data = await apiService.notes.list(lead.id);
        setNotes(data);
      } catch (err: any) {
        console.error("Failed to load notes:", err);
      } finally {
        setNotesLoading(false);
      }
    };
    fetchNotes();
  }, [lead.id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setSavingNote(true);
    try {
      const newNote = await apiService.notes.create(lead.id, noteBody.trim());
      setNotes(prev => [newNote, ...prev]);
      setNoteBody("");
      toastSuccess("Note saved", "Your CRM note has been recorded");
    } catch (err: any) {
      toastError("Error saving note", err.message || "Something went wrong");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Profile header */}
      <div className="p-5 border-b border-slate-100 text-center shrink-0">
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-3 ${
          STATUS_COLORS[lead.status] || "bg-slate-400"
        }`}>
          {getDisplayName(lead).charAt(0).toUpperCase()}
        </div>
        <h3 className="font-black text-slate-800 text-sm">{getDisplayName(lead)}</h3>
        {lead.company && <p className="text-xs text-slate-400 mt-0.5">{lead.company}</p>}
        <div className="flex items-center justify-center gap-1 mt-2">
          <Phone size={10} className="text-slate-400" />
          <span className="text-[10px] text-slate-500 font-mono">{formatPhoneForDisplay(lead.phone)}</span>
        </div>
      </div>

      {/* AI Control */}
      <div className="p-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Bot size={14} className={lead.ai_enabled ? "text-violet-500" : "text-slate-400"} />
            <span className="text-xs font-bold text-slate-700">AI Automation</span>
          </div>
          <button
            onClick={() => onToggleAI(!lead.ai_enabled)}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors border-0 cursor-pointer ${
              lead.ai_enabled ? "bg-violet-500" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow-sm transition-transform ${
                lead.ai_enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          {lead.ai_enabled ? "AI is responding automatically" : "Manual mode — you control replies"}
        </p>
      </div>

      {/* AI Insights */}
      {lead.ai_summary && (
        <div className="p-4 border-b border-slate-100 shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">AI Summary</p>
          <p className="text-xs text-slate-600 leading-relaxed">{lead.ai_summary}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                style={{ width: `${lead.ai_score}%` }}
              />
            </div>
            <span className="text-[9px] font-black text-emerald-600">{lead.ai_score}%</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">Lead qualification score</p>
        </div>
      )}

      {/* Status Selector */}
      <div className="p-4 border-b border-slate-100 shrink-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Lead Status</p>
        <div className="grid grid-cols-2 gap-1">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => onUpdateStatus(s)}
              className={`py-1.5 px-2 rounded-lg text-[9px] font-bold transition-all border cursor-pointer capitalize ${
                lead.status === s
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* CRM Notes Section */}
      <div className="p-4 border-b border-slate-100 flex flex-col flex-1 min-h-[220px]">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">CRM Notes</p>
        
        {/* Note List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-[160px] pr-1">
          {notesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic text-center py-2">No notes added yet.</p>
          ) : (
            notes.map(note => (
              <div key={note.id} className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5">
                <p className="text-xs text-slate-700 leading-relaxed break-words">{note.body}</p>
                <p className="text-[8px] text-slate-400 font-mono mt-1 text-right">
                  {new Date(note.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Note Creator Form */}
        <form onSubmit={handleAddNote} className="mt-auto pt-2 border-t border-slate-100 shrink-0">
          <textarea
            value={noteBody}
            onChange={e => setNoteBody(e.target.value)}
            placeholder="Add a new CRM note..."
            rows={2}
            className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none font-sans"
          />
          <button
            type="submit"
            disabled={savingNote || !noteBody.trim()}
            className="w-full mt-1.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50 border-0 flex items-center justify-center gap-1.5"
          >
            {savingNote ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
            Save CRM Note
          </button>
        </form>
      </div>

      {/* Lead Details */}
      <div className="p-4 space-y-3 shrink-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Details</p>
        {[
          { icon: <Tag size={11} />, label: "Source", value: lead.source },
          { icon: <Building2 size={11} />, label: "Service", value: lead.service },
          { icon: <Clock size={11} />, label: "Intent", value: lead.intent_level },
          { icon: <FileText size={11} />, label: "Budget", value: lead.budget_range },
          { icon: <Calendar size={11} />, label: "Urgency", value: lead.urgency_level },
        ].filter(f => f.value).map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-slate-400">{f.icon}</span>
            <span className="text-[10px] text-slate-400 w-12 shrink-0">{f.label}</span>
            <span className="text-[10px] font-bold text-slate-700 truncate">{f.value}</span>
          </div>
        ))}
        <div className="text-[9px] text-slate-400 pt-1">
          Added {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InboxPanel({
  leads,
  selectedLeadId,
  setSelectedLeadId,
  leadDetail,
  sendManualMessage,
  updateLeadStatus,
  toggleAI,
}: InboxPanelProps) {
  const { success, error: toastError, info } = useToast();
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [confirmHandoff, setConfirmHandoff] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateParams, setTemplateParams] = useState<string[]>([]);

  const extractVariables = (body: string): number => {
    const matches = body.match(/\{\{\d+\}\}/g);
    if (!matches) return 0;
    const unique = new Set(matches.map(m => m.replace(/\D/g, "")));
    return unique.size;
  };

  const handleTemplateClick = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("status", "approved");
        
      if (error) throw error;
      setDbTemplates(data || []);
      setShowTemplateModal(true);
    } catch (e: any) {
      toastError("Templates failed", e.message || "Could not fetch templates list");
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLeadId) return;

    if (file.size > 15 * 1024 * 1024) {
      toastError("File too large", "Maximum allowed size is 15MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedLeadId}/${Date.now()}.${fileExt}`;
      
      console.log(`📤 Uploading file: ${file.name} to media storage bucket...`);
      
      const { data, error: uploadErr } = await supabase.storage
        .from("media")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(data.path);

      console.log(`✅ Media public URL resolved: ${publicUrl}`);

      const ok = await sendManualMessage(selectedLeadId, "", publicUrl, file.type);
      if (ok) {
        success("Attachment sent", "WhatsApp attachment delivered");
      } else {
        toastError("Send failed", "Failed sending WhatsApp attachment payload");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toastError("Upload failed", err.message || "Failed uploading file to Supabase storage");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filter & sort leads
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterStatus !== "all") result = result.filter(l => l.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        getDisplayName(l).toLowerCase().includes(q) ||
        (l.company || "").toLowerCase().includes(q) ||
        l.phone.includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [leads, search, filterStatus]);

  const selectedLead = leadDetail?.lead || leads.find(l => l.id === selectedLeadId) || null;

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current!.scrollTo({ top: chatContainerRef.current!.scrollHeight, behavior: "smooth" });
      }, 60);
    }
  }, [leadDetail?.chats]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !selectedLeadId) return;
    setSending(true);

    // Pause AI on human takeover
    if (leadDetail?.lead.ai_enabled === 1) {
      await toggleAI(selectedLeadId, false);
      info("AI paused", "AI automation paused for manual response");
    }

    const ok = await sendManualMessage(selectedLeadId, msgText.trim());
    if (ok) {
      setMsgText("");
      success("Message sent", "WhatsApp message delivered");
    } else {
      toastError("Send failed", "Could not deliver the message");
    }
    setSending(false);
  };

  const handleHandoff = async () => {
    if (!selectedLeadId) return;
    await toggleAI(selectedLeadId, false);
    setConfirmHandoff(false);
    success("Handoff complete", "AI paused. You now control this conversation.");
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">

      {/* ── Lead List ── */}
      <div className="w-72 shrink-0 border-r border-slate-100 flex flex-col">
        {/* Search + Filter */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {["all", "new", "ai_qualifying", "qualified", "nurturing", "won"].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-colors border-0 cursor-pointer capitalize ${
                  filterStatus === s
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Lead List */}
        <div className="flex-1 overflow-y-auto">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
              No conversations found
            </div>
          ) : (
            filteredLeads.map(lead => (
              <LeadRow
                key={lead.id}
                lead={lead}
                active={lead.id === selectedLeadId}
                onClick={() => setSelectedLeadId(lead.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-[9px] text-slate-400 font-medium">
            {filteredLeads.length} of {leads.length} conversations
          </p>
        </div>
      </div>

      {/* ── Chat Area ── */}
      {!selectedLeadId ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center space-y-3">
            <MessageSquare size={40} className="mx-auto opacity-20" />
            <div>
              <p className="text-sm font-bold">Select a conversation</p>
              <p className="text-xs font-medium mt-1 opacity-70">Choose a contact from the left to view messages</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          {selectedLead && (
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 ${
                  STATUS_COLORS[selectedLead.status] || "bg-slate-400"
                }`}>
                  {getDisplayName(selectedLead).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{getDisplayName(selectedLead)}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {formatPhoneForDisplay(selectedLead.phone)}
                    {selectedLead.company && ` · ${selectedLead.company}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedLead.ai_enabled === 1 ? (
                  <button
                    onClick={() => setConfirmHandoff(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer border-0"
                  >
                    <UserCheck size={12} />
                    Take Over
                  </button>
                ) : (
                  <button
                    onClick={() => { toggleAI(selectedLeadId!, true); info("AI resumed", "AI is now responding automatically"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-xl text-[10px] font-bold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer border-0"
                  >
                    <Bot size={12} />
                    Resume AI
                  </button>
                )}
                <button
                  onClick={() => setSidebarOpen(v => !v)}
                  className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors border-0 cursor-pointer"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-50/30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.3' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {!leadDetail ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-300" />
              </div>
            ) : leadDetail.chats.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center space-y-2">
                  <MessageSquare size={28} className="mx-auto opacity-30" />
                  <p className="text-xs font-medium">No messages yet</p>
                </div>
              </div>
            ) : (
              leadDetail.chats.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* AI Status Banner */}
          {selectedLead?.ai_enabled === 0 && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
              <Zap size={12} className="text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-700 font-semibold">
                Manual mode — AI automation is paused. You are in control.
              </p>
            </div>
          )}

          {/* Message Input */}
          <form onSubmit={handleSend} className="px-4 py-3 border-t border-slate-100 bg-white">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*,application/pdf,video/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
            />
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleAttachClick}
                disabled={uploading || sending}
                className="h-12 w-12 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                title="Attach image, video or document"
              >
                {uploading ? <Loader2 size={16} className="animate-spin text-emerald-600" /> : <Paperclip size={16} />}
              </button>
              <button
                type="button"
                onClick={handleTemplateClick}
                disabled={sending || uploading}
                className="h-12 w-12 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                title="Send WhatsApp Template"
              >
                <FileText size={16} />
              </button>
              <div className="flex-1 relative">
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
                  }}
                  placeholder="Type a WhatsApp message..."
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={sending || uploading || !msgText.trim()}
                className="h-12 w-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors border-0 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 mt-1.5 pl-1">Enter to send · Shift+Enter for new line · Attach image, PDF or video</p>
          </form>
        </div>
      )}

      {/* ── Contact Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && selectedLead && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-slate-100 overflow-hidden shrink-0"
          >
            <div className="w-64 h-full">
              <ContactSidebar
                lead={selectedLead}
                onToggleAI={enabled => toggleAI(selectedLeadId!, enabled)}
                onUpdateStatus={status => {
                  updateLeadStatus(selectedLeadId!, status);
                  success("Status updated", `Lead moved to ${status}`);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Handoff Confirm */}
      <ConfirmDialog
        open={confirmHandoff}
        onClose={() => setConfirmHandoff(false)}
        onConfirm={handleHandoff}
        title="Take Over Conversation"
        message="This will pause the AI and switch to manual mode. You will control all replies until you re-enable AI."
        confirmLabel="Take Over"
        variant="warning"
      />

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">Send WhatsApp Template</h3>
              <button 
                onClick={() => { setShowTemplateModal(false); setSelectedTemplate(null); }}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold border-0 bg-transparent cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[30rem] overflow-y-auto">
              {!selectedTemplate ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Select Template</label>
                  {dbTemplates.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No approved templates found in database.</p>
                  ) : (
                    <div className="space-y-2">
                      {dbTemplates.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(tpl);
                            const varCount = extractVariables(tpl.body);
                            setTemplateParams(new Array(varCount).fill(""));
                          }}
                          className="w-full text-left p-3.5 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-xl transition-all cursor-pointer bg-white"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black text-slate-700">{tpl.name}</span>
                            <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">{tpl.language}</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{tpl.body}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Template Preview</p>
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{selectedTemplate.body}</p>
                  </div>
                  
                  {templateParams.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Template Variables</p>
                      {templateParams.map((param, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-600">Variable {idx + 1}</label>
                          <input
                            type="text"
                            value={param}
                            onChange={e => {
                              const updated = [...templateParams];
                              updated[idx] = e.target.value;
                              setTemplateParams(updated);
                            }}
                            placeholder={`Value for {{${idx + 1}}}`}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate(null)}
                      className="flex-1 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold bg-white cursor-pointer hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setShowTemplateModal(false);
                        setSending(true);
                        const ok = await sendManualMessage(
                          selectedLeadId!,
                          "",
                          undefined,
                          undefined,
                          selectedTemplate.name,
                          templateParams
                        );
                        if (ok) {
                          success("Template sent", "WhatsApp template message queued");
                        } else {
                          toastError("Send failed", "Failed sending WhatsApp template message");
                        }
                        setSending(false);
                        setSelectedTemplate(null);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer"
                    >
                      Send Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
