import React, { useState, useEffect } from "react";
import { 
  Bell, RefreshCw, CheckCircle2, AlertTriangle, 
  Search, Zap, Smartphone, MessageSquare, Volume2, VolumeX, Radio, Users
} from "lucide-react";

interface LeadItem {
  id: string;
  name: string;
  phone: string;
  last_message: string;
  last_message_at: string;
  status: string;
}

export default function BhashMonitorPanel() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastLeadCount, setLastLeadCount] = useState<number>(0);
  const [newLeadNotification, setNewLeadNotification] = useState<string | null>(null);

  const fetchSyncedData = async (isManual = false) => {
    if (isManual) setSyncing(true);
    try {
      const res = await fetch("/api/v1/bhash/sync");
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        // Detect new leads
        if (lastLeadCount > 0 && data.leads.length > lastLeadCount) {
          const newestLead = data.leads[0];
          const alertMsg = `🔔 New Lead Detected! ${newestLead.name} (${newestLead.phone}): "${newestLead.last_message}"`;
          setNewLeadNotification(alertMsg);

          // Audio chime ping
          if (audioEnabled) {
            try {
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
              audio.play().catch(() => {});
            } catch (e) {}
          }
        }
        setLeads(data.leads);
        setLastLeadCount(data.leads.length);
      }
    } catch (err) {
      console.error("Error loading Bhash sync data:", err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/v1/bhash/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "trinetra-scraper-secret-2026", leads: [] }),
      });
      const data = await res.json();
      alert(data.message || "Bhash Sync Completed!");
      fetchSyncedData();
    } catch (e: any) {
      alert(`Sync Failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchSyncedData();
    // 5-second polling interval for instant dashboard updates & notifications
    const interval = setInterval(() => {
      fetchSyncedData();
    }, 5000);

    return () => clearInterval(interval);
  }, [lastLeadCount, audioEnabled]);

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      (l.last_message && l.last_message.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Automated Sync & Monitoring
            </span>
            <span className="text-xs text-slate-400 font-mono">Bhash Gateway: BUZWAP (Priority: WA)</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">BhashSMS Lead Dashboard & Alerts</h1>
          <p className="text-sm text-slate-400">
            Automated background lead ingestion, gateway health monitoring, and instant alert notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${
              audioEnabled
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30"
                : "bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700"
            }`}
            title={audioEnabled ? "Audio alert sound is ON" : "Audio alert sound is OFF"}
          >
            {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>{audioEnabled ? "Sound Alerts ON" : "Sound Muted"}</span>
          </button>

          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Bhash Now"}</span>
          </button>
        </div>
      </div>

      {/* New Lead Alert Banner */}
      {newLeadNotification && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-3">
            <Bell className="text-emerald-400 animate-pulse" size={20} />
            <span className="font-semibold text-sm">{newLeadNotification}</span>
          </div>
          <button
            onClick={() => setNewLeadNotification(null)}
            className="text-xs text-emerald-400 hover:underline px-2 py-1 bg-emerald-500/20 rounded-md"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>TOTAL CAPTURED LEADS</span>
            <Users size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{leads.length}</div>
          <div className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={12} /> Auto-synced from Bhash
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>GATEWAY STATUS</span>
            <Radio size={16} className="text-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-emerald-400">Connected</div>
          <div className="text-xs text-slate-400">Endpoint: /api/webhooks/bhash</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>NOTIFICATION SYSTEM</span>
            <Bell size={16} className="text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300">Active (Chime & Toast)</div>
          <div className="text-xs text-slate-400">5s Real-time polling listener</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>AUTOMATED BACKGROUND SCRAPER</span>
            <Zap size={16} className="text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-300">GitHub Actions</div>
          <div className="text-xs text-slate-400">Runs every 10 min (100% Free)</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-400" />
            Ingested Bhash Leads & WhatsApp Messages
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by phone, name, or text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="animate-spin text-indigo-400" size={24} />
            <span>Loading Bhash synced leads...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
            <AlertTriangle className="mx-auto text-amber-400 mb-2" size={24} />
            <p className="font-semibold text-slate-300">No leads found</p>
            <p className="text-xs text-slate-500">Click "Sync Bhash Now" above to trigger a fresh sync.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase border-b border-slate-700/60">
                <tr>
                  <th className="p-3.5">Lead / Contact</th>
                  <th className="p-3.5">Phone Number</th>
                  <th className="p-3.5">Last Message / Inquiry</th>
                  <th className="p-3.5">Captured At</th>
                  <th className="p-3.5 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {filteredLeads.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5 font-medium text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center border border-indigo-500/30 text-xs">
                        {item.name ? item.name.charAt(0).toUpperCase() : "W"}
                      </div>
                      <span>{item.name || "WhatsApp Lead"}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{item.phone}</td>
                    <td className="p-3.5 max-w-xs truncate text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-xs font-mono text-indigo-300 mr-2">
                        WhatsApp
                      </span>
                      {item.last_message || "No message body"}
                    </td>
                    <td className="p-3.5 text-xs text-slate-400">
                      {item.last_message_at ? new Date(item.last_message_at).toLocaleString() : "Recently"}
                    </td>
                    <td className="p-3.5 text-right">
                      <a
                        href={`https://wa.me/91${item.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-medium transition-all"
                      >
                        <Smartphone size={14} /> Reply WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
