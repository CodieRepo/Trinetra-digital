import React, { useState } from "react";
import { Lead, ConversationMessage } from "../../types/crm";
import { BhashTemplateType } from "../../types/bhash";
import { Send, FileText, Bot, User, CheckCheck, Loader2 } from "lucide-react";

interface ChatViewProps {
  lead: Lead | null;
  messages: ConversationMessage[];
  onSendMessage: (text: string, template?: BhashTemplateType) => Promise<void>;
}

export const ChatView: React.FC<ChatViewProps> = ({ lead, messages, onSendMessage }) => {
  const [inputText, setInputText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sending, setSending] = useState(false);

  const utilityTemplates: { label: string; value: BhashTemplateType }[] = [
    { label: "Consultation Received", value: "consultation_received" },
    { label: "Quotation Ready", value: "quotation_ready" },
    { label: "Proposal Shared", value: "proposal_shared" },
    { label: "Appointment Confirmed", value: "appointment_confirmed" },
    { label: "Invoice Ready", value: "invoice_ready" },
    { label: "Service Done", value: "service_done" },
    { label: "Support Ticket Created", value: "support_ticket_created" },
    { label: "Ticket Resolved", value: "ticket_resolved" },
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedTemplate) || sending || !lead) return;

    setSending(true);
    try {
      if (selectedTemplate) {
        await onSendMessage(inputText || `Template: ${selectedTemplate}`, selectedTemplate as BhashTemplateType);
      } else {
        await onSendMessage(inputText);
      }
      setInputText("");
      setSelectedTemplate("");
    } finally {
      setSending(false);
    }
  };

  if (!lead) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-8 text-slate-500">
        <Bot className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <p className="text-base font-medium">Select a WhatsApp lead to view conversation</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden">
      {/* Active Lead Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {lead.name}
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              {lead.phone}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Service: <span className="text-slate-200 font-medium">{lead.service_interest || "General Inquiry"}</span> • Current Flow Node: <span className="text-emerald-400 font-mono">Node {lead.current_flow_node}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
            {lead.status}
          </span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-12 text-sm">
            No messages logged for this contact yet.
          </div>
        ) : (
          messages.map((msg) => {
            const isInbound = msg.direction === "inbound";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${isInbound ? "mr-auto" : "ml-auto flex-row-reverse"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isInbound ? "bg-emerald-900/60 text-emerald-400 border border-emerald-700" : "bg-blue-900/60 text-blue-400 border border-blue-700"}`}>
                  {isInbound ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`p-3 rounded-2xl text-sm ${isInbound ? "bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none" : "bg-emerald-900/40 text-emerald-100 border border-emerald-800/60 rounded-tr-none"}`}>
                  <div className="whitespace-pre-wrap">{msg.message}</div>

                  {msg.flow_node && (
                    <div className="mt-2 text-[10px] font-mono text-emerald-400/80 bg-slate-950/60 px-2 py-0.5 rounded w-fit border border-slate-800">
                      Bhash Node: {msg.flow_node} {msg.button_clicked ? `(${msg.button_clicked})` : ''}
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between gap-4 text-[10px] text-slate-400">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {!isInbound && <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box & Template Dispatcher */}
      <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:border-emerald-500 w-full"
          >
            <option value="">-- Optional: Select BhashSMS Utility Template --</option>
            {utilityTemplates.map((t) => (
              <option key={t.value} value={t.value}>
                Template: {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder={selectedTemplate ? `Will send official ${selectedTemplate} template via BhashSMS...` : "Type WhatsApp response..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={sending || (!inputText.trim() && !selectedTemplate)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2 shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
