import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ShieldCheck, AlertTriangle, Play, RefreshCw, Send, CheckCircle, 
  Database, Activity, Globe, HardDrive, AlertCircle, Clock
} from "lucide-react";

export default function DiagnosticsPanel() {
  const [health, setHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Send Test State
  const [toPhone, setToPhone] = useState("");
  const [messageBody, setMessageBody] = useState("Hello! This is a test message from Trinetra CRM diagnostics. 🧪");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  // DB Write Test State
  const [testingDb, setTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState<string | null>(null);

  // Webhook Logs State
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);

  useEffect(() => {
    fetchHealth();
    fetchWebhookLogs();
  }, []);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/health/bhash");
      const data = await res.json();
      setHealth(data);
      if (!res.ok) {
        setHealthError(data.error || "System diagnostics returned degraded status.");
      }
    } catch (e: any) {
      setHealthError(e.message || "Failed to query api health endpoint");
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchWebhookLogs = async () => {
    setLoadingWebhooks(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("message_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setWebhookLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const testDbWrite = async () => {
    setTestingDb(true);
    setDbResult(null);
    try {
      const supabase = createClient();
      // Insert a diagnostic log in message_events to test write permission
      const { error } = await supabase.from("message_events").insert({
        meta_message_id: `diag-write-${Date.now()}`,
        event_type: "send_attempt",
        payload: { test: "Database write validation" }
      });
      if (error) {
        setDbResult(`Error: ${error.message}`);
      } else {
        setDbResult("Successfully wrote diagnostic event to message_events!");
        fetchWebhookLogs();
      }
    } catch (e: any) {
      setDbResult(`Exception: ${e.message}`);
    } finally {
      setTestingDb(false);
    }
  };

  const sendTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toPhone) return;
    setSendingMessage(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: toPhone,
          body: messageBody
        })
      });
      const data = await res.json();
      setSendResult({
        success: res.ok,
        status: res.status,
        data
      });
    } catch (e: any) {
      setSendResult({
        success: false,
        errorMessage: e.message || "Network exception while dispatching message"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto overflow-y-auto h-full pb-20">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="text-indigo-600" />
            Bhash Diagnostics
          </h1>
          <p className="text-slate-500 text-sm">Verify BhashSMS credentials, check connection, and view raw webhook logs.</p>
        </div>
        <button 
          onClick={() => { fetchHealth(); fetchWebhookLogs(); }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={(loadingHealth || loadingWebhooks) ? "animate-spin" : ""} />
          Refresh Diagnostics
        </button>
      </div>

      {/* Grid: Health Checks & Direct Message Sender */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1: System Health Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo-600" />
              API Connectivity Metrics
            </h2>

            {loadingHealth && !health && (
              <div className="py-10 text-center text-sm text-slate-400">Loading metrics...</div>
            )}

            {health && (
              <div className="space-y-4">
                {/* Overall status */}
                <div className={`p-4 rounded-xl flex items-center gap-3 border ${health.healthy ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                  {health.healthy ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  <div>
                    <div className="text-sm font-bold">System Status: {health.status}</div>
                    <div className="text-xs opacity-90">Last checked: {new Date(health.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>

                {/* Subsystem grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Supabase */}
                  <div className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                    <Database className={health.checks.supabaseConnected ? "text-emerald-500" : "text-rose-500"} size={20} />
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase">Supabase Database</div>
                      <div className="text-sm font-black text-slate-800">{health.checks.supabaseConnected ? "Connected" : "Error"}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{health.details.supabase}</div>
                    </div>
                  </div>

                  {/* Bhash API connectivity */}
                  <div className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                    <Globe className={health.checks.connectivity ? "text-emerald-500" : "text-rose-500"} size={20} />
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase">Bhash API Connectivity</div>
                      <div className="text-sm font-black text-slate-800">{health.checks.connectivity ? "Connected" : "Disconnected"}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{health.details.bhashApi}</div>
                    </div>
                  </div>

                  {/* API Credentials */}
                  <div className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                    <Activity className={health.checks.apiKeyValid ? "text-emerald-500" : "text-rose-500"} size={20} />
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase">API Credentials</div>
                      <div className="text-sm font-black text-slate-800">{health.checks.apiKeyValid ? "Valid" : "Invalid"}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{health.details.apiKey}</div>
                    </div>
                  </div>

                  {/* Sender ID */}
                  <div className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                    <HardDrive className="text-indigo-500" size={20} />
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase">Sender ID</div>
                      <div className="text-sm font-black text-slate-800">Active</div>
                      <div className="text-[11px] text-slate-400 mt-1">{health.details.senderStatus}</div>
                    </div>
                  </div>

                  {/* Webhook Status */}
                  <div className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                    <Globe className={health.checks.webhookActive ? "text-emerald-500" : "text-rose-500"} size={20} />
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase">Webhook Status</div>
                      <div className="text-sm font-black text-slate-800">{health.checks.webhookActive ? "Active" : "Inactive"}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{health.details.webhookUrl}</div>
                    </div>
                  </div>

                  {/* Delivery Callback Status */}
                  <div className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                    <Activity className="text-emerald-500" size={20} />
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase">Delivery Callback</div>
                      <div className="text-sm font-black text-slate-800">Active</div>
                      <div className="text-[11px] text-slate-400 mt-1">{health.details.deliveryCallback}</div>
                    </div>
                  </div>

                  {/* Conversation Credits (Only shown if available) */}
                  {health.credits !== null && health.credits !== undefined && (
                    <div className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                      <Database className="text-emerald-500" size={20} />
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Conversation Credits</div>
                        <div className="text-sm font-black text-slate-800">{health.credits}</div>
                        <div className="text-[11px] text-slate-400 mt-1">Remaining BhashSMS credits</div>
                      </div>
                    </div>
                  )}

                  {/* Rate Limit */}
                  {health.rateLimit && (
                    <div className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                      <Clock className="text-indigo-500" size={20} />
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Rate Limit</div>
                        <div className="text-sm font-black text-slate-800">{health.rateLimit}</div>
                        <div className="text-[11px] text-slate-400 mt-1">Maximum API velocity</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Webhook and Message Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Last Webhook Received</div>
                    <div className="text-xs text-slate-600 font-medium">
                      {health.lastWebhookReceived ? new Date(health.lastWebhookReceived).toLocaleString() : "No webhooks received yet"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Last Message Outbound Response</div>
                    <div className="text-xs text-slate-600 font-medium">
                      {health.lastMessageResponse ? (
                        <>
                          {new Date(health.lastMessageResponse).toLocaleString()}
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${health.lastMessageStatus === "read" ? "bg-indigo-50 text-indigo-600" : health.lastMessageStatus === "delivered" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}`}>
                            {health.lastMessageStatus}
                          </span>
                        </>
                      ) : "No outbound messages sent yet"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {healthError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <div>{healthError}</div>
              </div>
            )}
          </div>

          {/* Database Write Validation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Supabase Write Check</h3>
            <p className="text-xs text-slate-400 mb-4">Validate that RLS allows writing directly into transaction tables from your current session.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={testDbWrite}
                disabled={testingDb}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {testingDb ? "Testing..." : "Execute Test Write"}
              </button>
              {dbResult && (
                <div className={`text-xs font-medium ${dbResult.startsWith("Error") ? "text-rose-600" : "text-emerald-600"}`}>
                  {dbResult}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Col 2: Send Test Message Composer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Send size={16} className="text-indigo-600" />
            Send Test WhatsApp
          </h2>

          <form onSubmit={sendTestWhatsApp} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Phone Number</label>
              <input 
                type="text" 
                placeholder="e.g. 918810721068"
                value={toPhone}
                onChange={e => setToPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <span className="text-[10px] text-slate-400 block">Include country code (e.g. 91 for India) without '+' or spaces.</span>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Message Content</label>
              <textarea
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sendingMessage || !toPhone}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {sendingMessage ? "Sending..." : "Send Test Ping"}
              <Play size={12} />
            </button>
          </form>

          {sendResult && (
            <div className={`mt-4 p-4 rounded-xl text-xs border ${sendResult.success ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"}`}>
              <div className="font-bold mb-1">Result: {sendResult.success ? "Success" : "Failed"}</div>
              <pre className="text-[10px] bg-white/50 p-2 rounded border border-slate-100 overflow-x-auto max-h-40">
                {JSON.stringify(sendResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Events Stream */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={16} className="text-indigo-600" />
            Webhook Events Stream
          </h2>
          <button 
            onClick={fetchWebhookLogs}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
          >
            <RefreshCw size={10} className={loadingWebhooks ? "animate-spin" : ""} />
            Poll Logs
          </button>
        </div>

        {loadingWebhooks && webhookLogs.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">Loading events...</div>
        )}

        {webhookLogs.length === 0 && !loadingWebhooks && (
          <div className="py-8 text-center text-sm text-slate-400">No webhook events logged yet. Send a WhatsApp message to populate.</div>
        )}

        {webhookLogs.length > 0 && (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {webhookLogs.map(log => (
              <div key={log.id} className="py-3.5 flex items-start justify-between text-xs hover:bg-slate-50 transition-colors px-2 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.event_type === "read" ? "bg-indigo-50 text-indigo-600" : log.event_type === "delivered" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}`}>
                      {log.event_type}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">ID: {log.meta_message_id}</span>
                  </div>
                  <pre className="text-[10px] text-slate-500 font-mono mt-1 max-w-3xl overflow-x-auto bg-slate-50 p-2 rounded">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(log.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
