import React, { useState } from "react";
import { Lead } from "../../types/crm";
import { MessageSquare, Flame, CheckCircle, Search } from "lucide-react";

interface LeadListProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
}

export const LeadList: React.FC<LeadListProps> = ({ leads, selectedLeadId, onSelectLead }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      (lead.service_interest && lead.service_interest.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "Interested" && lead.status === "Interested") ||
      (statusFilter === "hot" && lead.status === "hot") ||
      (statusFilter === "new" && lead.status === "new");

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Interested":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><CheckCircle className="w-3 h-3"/> Interested</span>;
      case "hot":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30"><Flame className="w-3 h-3"/> Hot Lead</span>;
      case "nurturing":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Nurturing</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">New</span>;
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            WhatsApp Inbox
          </h2>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {filteredLeads.length} Leads
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 text-slate-200 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
          {["all", "Interested", "hot", "new"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 rounded-md capitalize whitespace-nowrap transition-colors ${
                statusFilter === filter
                  ? "bg-emerald-600 text-white font-medium"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {filter === "all" ? "All Leads" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Lead Cards Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No WhatsApp leads found.
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isSelected = lead.id === selectedLeadId;
            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className={`p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-slate-800/90 border-l-4 border-emerald-500"
                    : "hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-semibold text-slate-100 text-sm truncate max-w-[160px]">
                    {lead.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(lead.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="text-xs text-slate-400 mb-2 font-mono">
                  {lead.phone}
                </div>

                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(lead.status)}
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                    Node {lead.current_flow_node}
                  </span>
                </div>

                {lead.last_message && (
                  <p className="mt-2 text-xs text-slate-400 line-clamp-1 italic">
                    "{lead.last_message}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
