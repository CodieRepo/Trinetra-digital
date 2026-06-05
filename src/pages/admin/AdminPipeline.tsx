import React, { useState, useEffect, useCallback } from 'react';
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
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
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
    lead.is_stuck_14d ? '#ef4444' :
    lead.is_stuck_7d ? '#f59e0b' : '#e5e7eb';

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 10,
    border: `1.5px solid ${borderColor}`,
    padding: '12px 14px',
    marginBottom: 10,
    cursor: 'grab',
    opacity: dragging ? 0.5 : 1,
    boxShadow: dragging
      ? '0 8px 24px rgba(0,0,0,0.15)'
      : lead.is_stuck_14d
        ? '0 0 0 2px rgba(239,68,68,0.25)'
        : lead.is_stuck_7d
          ? '0 0 0 2px rgba(245,158,11,0.25)'
          : '0 1px 3px rgba(0,0,0,0.07)',
    animation: lead.is_stuck_14d ? 'stuck-pulse 2s infinite' : 'none',
    transition: 'box-shadow 0.2s, border-color 0.2s',
    userSelect: 'none',
  };

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('leadId', lead.id); e.dataTransfer.setData('leadName', getDisplayName(lead)); setDragging(true); }}
      onDragEnd={() => setDragging(false)}
      style={cardStyle}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 2 }}>{getDisplayName(lead)}</div>
          {lead.company && <div style={{ fontSize: 11, color: '#64748b' }}>{lead.company}</div>}
        </div>
        <ProbabilityRing probability={lead.deal_probability} />
      </div>

      {/* Intent badge + days in stage */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: intentStyle.bg, color: intentStyle.text,
          borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: intentStyle.dot, display: 'inline-block' }} />
          {lead.intent_level || 'COLD'}
        </span>
        <span style={{
          fontSize: 10, color: lead.is_stuck_14d ? '#dc2626' : lead.is_stuck_7d ? '#d97706' : '#64748b',
          fontWeight: lead.is_stuck_7d ? 700 : 400
        }}>
          {lead.is_stuck_14d ? '🚨' : lead.is_stuck_7d ? '⚠️' : '⏱'} {lead.days_in_stage}d in stage
        </span>
        {lead.is_no_reply_30d && (
          <span style={{ fontSize: 10, color: '#7c3aed' }}>📵 {lead.days_since_reply}d silent</span>
        )}
      </div>

      {/* Revenue block */}
      <div style={{
        background: '#f8fafc', borderRadius: 7, padding: '7px 10px', marginBottom: 8,
        fontSize: 11, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4
      }}>
        <div>
          <div style={{ color: '#94a3b8', marginBottom: 1 }}>Setup</div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(lead.deal_setup_value)}</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', marginBottom: 1 }}>MRR</div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(lead.deal_mrr)}</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', marginBottom: 1 }}>Annual</div>
          <div style={{ fontWeight: 700, color: '#6366f1' }}>{formatINR(lead.deal_annual_value)}</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', marginBottom: 1 }}>Expected</div>
          <div style={{ fontWeight: 700, color: '#10b981' }}>{formatINR(lead.expected_revenue)}</div>
        </div>
      </div>

      {/* Package + owner + last activity */}
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
        {lead.recommended_package && (
          <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 99, padding: '1px 7px', marginRight: 5 }}>
            {lead.recommended_package}
          </span>
        )}
        {lead.assigned_owner && (
          <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 99, padding: '1px 7px', marginRight: 5 }}>
            👤 {lead.assigned_owner}
          </span>
        )}
        <span>🕐 {relativeTime(lead.updated_at)}</span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <button onClick={() => onMoveStage(lead)} style={btnStyle('#6366f1', '#fff')}>⬆ Move</button>
        <button onClick={() => onSetProbability(lead)} style={btnStyle('#f59e0b', '#fff')}>% Prob</button>
        <button onClick={() => onSetDealValues(lead)} style={btnStyle('#10b981', '#fff')}>₹ Deal</button>
        <button onClick={() => onViewAudit(lead)} style={btnStyle('#e2e8f0', '#475569')}>📋 Log</button>
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg, color, border: 'none', borderRadius: 6, padding: '3px 9px',
    fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
  };
}

// ─── Forecast Panel ───────────────────────────────────────────────────────────

function ForecastPanel({ forecast, loading }: { forecast: ForecastData | null; loading: boolean }) {
  const stat = (label: string, value: string, sub?: string, color?: string) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || '#0f172a' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{sub}</div>}
    </div>
  );

  if (loading || !forecast) return (
    <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Loading forecast...</div>
  );

  return (
    <div>
      {stat('Pipeline Value', formatINR(forecast.pipeline_value), 'Active qualified leads', '#6366f1')}
      {stat('Expected Revenue', formatINR(forecast.expected_revenue), 'Probability-weighted', '#10b981')}
      {stat('Won Revenue', formatINR(forecast.won_revenue), undefined, '#059669')}
      {stat('Lost Revenue', formatINR(forecast.lost_revenue), undefined, '#dc2626')}
      <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Deal Metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
          <div><div style={{ color: '#94a3b8' }}>Win Rate</div><div style={{ fontWeight: 800, fontSize: 14, color: '#10b981' }}>{forecast.win_rate}%</div></div>
          <div><div style={{ color: '#94a3b8' }}>Avg Deal</div><div style={{ fontWeight: 800, fontSize: 14 }}>{formatINR(forecast.avg_deal_size)}</div></div>
          <div><div style={{ color: '#94a3b8' }}>Avg Cycle</div><div style={{ fontWeight: 800, fontSize: 14 }}>{forecast.avg_sales_cycle_days}d</div></div>
          <div><div style={{ color: '#94a3b8' }}>In Pipeline</div><div style={{ fontWeight: 800, fontSize: 14 }}>{forecast.total_leads_in_pipeline}</div></div>
        </div>
      </div>
      <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '10px 12px' }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Movement</div>
        <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div>🏆 Won: <strong>{forecast.leads_moved_to_won}</strong></div>
          <div>💔 Lost: <strong>{forecast.leads_moved_to_lost}</strong></div>
        </div>
      </div>
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}>✕</button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
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
    <div style={{ display: 'flex', height: '100%', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes stuck-pulse { 0%,100% { box-shadow: 0 0 0 2px rgba(239,68,68,0.25); } 50% { box-shadow: 0 0 0 4px rgba(239,68,68,0.4); } }
        .pipe-column::-webkit-scrollbar { width: 4px; }
        .pipe-column::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .drop-zone-active { background: #eff6ff !important; border: 2px dashed #6366f1 !important; }
      `}</style>

      {/* ── Main Kanban Area ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>📊 Sales Pipeline</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{allLeads.length} leads · {formatINR(totalPipelineValue)} pipeline value</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {stuckLeads.length > 0 && (
              <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                ⚠️ {stuckLeads.length} stuck
              </span>
            )}
            {noReplyLeads.length > 0 && (
              <span style={{ background: '#f3e8ff', color: '#6b21a8', borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                📵 {noReplyLeads.length} silent
              </span>
            )}
            <button onClick={loadPipeline} style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 14px',
              fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#475569'
            }}>⟳ Refresh</button>
          </div>
        </div>

        {/* Kanban columns */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
            Loading pipeline...
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 14 }}>
            {error}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden', padding: '16px', gap: 14 }}>
            {STAGES.map(stage => {
              const group = groups.find(g => g.stage === stage.key);
              const leads = group?.leads || [];
              const isTarget = dragTarget === stage.key;

              return (
                <div
                  key={stage.key}
                  className={isTarget ? 'drop-zone-active' : ''}
                  onDragOver={e => { e.preventDefault(); setDragTarget(stage.key); }}
                  onDragLeave={() => setDragTarget(null)}
                  onDrop={e => handleDrop(e, stage.key)}
                  style={{
                    width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
                    background: stage.bg, borderRadius: 12,
                    border: `1.5px solid ${isTarget ? '#6366f1' : stage.border}`,
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  {/* Column header */}
                  <div style={{ padding: '12px 14px', borderBottom: `2px solid ${stage.border}`, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: stage.color }}>{stage.label}</span>
                      <span style={{
                        background: stage.color, color: '#fff', borderRadius: 99,
                        padding: '1px 8px', fontSize: 11, fontWeight: 700
                      }}>{leads.length}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                      {formatINR(group?.total_pipeline_value || 0)} pipeline ·{' '}
                      <span style={{ color: '#10b981' }}>{formatINR(group?.total_expected_revenue || 0)} exp</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="pipe-column" style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 8px' }}>
                    {leads.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 12, paddingTop: 20 }}>
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

      {/* ── Right: Forecast Sidebar ──────────────────────────────────────── */}
      <div style={{
        width: 240, flexShrink: 0, background: '#fff', borderLeft: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', overflowY: 'auto'
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 10 }}>Revenue Forecast</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['month', 'quarter', 'year'] as const).map(p => (
              <button
                key={p}
                onClick={() => setForecastPeriod(p)}
                style={{
                  flex: 1, padding: '4px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontSize: 10, fontWeight: 700,
                  background: forecastPeriod === p ? '#6366f1' : '#f1f5f9',
                  color: forecastPeriod === p ? '#fff' : '#475569',
                  transition: 'background 0.15s',
                }}
              >
                {p === 'month' ? 'Month' : p === 'quarter' ? 'Quarter' : 'Year'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '16px' }}>
          <ForecastPanel forecast={forecast} loading={forecastLoading} />
        </div>

        {/* Velocity metrics */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 10, marginTop: 4 }}>Pipeline Velocity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
            <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ color: '#064e3b', fontWeight: 700, marginBottom: 2 }}>Active Pipeline</div>
              <div style={{ color: '#10b981', fontSize: 15, fontWeight: 800 }}>{formatINR(totalPipelineValue)}</div>
            </div>
            <div style={{ background: '#fef9c3', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ color: '#854d0e', fontWeight: 700, marginBottom: 2 }}>⚠️ Stuck Leads</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#92400e' }}>{stuckLeads.length} leads</div>
              <div style={{ color: '#a16207', marginTop: 2 }}>{stuckLeads.filter(l => l.is_stuck_14d).length} need escalation</div>
            </div>
            <div style={{ background: '#f3e8ff', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ color: '#6b21a8', fontWeight: 700, marginBottom: 2 }}>📵 No Reply</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#7c3aed' }}>{noReplyLeads.length} leads</div>
              <div style={{ color: '#6b21a8', marginTop: 2 }}>30+ days silent</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Drop Confirmation Modal ─────────────────────────────────────── */}
      {dropConfirm && (
        <Modal title="Confirm Stage Move" onClose={() => setDropConfirm(null)}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>
            Move <strong>{dropConfirm.leadName}</strong> to <strong style={{ color: '#6366f1' }}>
              {STAGES.find(s => s.key === dropConfirm.newStage)?.label || dropConfirm.newStage}
            </strong>?
          </div>
          <label style={labelStyle}>Reason (optional — recorded in audit trail)</label>
          <textarea
            value={dropReason}
            onChange={e => setDropReason(e.target.value)}
            placeholder="e.g. Customer confirmed budget availability"
            rows={3}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={confirmDrop} style={{ ...actionBtn('#6366f1'), flex: 1 }}>✓ Confirm Move</button>
            <button onClick={() => setDropConfirm(null)} style={{ ...actionBtn('#f1f5f9'), color: '#475569', flex: 1 }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Move Stage Modal ────────────────────────────────────────────── */}
      {moveModal && (
        <Modal title={`Move: ${getDisplayName(moveModal.lead)}`} onClose={() => setMoveModal(null)}>
          <label style={labelStyle}>New Stage</label>
          <select value={moveStage} onChange={e => setMoveStage(e.target.value)} style={inputStyle}>
            <option value="">Select stage...</option>
            {STAGES.filter(s => s.key !== moveModal.lead.lead_stage).map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <label style={{ ...labelStyle, marginTop: 10 }}>Reason (recorded in audit trail)</label>
          <textarea value={moveReason} onChange={e => setMoveReason(e.target.value)} rows={2} style={inputStyle}
            placeholder="e.g. Follow-up call completed, ready for proposal" />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={submitMove} disabled={!moveStage} style={{ ...actionBtn('#6366f1'), flex: 1, opacity: moveStage ? 1 : 0.5 }}>Move Stage</button>
            <button onClick={() => setMoveModal(null)} style={{ ...actionBtn('#f1f5f9'), color: '#475569' }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Probability Modal ───────────────────────────────────────────── */}
      {probModal && (
        <Modal title={`Win Probability: ${getDisplayName(probModal.lead)}`} onClose={() => setProbModal(null)}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            Current: <strong>{probModal.lead.deal_probability}%</strong> · 
            Intent: <strong>{probModal.lead.intent_level || 'COLD'}</strong>
          </div>
          <label style={labelStyle}>New Probability (0–100%)</label>
          <input type="number" min={0} max={100} value={probValue} onChange={e => setProbValue(e.target.value)} style={inputStyle} />
          {probValue && !isNaN(parseFloat(probValue)) && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              Expected Revenue: <strong style={{ color: '#10b981' }}>
                {formatINR(probModal.lead.deal_annual_value * parseFloat(probValue) / 100)}
              </strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={submitProb} style={{ ...actionBtn('#f59e0b'), flex: 1 }}>Update Probability</button>
            <button onClick={() => setProbModal(null)} style={{ ...actionBtn('#f1f5f9'), color: '#475569' }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Deal Values Modal ───────────────────────────────────────────── */}
      {dealModal && (
        <Modal title={`Deal Values: ${getDisplayName(dealModal.lead)}`} onClose={() => setDealModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, color: '#64748b', marginBottom: 12, background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
            <div>Current Setup: <strong>{formatINR(dealModal.lead.deal_setup_value)}</strong></div>
            <div>Current MRR: <strong>{formatINR(dealModal.lead.deal_mrr)}</strong></div>
            <div>Annual Value: <strong style={{ color: '#6366f1' }}>{formatINR(dealModal.lead.deal_annual_value)}</strong></div>
            <div>Expected: <strong style={{ color: '#10b981' }}>{formatINR(dealModal.lead.expected_revenue)}</strong></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Setup Value (₹)</label>
              <input type="number" value={dealSetup} onChange={e => setDealSetup(e.target.value)} style={inputStyle} placeholder="29999" />
            </div>
            <div>
              <label style={labelStyle}>MRR (₹/mo)</label>
              <input type="number" value={dealMrr} onChange={e => setDealMrr(e.target.value)} style={inputStyle} placeholder="5999" />
            </div>
          </div>
          {dealSetup && dealMrr && (
            <div style={{ fontSize: 11, color: '#475569', marginTop: 8, background: '#ecfdf5', borderRadius: 6, padding: '6px 10px' }}>
              Annual Value: <strong style={{ color: '#10b981', fontSize: 13 }}>
                {formatINR(parseFloat(dealSetup || '0') + parseFloat(dealMrr || '0') * 12)}
              </strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={submitDeal} style={{ ...actionBtn('#10b981'), flex: 1 }}>Update Values</button>
            <button onClick={() => setDealModal(null)} style={{ ...actionBtn('#f1f5f9'), color: '#475569' }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Audit Trail Modal ───────────────────────────────────────────── */}
      {auditModal && (
        <Modal title={`Pipeline Audit: ${getDisplayName(auditModal.lead)}`} onClose={() => setAuditModal(null)}>
          {auditModal.entries.length === 0 ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No stage movements recorded yet.</div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {auditModal.entries.map(e => (
                <div key={e.id} style={{
                  borderLeft: '3px solid #6366f1', paddingLeft: 12, marginBottom: 14
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                    {e.old_stage} → <span style={{ color: '#6366f1' }}>{e.new_stage}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    by <strong>{e.changed_by}</strong> · {new Date(e.timestamp).toLocaleString('en-IN')}
                  </div>
                  {e.reason && <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>"{e.reason}"</div>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Style Helpers ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 5
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  background: '#f8fafc', color: '#0f172a'
};
function actionBtn(bg: string): React.CSSProperties {
  return {
    background: bg, color: '#fff', border: 'none', borderRadius: 8,
    padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer'
  };
}
