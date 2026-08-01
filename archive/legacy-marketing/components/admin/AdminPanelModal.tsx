import React, { useState, useEffect } from 'react';
import { getKnowledgeBase, saveKnowledgeBase, resetKnowledgeBaseToDefault } from '../../knowledge';
import { KBItem, UnknownQueryLog, AppointmentLead, AnalyticsData } from '../../types/chat';
import { learningSystem } from '../../lib/analytics/learningSystem';
import { analyticsService } from '../../lib/analytics/analyticsService';
import { crmService } from '../../lib/crm/crmService';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'kb' | 'learning' | 'analytics' | 'crm' | 'logs'>('kb');
  const [kbItems, setKbItems] = useState<KBItem[]>([]);
  const [kbSearch, setKbSearch] = useState('');
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);

  const [unknownQueries, setUnknownQueries] = useState<UnknownQueryLog[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>(analyticsService.getAnalytics());
  const [appointments, setAppointments] = useState<AppointmentLead[]>(crmService.getAppointments());
  const [crmStatusFilter, setCrmStatusFilter] = useState<'All' | 'Upcoming' | 'Completed' | 'Cancelled'>('All');
  const [crmSearch, setCrmSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  const refreshData = () => {
    setKbItems(getKnowledgeBase());
    setUnknownQueries(learningSystem.getUnknownQueries());
    setAnalytics(analyticsService.getAnalytics());
    setAppointments(crmService.getAppointments());
  };

  if (!isOpen) return null;

  // KB Save Handler
  const handleSaveKbItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const existingIndex = kbItems.findIndex((item) => item.id === editingItem.id);
    let updated: KBItem[];

    if (existingIndex !== -1) {
      updated = [...kbItems];
      updated[existingIndex] = editingItem;
    } else {
      updated = [editingItem, ...kbItems];
    }

    saveKnowledgeBase(updated);
    setKbItems(updated);
    setEditingItem(null);
  };

  // Convert Unknown Query to KB Item
  const handleConvertUnknownToKB = (query: UnknownQueryLog) => {
    const newItem: KBItem = {
      id: 'custom-kb-' + Date.now(),
      title: `Answer for: ${query.query.slice(0, 30)}`,
      keywords: query.query.toLowerCase().split(' ').filter((w) => w.length > 2),
      category: 'Services',
      content: `Official response for: ${query.query}`,
      related_topics: ['services-overview'],
      priority: 8
    };
    setEditingItem(newItem);
    setActiveTab('kb');
    learningSystem.markAsResolved(query.id);
    setUnknownQueries(learningSystem.getUnknownQueries());
  };

  // CRM status update
  const handleStatusChange = (id: string, status: 'Upcoming' | 'Completed' | 'Cancelled') => {
    crmService.updateStatus(id, status);
    if (status === 'Completed') analyticsService.logAppointmentCompleted();
    setAppointments(crmService.getAppointments());
  };

  const handleDeleteAppointment = (id: string) => {
    if (confirm('Delete this appointment entry?')) {
      crmService.deleteAppointment(id);
      setAppointments(crmService.getAppointments());
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus = crmStatusFilter === 'All' || apt.status === crmStatusFilter;
    const matchesQuery =
      apt.name.toLowerCase().includes(crmSearch.toLowerCase()) ||
      apt.business.toLowerCase().includes(crmSearch.toLowerCase()) ||
      apt.phone.includes(crmSearch);
    return matchesStatus && matchesQuery;
  });

  const filteredKb = kbItems.filter(
    (item) =>
      item.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(kbSearch.toLowerCase()) ||
      item.keywords.some((k) => k.toLowerCase().includes(kbSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
              T
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">Trinetra Offline AI Engine • Admin & CRM Portal</h2>
              <p className="text-[11px] text-slate-400">100% Local Logic • No External APIs • Zero Latency</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                crmService.exportToCSV();
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
            >
              📥 Export CSV
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-6 pt-3 bg-slate-950/30 border-b border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('kb')}
            className={`pb-3 px-3 border-b-2 transition ${
              activeTab === 'kb' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📚 Knowledge Base ({kbItems.length})
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`pb-3 px-3 border-b-2 transition ${
              activeTab === 'learning' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🧠 Learning System ({unknownQueries.filter((q) => !q.resolved).length})
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`pb-3 px-3 border-b-2 transition ${
              activeTab === 'crm' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 Mini CRM Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-3 border-b-2 transition ${
              activeTab === 'analytics' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Local Analytics
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 px-3 border-b-2 transition ${
              activeTab === 'logs' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔍 Search Logs
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: KNOWLEDGE BASE */}
          {activeTab === 'kb' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="Search Knowledge Base articles..."
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs w-72 focus:outline-none focus:border-indigo-500 text-slate-100"
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (confirm('Reset Knowledge Base to original defaults? Custom articles will be cleared.')) {
                        setKbItems(resetKnowledgeBaseToDefault());
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs"
                  >
                    Reset Defaults
                  </button>
                  <button
                    onClick={() =>
                      setEditingItem({
                        id: 'kb-' + Date.now(),
                        title: 'New Knowledge Article',
                        keywords: ['keyword'],
                        category: 'Services',
                        content: 'Enter detailed content here...',
                        related_topics: [],
                        priority: 8
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs"
                  >
                    + Add New Article
                  </button>
                </div>
              </div>

              {/* Editing Form Modal inline */}
              {editingItem && (
                <form onSubmit={handleSaveKbItem} className="p-4 bg-slate-950 border border-indigo-500/40 rounded-2xl space-y-3 text-xs">
                  <h3 className="font-bold text-indigo-400">Edit Knowledge Article: {editingItem.id}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Title</label>
                      <input
                        type="text"
                        value={editingItem.title}
                        onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Category</label>
                      <input
                        type="text"
                        value={editingItem.category}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Keywords (Comma separated)</label>
                    <input
                      type="text"
                      value={editingItem.keywords.join(', ')}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          keywords: e.target.value.split(',').map((k) => k.trim())
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Content</label>
                    <textarea
                      rows={4}
                      value={editingItem.content}
                      onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-1.5 bg-indigo-500 text-slate-950 font-bold rounded-lg">
                      Save Article
                    </button>
                  </div>
                </form>
              )}

              {/* Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">ID / Title</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Keywords</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredKb.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <p className="font-semibold text-slate-200">{item.title}</p>
                          <p className="text-[10px] text-slate-500">{item.id}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 max-w-xs truncate">
                          {item.keywords.join(', ')}
                        </td>
                        <td className="p-3 font-semibold text-indigo-400">{item.priority}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-[11px]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: LEARNING SYSTEM (UNKNOWN QUERIES) */}
          {activeTab === 'learning' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl">
                <h3 className="font-bold text-sm text-indigo-300">Continuous Local Learning Engine</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Queries with confidence &lt; 35% are logged here. Click "Convert to KB Article" to add answers locally.
                </p>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Query</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Top Matches</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {unknownQueries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">
                          No unknown queries logged yet! All user messages matched high confidence KB articles.
                        </td>
                      </tr>
                    ) : (
                      unknownQueries.map((log) => (
                        <tr key={log.id} className={log.resolved ? 'opacity-50' : ''}>
                          <td className="p-3 font-semibold text-slate-200">"{log.query}"</td>
                          <td className="p-3 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td className="p-3 text-slate-400 text-[10px]">
                            {log.topMatches.map((m) => `${m.title} (${m.score}%)`).join(', ') || 'None'}
                          </td>
                          <td className="p-3 text-right">
                            {!log.resolved ? (
                              <button
                                onClick={() => handleConvertUnknownToKB(log)}
                                className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold"
                              >
                                Convert to KB Article
                              </button>
                            ) : (
                              <span className="text-emerald-400 font-semibold">✓ Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MINI CRM APPOINTMENTS */}
          {activeTab === 'crm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="Search appointments by name, phone, business..."
                  value={crmSearch}
                  onChange={(e) => setCrmSearch(e.target.value)}
                  className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs w-72 focus:outline-none focus:border-indigo-500 text-slate-100"
                />

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Filter:</span>
                  {(['All', 'Upcoming', 'Completed', 'Cancelled'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setCrmStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl border transition ${
                        crmStatusFilter === st
                          ? 'bg-indigo-500 border-indigo-500 text-slate-950 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Client Details</th>
                      <th className="p-3">Service Focus</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No appointments found matching filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-800/40">
                          <td className="p-3">
                            <p className="font-bold text-slate-100">{apt.name}</p>
                            <p className="text-[11px] text-slate-400">{apt.phone} • {apt.business}</p>
                            {apt.city && <p className="text-[10px] text-slate-500">📍 {apt.city}</p>}
                          </td>
                          <td className="p-3 text-indigo-300 font-medium">{apt.service}</td>
                          <td className="p-3 text-slate-300">
                            <p>{apt.date}</p>
                            <p className="text-[10px] text-slate-500">{apt.time}</p>
                          </td>
                          <td className="p-3">
                            <select
                              value={apt.status}
                              onChange={(e) => handleStatusChange(apt.id, e.target.value as any)}
                              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold bg-slate-900 ${
                                apt.status === 'Upcoming'
                                  ? 'border-indigo-500/50 text-indigo-400'
                                  : apt.status === 'Completed'
                                  ? 'border-emerald-500/50 text-emerald-400'
                                  : 'border-rose-500/50 text-rose-400'
                              }`}
                            >
                              <option value="Upcoming">Upcoming</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteAppointment(apt.id)}
                              className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-[11px]"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LOCAL ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <p className="text-[11px] text-slate-400 font-medium">Total Messages</p>
                  <p className="text-2xl font-black text-indigo-400 mt-1">{analytics.totalMessages}</p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <p className="text-[11px] text-slate-400 font-medium">Avg Search Confidence</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{analytics.avgConfidence}%</p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <p className="text-[11px] text-slate-400 font-medium">Appointments Booked</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">{appointments.length}</p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <p className="text-[11px] text-slate-400 font-medium">Unknown Queries</p>
                  <p className="text-2xl font-black text-rose-400 mt-1">{analytics.unknownQueriesCount}</p>
                </div>
              </div>

              {/* Intent Distribution */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-3">
                <h3 className="font-bold text-slate-200">Intent Distribution Breakdown</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(analytics.intentDistribution).map(([intent, count]) => (
                    <div key={intent} className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-300 font-medium">{intent}</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SEARCH LOGS */}
          {activeTab === 'logs' && (
            <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Query</th>
                    <th className="p-3">Matched KB Article</th>
                    <th className="p-3">Confidence Score</th>
                    <th className="p-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {analytics.searchLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-slate-200">"{log.query}"</td>
                      <td className="p-3 text-slate-400">{log.matchedId || 'None'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            log.confidence > 70
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : log.confidence > 40
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {log.confidence}%
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
