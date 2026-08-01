import React, { useState } from "react";
import { Lead } from "../../types/crm";
import { MessageSquare, Search } from "lucide-react";

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
      (lead.company && lead.company.toLowerCase().includes(search.toLowerCase())) ||
      (lead.last_message && lead.last_message.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Smart Lead Inbox
          </h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
            {filteredLeads.length} Leads
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
          {["all", "new", "contacted", "qualified", "won"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-colors border-0 cursor-pointer font-bold ${
                statusFilter === filter
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {filter === "all" ? "All" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Lead Cards Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No matching leads found.
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isSelected = lead.id === selectedLeadId;
            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-indigo-950/40 border-l-4 border-indigo-500"
                    : "hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-bold text-slate-100 text-xs truncate max-w-[170px]">
                    {lead.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(lead.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 mb-2 font-mono flex items-center gap-2">
                  <span>{lead.phone}</span>
                  {lead.company && <span className="text-slate-500">• {lead.company}</span>}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-800 text-indigo-300 border border-slate-700">
                    {lead.status}
                  </span>

                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      lead.lead_temperature === "hot"
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {lead.lead_temperature || "warm"}
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
