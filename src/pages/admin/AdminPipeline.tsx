import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { apiService, PipelineLead, PipelineStageGroup, ForecastData, PipelineAuditEntry } from '../../services/api';
import { getDisplayName } from '../../utils/contact';

// ─── Types & Constants ────────────────────────────────────────────────────────

const STAGES = [
  { key: 'new', label: 'New Leads', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'ai_qualifying', label: 'AI Qualifying', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'qualified', label: 'Qualified', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { key: 'nurturing', label: 'Nurturing', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { key: 'won', label: 'Won 🏆', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  { key: 'lost', label: 'Lost', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
];

const INTENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  HOT: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  QUOTATION_REQUIRED: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  WARM: { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
  COLD: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
};

function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProbabilityRing({ probability, size = 36 }: { probability: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (probability / 100) * circ;
  const color = probability >= 70 ? '#10b981' : probability >= 40 ? '#f59e0b' : '#6b7280';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      <text
        x={size / 2} y={size / 2 + 4}
        textAnchor="middle" fontSize={9} fill={color}
        style={{ transform: `rotate(90deg) translate(0, -${size}px)`, fontWeight: 700 }}
      >{probability}%</text>
    </svg>
  );
}

function LeadCard({
  lead, onMoveStage, onSetProbability, onViewAudit, onSetDealValues
}: {
  lead: PipelineLead;
  onMoveStage: (lead: PipelineLead) => void;
  onSetProbability: (lead: PipelineLead) => void;
  onViewAudit: (lead: PipelineLead) => void;
  onSetDealValues: (lead: PipelineLead) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const intentStyle = INTENT_COLORS[lead.intent_level || 'COLD'] || INTENT_COLORS.COLD;

  const borderColor =
    lead.is_stuck_14d ? 'border-rose-500' :
    lead.is_stuck_7d ? 'border-amber-500' : 'border-slate-200/80';

  const pulseClass =
    lead.is_stuck_14d ? 'shadow-[0_0_0_2px_rgba(239,68,68,0.2)] animate-[stuck-pulse_2s_infinite]' :
    lead.is_stuck_7d ? 'shadow-[0_0_0_2px_rgba(245,158,11,0.2)]' : 'shadow-3xs';

  const computedAnnual = (lead.deal_setup_value || 0) + (lead.deal_mrr || 0) * 12;
  const computedExpected = (computedAnnual * (lead.deal_probability || 0)) / 100;

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('leadId', lead.id);
        e.dataTransfer.setData('leadName', getDisplayName(lead));
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`bg-white border p-3 rounded-xl cursor-grab transition-all select-none space-y-2.5 ${borderColor} ${pulseClass} ${
        dragging ? 'opacity-40' : 'opacity-100 hover:shadow-2xs'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 justify-between">
        <div className="min-w-0">
          <p className="font-extrabold text-[12px] text-slate-800 truncate">{getDisplayName(lead)}</p>
          {lead.company && <p className="text-[9px] text-slate-400 truncate mt-0.5">{lead.company}</p>}
        </div>
        <ProbabilityRing probability={lead.deal_probability} />
      </div>

      {/* Intent badge + days in stage */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black"
          style={{ backgroundColor: intentStyle.bg, color: intentStyle.text }}
        >
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: intentStyle.dot }} />
          {lead.intent_level || 'COLD'}
        </span>
        <span className={`text-[9px] font-bold ${
          lead.is_stuck_14d ? 'text-rose-600' : lead.is_stuck_7d ? 'text-amber-600' : 'text-slate-400'
        }`}>
          {lead.is_stuck_14d ? '🚨' : lead.is_stuck_7d ? '⚠️' : '⏱'} {lead.days_in_stage}d in stage
        </span>
        {lead.is_no_reply_30d && (
          <span className="text-[8px] text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded font-extrabold">📵 silent</span>
        )}
      </div>

      {/* Revenue block */}
      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 grid grid-cols-2 gap-1.5 text-[9px] font-sans">
        <div>
          <span className="text-slate-400 block">Setup</span>
          <span className="font-extrabold text-slate-700 mt-0.5 block">{formatINR(lead.deal_setup_value)}</span>
        </div>
        <div>
          <span className="text-slate-400 block">MRR</span>
          <span className="font-extrabold text-slate-700 mt-0.5 block">{formatINR(lead.deal_mrr)}</span>
        </div>
        <div className="border-t border-slate-200/50 pt-1">
          <span className="text-slate-400 block">Annual</span>
          <span className="font-extrabold text-indigo-600 mt-0.5 block">{formatINR(computedAnnual)}</span>
        </div>
        <div className="border-t border-slate-200/50 pt-1">
          <span className="text-slate-400 block">Expected</span>
          <span className="font-extrabold text-emerald-600 mt-0.5 block">{formatINR(computedExpected)}</span>
        </div>
      </div>

      {/* Package + owner + last activity */}
      <div className="flex flex-wrap gap-1 items-center text-[8px] font-bold">
        {lead.recommended_package && (
          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1 rounded truncate max-w-[80px]">
            {lead.recommended_package}
          </span>
        )}
        {lead.assigned_owner && (
          <span className="bg-sky-50 border border-sky-100 text-sky-700 px-1 rounded truncate max-w-[80px]">
            👤 {lead.assigned_owner}
          </span>
        )}
        <span className="text-slate-400 font-medium ml-auto">🕐 {relativeTime(lead.updated_at)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 pt-1.5 border-t border-slate-100 flex-wrap">
        <button onClick={() => onMoveStage(lead)} className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[8px] font-extrabold transition-colors cursor-pointer border-0">Stage</button>
        <button onClick={() => onSetProbability(lead)} className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[8px] font-extrabold transition-colors cursor-pointer border-0">Prob</button>
        <button onClick={() => onSetDealValues(lead)} className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[8px] font-extrabold transition-colors cursor-pointer border-0">Deal</button>
        <button onClick={() => onViewAudit(lead)} className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[8px] font-extrabold transition-colors cursor-pointer border-0">Log</button>
      </div>
    </div>
  );
}

// ─── Forecast Panel ───────────────────────────────────────────────────────────

function ForecastPanel({ forecast, loading }: { forecast: ForecastData | null; loading: boolean }) {
  const stat = (label: string, value: string, sub?: string, colorClass?: string) => (
    <div className="space-y-0.5">
      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">{label}</span>
      <p className={`text-base font-black font-mono leading-none ${colorClass || 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-[8px] text-slate-400 font-medium">{sub}</p>}
    </div>
  );

  if (loading || !forecast) return (
    <div className="flex flex-col items-center justify-center py-6 text-slate-400 text-[10px] font-bold gap-1.5">
      <Loader2 className="animate-spin text-emerald-500" size={16} />
      <span>Loading forecast...</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {stat('Pipeline Value', formatINR(forecast.pipeline_value), 'Active qualified leads', 'text-indigo-600')}
      {stat('Expected Revenue', formatINR(forecast.expected_revenue), 'Weighted by win-probability', 'text-emerald-600')}
      {stat('Won Revenue', formatINR(forecast.won_revenue), undefined, 'text-emerald-700')}
      {stat('Lost Revenue', formatINR(forecast.lost_revenue), undefined, 'text-rose-600')}
      
      <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-3.5 space-y-2.5">
        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Metrics Checklist</span>
        <div className="grid grid-cols-2 gap-3 text-[10px] font-sans">
          <div>
            <span className="text-slate-400 font-semibold block">Win Rate</span>
            <p className="text-sm font-black text-emerald-600 font-mono mt-0.5">{forecast.win_rate}%</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Avg Deal</span>
            <p className="text-sm font-black text-slate-700 font-mono mt-0.5">{formatINR(forecast.avg_deal_size)}</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Cycle Time</span>
            <p className="text-sm font-black text-slate-700 font-mono mt-0.5">{forecast.avg_sales_cycle_days}d</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Total Deals</span>
            <p className="text-sm font-black text-slate-700 font-mono mt-0.5">{forecast.total_leads_in_pipeline}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 className="font-extrabold text-[11px] uppercase text-slate-700 tracking-wider">{title}</h4>
          <button onClick={onClose} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-slate-100 border-0 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors text-xs font-bold">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPipeline() {
  const [groups, setGroups] = useState<PipelineStageGroup[]>([]);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [forecastPeriod, setForecastPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [forecastLoading, setForecastLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  // Modals
  const [moveModal, setMoveModal] = useState<{ lead: PipelineLead } | null>(null);
  const [moveStage, setMoveStage] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [probModal, setProbModal] = useState<{ lead: PipelineLead } | null>(null);
  const [probValue, setProbValue] = useState('');
  const [dealModal, setDealModal] = useState<{ lead: PipelineLead } | null>(null);
  const [dealSetup, setDealSetup] = useState('');
  const [dealMrr, setDealMrr] = useState('');
  const [auditModal, setAuditModal] = useState<{ lead: PipelineLead; entries: PipelineAuditEntry[] } | null>(null);
  const [dropConfirm, setDropConfirm] = useState<{ leadId: string; leadName: string; newStage: string } | null>(null);
  const [dropReason, setDropReason] = useState('');

  const loadPipeline = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.pipeline.getBoard();
      setGroups(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadForecast = useCallback(async (period: 'month' | 'quarter' | 'year') => {
    setForecastLoading(true);
    try {
      const data = await apiService.pipeline.getForecast(period);
      setForecast(data);
    } catch {}
    setForecastLoading(false);
  }, []);

  useEffect(() => { loadPipeline(); }, [loadPipeline]);
  useEffect(() => { loadForecast(forecastPeriod); }, [forecastPeriod, loadForecast]);

  // ── Drag and Drop ──────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragTarget(null);
    const leadId = e.dataTransfer.getData('leadId');
    const leadName = e.dataTransfer.getData('leadName');
    if (!leadId || !leadName) return;
    setDropReason('');
    setDropConfirm({ leadId, leadName, newStage: targetStage });
  };

  const confirmDrop = async () => {
    if (!dropConfirm) return;
    try {
      await apiService.pipeline.moveStage(dropConfirm.leadId, dropConfirm.newStage, dropReason || undefined);
      setDropConfirm(null);
      await loadPipeline();
      await loadForecast(forecastPeriod);
    } catch (e: any) {
      alert('Stage move failed: ' + e.message);
    }
  };

  // ── Move Stage Modal ───────────────────────────────────────────────────────

  const submitMove = async () => {
    if (!moveModal || !moveStage) return;
    try {
      await apiService.pipeline.moveStage(moveModal.lead.id, moveStage, moveReason || undefined);
      setMoveModal(null); setMoveStage(''); setMoveReason('');
      await loadPipeline(); await loadForecast(forecastPeriod);
    } catch (e: any) { alert('Move failed: ' + e.message); }
  };

  // ── Probability Override ──────────────────────────────────────────────────

  const submitProb = async () => {
    if (!probModal) return;
    const v = parseFloat(probValue);
    if (isNaN(v) || v < 0 || v > 100) return alert('Enter a number 0–100');
    try {
      await apiService.pipeline.updateProbability(probModal.lead.id, v);
      setProbModal(null); setProbValue('');
      await loadPipeline(); await loadForecast(forecastPeriod);
    } catch (e: any) { alert('Update failed: ' + e.message); }
  };

  // ── Deal Values ────────────────────────────────────────────────────────────

  const submitDeal = async () => {
    if (!dealModal) return;
    try {
      await apiService.pipeline.updateDealValues(dealModal.lead.id, {
        setup_value: dealSetup ? parseFloat(dealSetup) : undefined,
        mrr: dealMrr ? parseFloat(dealMrr) : undefined,
      });
      setDealModal(null); setDealSetup(''); setDealMrr('');
      await loadPipeline(); await loadForecast(forecastPeriod);
    } catch (e: any) { alert('Update failed: ' + e.message); }
  };

  // ── Audit Trail ────────────────────────────────────────────────────────────

  const openAudit = async (lead: PipelineLead) => {
    const entries = await apiService.pipeline.getAuditTrail(lead.id);
    setAuditModal({ lead, entries });
  };

  // ── Velocity metrics from groups ──────────────────────────────────────────

  const allLeads = groups.flatMap(g => g.leads);
  const stuckLeads = allLeads.filter(l => l.is_stuck_7d);
  const noReplyLeads = allLeads.filter(l => l.is_no_reply_30d);
  const totalPipelineValue = groups
    .filter(g => !['won', 'lost'].includes(g.stage))
    .reduce((s, g) => s + g.total_pipeline_value, 0);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full items-start font-sans">
      <style>{`
        @keyframes stuck-pulse { 0%,100% { box-shadow: 0 0 0 2px rgba(239,68,68,0.2); } 50% { box-shadow: 0 0 0 4px rgba(239,68,68,0.35); } }
        .pipe-column::-webkit-scrollbar { width: 4px; }
        .pipe-column::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* ── Main Kanban Area ── */}
      <div className="flex-1 w-full bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-5 shadow-3xs flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">📊 Sales Pipeline</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{allLeads.length} leads · {formatINR(totalPipelineValue)} pipeline value</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {stuckLeads.length > 0 && (
              <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-3xs">
                ⚠️ {stuckLeads.length} stuck
              </span>
            )}
            {noReplyLeads.length > 0 && (
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-3xs">
                📵 {noReplyLeads.length} silent
              </span>
            )}
            <button onClick={loadPipeline} className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold transition-all shadow-3xs cursor-pointer border border-slate-200">
              ⟳ Refresh
            </button>
          </div>
        </div>

        {/* Kanban columns */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs font-semibold gap-2">
            <Loader2 className="animate-spin text-emerald-500" size={20} />
            <span>Loading pipeline...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-rose-500 text-xs font-semibold">
            {error}
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 py-4 min-h-[450px] scrollbar-thin">
            {STAGES.map(stage => {
              const group = groups.find(g => g.stage === stage.key);
              const leads = group?.leads || [];
              const isTarget = dragTarget === stage.key;

              return (
                <div
                  key={stage.key}
                  onDragOver={e => { e.preventDefault(); setDragTarget(stage.key); }}
                  onDragLeave={() => setDragTarget(null)}
                  onDrop={e => handleDrop(e, stage.key)}
                  className={`w-[250px] shrink-0 rounded-2xl border flex flex-col p-3 space-y-3 transition-all ${
                    isTarget 
                      ? 'bg-blue-50/40 border-accent/40 shadow-xs' 
                      : 'border-slate-200/60'
                  }`}
                  style={{ backgroundColor: stage.bg }}
                >
                  {/* Column header */}
                  <div className="pb-2 border-b border-slate-200/60 flex-shrink-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: stage.color }}>{stage.label}</span>
                      <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: stage.color }}>
                        {leads.length}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 font-medium">
                      {formatINR(group?.total_pipeline_value || 0)} value ·{' '}
                      <span className="text-emerald-600 font-semibold">{formatINR(group?.total_expected_revenue || 0)} exp</span>
                    </div>
                  </div>

                  {/* Cards container */}
                  <div className="pipe-column flex-1 overflow-y-auto space-y-3 max-h-[380px] pr-1">
                    {leads.length === 0 ? (
                      <div className="text-center text-slate-300 text-[10px] py-12 italic border border-dashed border-slate-200 rounded-xl">
                        Drop leads here
                      </div>
                    ) : (
                      leads.map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onMoveStage={l => { setMoveModal({ lead: l }); setMoveStage(''); setMoveReason(''); }}
                          onSetProbability={l => { setProbModal({ lead: l }); setProbValue(String(l.deal_probability)); }}
                          onSetDealValues={l => { setDealModal({ lead: l }); setDealSetup(String(l.deal_setup_value)); setDealMrr(String(l.deal_mrr)); }}
                          onViewAudit={openAudit}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Forecast Panel ── */}
      <div className="w-full lg:w-72 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-5 shadow-3xs space-y-5 flex-shrink-0">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Revenue Forecast</h4>
          <div className="flex gap-1.5 mt-3">
            {(['month', 'quarter', 'year'] as const).map(p => (
              <button
                key={p}
                onClick={() => setForecastPeriod(p)}
                className={`flex-1 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  forecastPeriod === p 
                    ? 'bg-slate-800 text-white border-slate-800' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {p === 'month' ? 'Month' : p === 'quarter' ? 'Quarter' : 'Year'}
              </button>
            ))}
          </div>
        </div>

        <ForecastPanel forecast={forecast} loading={forecastLoading} />
        
        {/* Pipeline Velocity */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pipeline Velocity</h4>
          <div className="grid gap-2.5">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3">
              <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider">Active Pipeline</span>
              <p className="text-base font-black text-emerald-800 font-mono mt-0.5">{formatINR(totalPipelineValue)}</p>
            </div>
            
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 space-y-1">
              <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider">⚠️ Stuck Leads</span>
              <p className="text-base font-black text-amber-800 font-mono">{stuckLeads.length} leads</p>
              <p className="text-[9px] text-amber-500 font-medium">{stuckLeads.filter(l => l.is_stuck_14d).length} require escalation</p>
            </div>
            
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3 space-y-1">
              <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider">📵 No Reply</span>
              <p className="text-base font-black text-indigo-800 font-mono">{noReplyLeads.length} leads</p>
              <p className="text-[9px] text-indigo-500 font-medium">30+ days silent</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Drop Confirmation Modal ── */}
      {dropConfirm && (
        <Modal title="Confirm Stage Move" onClose={() => setDropConfirm(null)}>
          <div className="text-xs text-slate-600 mb-3.5">
            Move <strong>{dropConfirm.leadName}</strong> to <strong className="text-indigo-600">
              {STAGES.find(s => s.key === dropConfirm.newStage)?.label || dropConfirm.newStage}
            </strong>?
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Reason (optional)</label>
            <textarea
              value={dropReason}
              onChange={e => setDropReason(e.target.value)}
              placeholder="e.g. Customer confirmed budget availability"
              rows={3}
              className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={confirmDrop} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors">Confirm Move</button>
            <button onClick={() => setDropConfirm(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Move Stage Modal ── */}
      {moveModal && (
        <Modal title={`Move: ${getDisplayName(moveModal.lead)}`} onClose={() => setMoveModal(null)}>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">New Stage</label>
              <select
                value={moveStage}
                onChange={e => setMoveStage(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-colors"
              >
                <option value="">Select stage...</option>
                {STAGES.filter(s => s.key !== moveModal.lead.lead_stage).map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Reason (recorded in log)</label>
              <textarea
                value={moveReason}
                onChange={e => setMoveReason(e.target.value)}
                rows={2}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-colors"
                placeholder="e.g. Follow-up call completed"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={submitMove} disabled={!moveStage} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors disabled:opacity-50">Move Stage</button>
            <button onClick={() => setMoveModal(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Probability Modal ── */}
      {probModal && (
        <Modal title={`Win Probability: ${getDisplayName(probModal.lead)}`} onClose={() => setProbModal(null)}>
          <div className="text-[10px] text-slate-500 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-100 flex justify-between">
            <span>Current: <strong>{probModal.lead.deal_probability}%</strong></span>
            <span>Intent: <strong className="text-slate-700">{probModal.lead.intent_level || 'COLD'}</strong></span>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">New Probability (0–100%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={probValue}
                onChange={e => setProbValue(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
            {probValue && !isNaN(parseFloat(probValue)) && (
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>Expected Revenue:</span>
                <strong className="text-emerald-600">{formatINR(probModal.lead.deal_annual_value * parseFloat(probValue) / 100)}</strong>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={submitProb} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors">Update</button>
            <button onClick={() => setProbModal(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Deal Values Modal ── */}
      {dealModal && (
        <Modal title={`Deal Values: ${getDisplayName(dealModal.lead)}`} onClose={() => setDealModal(null)}>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mb-3 bg-slate-50/70 border border-slate-150 rounded-xl p-2.5">
            <div>Setup: <strong>{formatINR(dealModal.lead.deal_setup_value)}</strong></div>
            <div>MRR: <strong>{formatINR(dealModal.lead.deal_mrr)}</strong></div>
            <div>Annual: <strong className="text-indigo-600">{formatINR(dealModal.lead.deal_annual_value)}</strong></div>
            <div>Expected: <strong className="text-emerald-600">{formatINR(dealModal.lead.expected_revenue)}</strong></div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Setup Value (₹)</label>
              <input
                type="number"
                value={dealSetup}
                onChange={e => setDealSetup(e.target.value)}
                placeholder="29999"
                className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">MRR (₹/mo)</label>
              <input
                type="number"
                value={dealMrr}
                onChange={e => setDealMrr(e.target.value)}
                placeholder="5999"
                className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>
          {dealSetup && dealMrr && (
            <div className="text-[10px] text-slate-500 mt-3 bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 flex justify-between items-center">
              <span>Annualized Value:</span>
              <strong className="text-emerald-700 text-xs">{formatINR(parseFloat(dealSetup || '0') + parseFloat(dealMrr || '0') * 12)}</strong>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={submitDeal} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors">Update Values</button>
            <button onClick={() => setDealModal(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Audit Trail Modal ── */}
      {auditModal && (
        <Modal title={`Pipeline Audit: ${getDisplayName(auditModal.lead)}`} onClose={() => setAuditModal(null)}>
          {auditModal.entries.length === 0 ? (
            <div className="text-slate-400 text-center py-6 text-xs italic">No stage movements recorded yet.</div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {auditModal.entries.map(e => (
                <div key={e.id} className="border-l-2 border-indigo-500 pl-3 py-0.5 space-y-0.5">
                  <div className="text-[11px] font-bold text-slate-800">
                    {e.old_stage} → <span className="text-indigo-600">{e.new_stage}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium">
                    by <strong>{e.changed_by}</strong> · {new Date(e.timestamp).toLocaleString('en-IN')}
                  </div>
                  {e.reason && <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1 rounded">"{e.reason}"</p>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
