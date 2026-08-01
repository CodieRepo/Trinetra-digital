import React from "react";
import { DashboardMetrics } from "../../types/crm";
import { TrendingUp, PieChart, ArrowUpRight, BarChart2, Layers } from "lucide-react";

interface AnalyticsPanelProps {
  metrics: DashboardMetrics | null;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {/* Metric 1: Most Clicked Service */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
          <span>Most Clicked Service</span>
          <PieChart className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl font-bold text-white truncate">
          {metrics.mostClickedService ? metrics.mostClickedService.service : "N/A"}
        </div>
        <div className="text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1">
          <ArrowUpRight className="w-3.5 h-3.5" />
          {metrics.mostClickedService ? `${metrics.mostClickedService.count} Engagements` : "0 selections"}
        </div>
      </div>

      {/* Metric 2: Pricing Requests */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
          <span>Most Viewed Pricing Node</span>
          <BarChart2 className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-xl font-bold text-white">
          Node {metrics.mostViewedPricingNode?.node || "6225"}
        </div>
        <div className="text-xs text-blue-400 font-medium mt-1">
          {metrics.pricingRequests} Pricing Views
        </div>
      </div>

      {/* Metric 3: Top Drop-off Node */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
          <span>Flow Drop-off Point</span>
          <Layers className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl font-bold text-white">
          Node {metrics.topDropoffNode?.node || "6206"}
        </div>
        <div className="text-xs text-amber-400 font-medium mt-1">
          {metrics.topDropoffNode?.count || 0} active users at node
        </div>
      </div>

      {/* Metric 4: Lead Conversion Rate */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
          <span>Flow Conversion Rate</span>
          <TrendingUp className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-2xl font-bold text-white">
          {metrics.conversionRate}%
        </div>
        <div className="text-xs text-purple-400 font-medium mt-1">
          Reached Contact Confirmation (6232)
        </div>
      </div>
    </div>
  );
};
