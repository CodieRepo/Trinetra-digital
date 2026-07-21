import React, { useState } from "react";
import { useRealtimeLeads } from "../../hooks/useRealtimeLeads";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";
import { LeadList } from "./LeadList";
import { ChatView } from "./ChatView";
import { LeadDetailsPanel } from "./LeadDetailsPanel";
import { BhashTemplateType } from "../../types/bhash";

export const WhatsAppInbox: React.FC = () => {
  const { leads, loading: leadsLoading } = useRealtimeLeads();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Set default selected lead if none selected
  const activeLeadId = selectedLeadId || (leads.length > 0 ? leads[0].id : null);

  const {
    lead,
    messages,
    timeline,
    tasks,
    notes,
    refetch,
  } = useRealtimeMessages(activeLeadId);

  const handleSendMessage = async (text: string, template?: BhashTemplateType) => {
    if (!lead) return;

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          phone: lead.phone,
          text: text,
          template: template,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(`Failed to send message: ${data.error}`);
      } else {
        await refetch();
      }
    } catch (err: any) {
      alert(`Error sending message: ${err.message}`);
    }
  };

  const handleAddNote = async (note: string) => {
    if (!lead) return;
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_note",
        leadId: lead.id,
        note: note,
      }),
    });
    await refetch();
  };

  const handleAddTask = async (title: string, priority: string) => {
    if (!lead) return;
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_task",
        leadId: lead.id,
        taskTitle: title,
        priority: priority,
      }),
    });
    await refetch();
  };

  if (leadsLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading WhatsApp CRM Inbox...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden font-sans border-t border-slate-800">
      {/* Column 1: Lead List */}
      <LeadList
        leads={leads}
        selectedLeadId={activeLeadId}
        onSelectLead={(id) => setSelectedLeadId(id)}
      />

      {/* Column 2: Chat View */}
      <ChatView
        lead={lead}
        messages={messages}
        onSendMessage={handleSendMessage}
      />

      {/* Column 3: Lead Details Panel */}
      <LeadDetailsPanel
        lead={lead}
        timeline={timeline}
        tasks={tasks}
        notes={notes}
        onAddNote={handleAddNote}
        onAddTask={handleAddTask}
      />
    </div>
  );
};
