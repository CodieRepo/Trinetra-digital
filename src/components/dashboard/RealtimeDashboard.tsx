import React from "react";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useRealtimeLeads } from "../../hooks/useRealtimeLeads";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { Users, Flame, CheckCircle, MessageSquare, Zap, Clock } from "lucide-react";

export const RealtimeDashboard: React.FC = () => {
  const { metrics } = useAnalytics();
  const { leads } = useRealtimeLeads();

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400" />
            BhashSMS Realtime WhatsApp CRM
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live flow telemetry, automated node tracking, and instant contact requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Supabase Realtime Sync
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Leads */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Leads</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.totalLeads || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">All-time WhatsApp Contacts</div>
        </div>

        {/* Card 2: Live Active Leads */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Live / Active Chats</span>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{metrics?.liveLeads || 0}</div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Currently in Bhash Flow</div>
        </div>

        {/* Card 3: Interested Leads (Node 6232) */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Interested Leads</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.interestedLeads || 0}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">Node 6232 Contact Reached</div>
        </div>

        {/* Card 4: Hot Leads */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Hot Leads</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{metrics?.hotLeads || 0}</div>
          <div className="text-[11px] text-amber-500/80 mt-1">Pricing & Portfolio Viewers</div>
        </div>

        {/* Card 5: Today's New Leads */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Today's Leads</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics?.todayLeads || 0}</div>
          <div className="text-[11px] text-blue-400 mt-1">Joined in last 24h</div>
        </div>
      </div>

      {/* Analytics Panel Component */}
      <AnalyticsPanel metrics={metrics} />

      {/* Recent Activity Table */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Recent WhatsApp Flow Activity
          </h2>
          <span className="text-xs text-slate-400">Updates instantly via Webhooks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Lead Phone</th>
                <th className="p-3">Lead Name</th>
                <th className="p-3">Service Interest</th>
                <th className="p-3">Flow Node</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No active WhatsApp flow activity recorded yet.
                  </td>
                </tr>
              ) : (
                leads.slice(0, 8).map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-emerald-400 font-semibold">{lead.phone}</td>
                    <td className="p-3 font-medium text-slate-200">{lead.name}</td>
                    <td className="p-3 text-slate-300">{lead.service_interest || "General Inquiry"}</td>
                    <td className="p-3 font-mono text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                        Node {lead.current_flow_node}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${lead.status === 'Interested' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{new Date(lead.last_message_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
