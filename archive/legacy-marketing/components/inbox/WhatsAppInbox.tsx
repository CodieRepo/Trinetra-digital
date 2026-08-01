import React, { useState } from "react";
import { useRealtimeLeads } from "../../hooks/useRealtimeLeads";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";
import { LeadList } from "./LeadList";
import { ChatView } from "./ChatView";
import { CustomerProfileDrawer } from "./CustomerProfileDrawer";
import { GlobalSearchBar } from "../dashboard/GlobalSearchBar";
import { User } from "lucide-react";
import { LeadStatus } from "../../types/crm";

export const WhatsAppInbox: React.FC = () => {
  const { leads, loading: leadsLoading, refetch: refetchLeads } = useRealtimeLeads();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeLeadId = selectedLeadId || (leads.length > 0 ? leads[0].id : null);

  const {
    lead,
    messages,
    timeline,
    tasks,
    notes,
    refetch: refetchDetails,
  } = useRealtimeMessages(activeLeadId);

  const handleSendMessage = async (text: string) => {
    if (!lead) return;
    try {
      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          phone: lead.phone,
          text: text,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(`Failed to send message: ${data.error}`);
      } else {
        await refetchDetails();
        await refetchLeads();
      }
    } catch (err: any) {
      alert(`Error sending message: ${err.message}`);
    }
  };

  const handleUpdateStage = async (leadId: string, stage: LeadStatus) => {
    await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_stage",
        leadId: leadId,
        status: stage,
      }),
    });
    await refetchDetails();
    await refetchLeads();
  };

  const handleAddNote = async (leadId: string, note: string) => {
    await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_note",
        lead_id: leadId,
        note: note,
      }),
    });
    await refetchDetails();
  };

  const handleAddTask = async (leadId: string, title: string, priority: string, dueDate: string) => {
    await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_task",
        lead_id: leadId,
        title: title,
        priority: priority,
        due_date: dueDate,
      }),
    });
    await refetchDetails();
  };

  const handleReanalyzeAI = async (leadId: string) => {
    await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reanalyze_ai",
        leadId: leadId,
      }),
    });
    await refetchDetails();
  };

  const handleCompleteTask = async (taskId: string) => {
    await fetch("/api/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        taskId: taskId,
      }),
    });
    await refetchDetails();
  };

  if (leadsLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading Operating System Inbox...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden font-sans border-t border-slate-800">
      {/* Top Header Bar with Global Search & Drawer Trigger */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <GlobalSearchBar
          onSelectLead={(l) => {
            setSelectedLeadId(l.id);
            setIsDrawerOpen(true);
          }}
        />

        {lead && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all border-0 cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            <User className="w-4 h-4" />
            <span>Open Customer Profile</span>
          </button>
        )}
      </div>

      {/* Main Inbox View */}
      <div className="flex flex-1 min-h-0">
        <LeadList
          leads={leads}
          selectedLeadId={activeLeadId}
          onSelectLead={(id) => setSelectedLeadId(id)}
        />

        <ChatView
          lead={lead}
          messages={messages}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* Customer Profile 360 Drawer */}
      <CustomerProfileDrawer
        lead={lead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        timeline={timeline}
        tasks={tasks}
        notes={notes}
        onUpdateStage={handleUpdateStage}
        onAddNote={handleAddNote}
        onAddTask={handleAddTask}
        onReanalyzeAI={handleReanalyzeAI}
        onCompleteTask={handleCompleteTask}
      />
    </div>
  );
};
