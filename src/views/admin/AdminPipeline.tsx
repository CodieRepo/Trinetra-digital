import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Phone, RefreshCw } from "lucide-react";
import { Lead, LeadStatus } from "../../types/crm";
import { CustomerProfileDrawer } from "../../components/inbox/CustomerProfileDrawer";
import { useRealtimeMessages } from "../../hooks/useRealtimeMessages";

const PIPELINE_STAGES: Array<{ key: LeadStatus; label: string; color: string }> = [
  { key: "new", label: "New Lead", color: "border-blue-500 text-blue-400 bg-blue-950/40" },
  { key: "contacted", label: "Contacted", color: "border-amber-500 text-amber-400 bg-amber-950/40" },
  { key: "qualified", label: "Qualified", color: "border-indigo-500 text-indigo-400 bg-indigo-950/40" },
  { key: "quotation", label: "Quotation", color: "border-purple-500 text-purple-400 bg-purple-950/40" },
  { key: "negotiation", label: "Negotiation", color: "border-violet-500 text-violet-400 bg-violet-950/40" },
  { key: "won", label: "Won 🏆", color: "border-emerald-500 text-emerald-400 bg-emerald-950/40" },
  { key: "lost", label: "Lost", color: "border-slate-600 text-slate-400 bg-slate-900/60" },
];

export default function AdminPipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const {
    lead: activeLead,
    timeline,
    tasks,
    notes,
    refetch: refetchDetails,
  } = useRealtimeMessages(selectedLeadId);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/leads?limit=200");
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error("Error fetching pipeline leads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStageMove = async (leadId: string, newStage: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStage, is_customer: newStage === "won" } : l))
    );

    try {
      await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_stage",
          leadId,
          status: newStage,
        }),
      });
      await fetchLeads();
    } catch (err) {
      console.error("Failed updating stage:", err);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) {
      handleStageMove(leadId, targetStage);
    }
    setDraggedLeadId(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] font-sans text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-base font-black text-slate-100 flex items-center gap-2">
            <span>📊 Sales Pipeline Kanban</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            {leads.length} Total Leads Across Pipeline Stages
          </p>
        </div>

        <button
          onClick={fetchLeads}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
          Loading pipeline stages...
        </div>
      ) : (
        <div className="flex-1 flex overflow-x-auto gap-4 pb-4 scrollbar-thin">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.status === stage.key);
            return (
              <div
                key={stage.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage.key)}
                className="w-72 shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col p-3 space-y-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.color.split(" ")[0].replace("border-", "bg-")}`} />
                    <span className="text-xs font-black text-slate-200 capitalize">{stage.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Stream */}
                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[calc(100vh-14rem)] pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                      Drop leads here
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("leadId", lead.id);
                          setDraggedLeadId(lead.id);
                        }}
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setIsDrawerOpen(true);
                        }}
                        className={`bg-slate-950 border border-slate-800 hover:border-indigo-500/50 p-3 rounded-xl cursor-grab transition-all space-y-2 group shadow-sm ${
                          draggedLeadId === lead.id ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-400">
                            {lead.name}
                          </h4>
                          <span
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                              lead.lead_temperature === "hot"
                                ? "bg-rose-950 text-rose-400 border border-rose-800"
                                : "bg-slate-900 text-slate-400"
                            }`}
                          >
                            {lead.lead_temperature || "warm"}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{lead.phone}</span>
                        </div>

                        {lead.last_message && (
                          <p className="text-[10px] text-slate-500 line-clamp-1 italic bg-slate-900/60 p-1.5 rounded-md border border-slate-800/50">
                            "{lead.last_message}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[9px] text-slate-500">
                          <span>Score: {lead.score || 50}/100</span>
                          <span>{new Date(lead.last_message_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Profile Drawer */}
      <CustomerProfileDrawer
        lead={activeLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        timeline={timeline}
        tasks={tasks}
        notes={notes}
        onUpdateStage={async (id, s) => {
          await handleStageMove(id, s);
          await refetchDetails();
        }}
        onAddNote={async (id, note) => {
          await fetch("/api/v1/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add_note", lead_id: id, note }),
          });
          await refetchDetails();
        }}
        onAddTask={async (id, title, priority, dueDate) => {
          await fetch("/api/v1/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add_task", lead_id: id, title, priority, due_date: dueDate }),
          });
          await refetchDetails();
        }}
        onReanalyzeAI={async (id) => {
          await fetch("/api/v1/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reanalyze_ai", leadId: id }),
          });
          await refetchDetails();
          await fetchLeads();
        }}
        onCompleteTask={async (taskId) => {
          await fetch("/api/v1/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "complete", taskId }),
          });
          await refetchDetails();
        }}
      />
    </div>
  );
}
