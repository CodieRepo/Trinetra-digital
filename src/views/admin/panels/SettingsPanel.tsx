import { useState } from "react";
import {
  Settings, Code2, Save, CheckCircle2,
  Copy, Loader2, RefreshCw, Download
} from "lucide-react";
import { API_BASE_URL } from "@/services/api";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/Modal";

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-black text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 py-3 border-b border-slate-100 last:border-0">
      <label className="text-xs font-bold text-slate-600 sm:w-40 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface SettingsPanelProps {
  waStatus: any;
  healthTelemetry: any;
  backendOnline: boolean;
  triggerDatabaseBackup: () => Promise<boolean>;
  restartWhatsAppGateway: () => Promise<boolean>;
  fetchBackups: () => Promise<any[]>;
  rollbackBackup: (name: string) => Promise<boolean>;
}

export default function SettingsPanel({
  waStatus,
  healthTelemetry,
  backendOnline,
  triggerDatabaseBackup,
  restartWhatsAppGateway,
  fetchBackups,
  rollbackBackup,
}: SettingsPanelProps) {
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState<"general" | "developer">("general");

  // General settings state
  const [businessName, setBusinessName] = useState("Trinetra Digital Solutions");
  const [businessPhone, setBusinessPhone] = useState("+91");
  const [notifyEmail, setNotifyEmail] = useState("");
  // Developer state
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadBackups = async () => {
    setLoadingBackups(true);
    const data = await fetchBackups();
    setBackups(data);
    setLoadingBackups(false);
  };

  const handleBackup = async () => {
    setBackingUp(true);
    const ok = await triggerDatabaseBackup();
    if (ok) success("Backup created", "Database backup created successfully");
    else toastError("Backup failed", "Could not create database backup");
    setBackingUp(false);
  };

  const handleRestart = async () => {
    setRestarting(true);
    const ok = await restartWhatsAppGateway();
    if (ok) success("Gateway restarted", "WhatsApp gateway restarted successfully");
    else toastError("Restart failed", "Could not restart gateway");
    setRestarting(false);
    setConfirmRestart(false);
  };

  const copyApiUrl = () => {
    navigator.clipboard.writeText(API_BASE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900">Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Configure your workspace and integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: "general",   label: "General",   icon: <Settings size={13} /> },
          { key: "developer", label: "Developer",  icon: <Code2 size={13} /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key as any); if (t.key === "developer") loadBackups(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors border-0 cursor-pointer ${
              tab === t.key ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="space-y-5">
          <Section title="Business Profile" subtitle="Your business information shown to leads">
            <Field label="Business Name">
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full sm:max-w-xs px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </Field>
            <Field label="WhatsApp Number">
              <input
                type="tel"
                value={businessPhone}
                onChange={e => setBusinessPhone(e.target.value)}
                className="w-full sm:max-w-xs px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </Field>
            <div className="pt-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors">
                <Save size={13} />
                Save Changes
              </button>
            </div>
          </Section>

          <Section title="Notifications" subtitle="Where to send alerts for new leads and bookings">
            <Field label="Email Address">
              <input
                type="email"
                value={notifyEmail}
                onChange={e => setNotifyEmail(e.target.value)}
                placeholder="owner@business.com"
                className="w-full sm:max-w-xs px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
              />
            </Field>
            <Field label="Notify on">
              <div className="space-y-2">
                {["New lead captured", "Booking created", "Human handoff requested", "Lead status changed"].map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-indigo-600" />
                    <span className="text-xs text-slate-600">{item}</span>
                  </label>
                ))}
              </div>
            </Field>
            <div className="pt-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition-colors">
                <Save size={13} />
                Save Preferences
              </button>
            </div>
          </Section>

          <Section title="Security" subtitle="Account and access settings">
            <Field label="Session">
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  ✓ Authenticated
                </span>
                <button className="text-xs text-rose-600 font-bold hover:text-rose-700 border-0 bg-transparent cursor-pointer">
                  Sign Out
                </button>
              </div>
            </Field>
            <Field label="Password">
              <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 border-0 bg-transparent cursor-pointer">
                Change Password →
              </button>
            </Field>
          </Section>
        </div>
      )}

      {tab === "developer" && (
        <div className="space-y-5">
          {/* System Status */}
          <Section title="System Health" subtitle="Live backend and WhatsApp status">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  label: "API Backend",
                  status: backendOnline ? "Online" : "Offline",
                  ok: backendOnline,
                  detail: API_BASE_URL,
                },
                {
                  label: "WhatsApp Gateway",
                  status: waStatus?.status || "Unknown",
                  ok: waStatus?.status === "connected",
                  detail: waStatus?.connectedAt ? `Connected ${new Date(waStatus.connectedAt).toLocaleTimeString()}` : "",
                },
              ].map(item => (
                <div key={item.label} className={`rounded-xl border p-4 ${item.ok ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${item.ok ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    <p className="text-xs font-black text-slate-700">{item.label}</p>
                  </div>
                  <p className={`text-sm font-black ${item.ok ? "text-emerald-700" : "text-rose-700"}`}>{item.status}</p>
                  {item.detail && <p className="text-[9px] text-slate-400 font-mono mt-1 truncate">{item.detail}</p>}
                </div>
              ))}
            </div>

            {healthTelemetry && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">System Resources</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div>
                    <p className="text-slate-400 text-[9px]">Uptime</p>
                    <p className="font-bold text-slate-700">{healthTelemetry.system?.uptime || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[9px]">RAM Used</p>
                    <p className="font-bold text-slate-700">{healthTelemetry.system?.ramUsed || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[9px]">DB Status</p>
                    <p className={`font-bold ${healthTelemetry.db === "connected" ? "text-emerald-600" : "text-rose-600"}`}>
                      {healthTelemetry.db}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* API Configuration */}
          <Section title="API Configuration" subtitle="Backend endpoint configuration">
            <Field label="API Base URL">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-slate-800 text-emerald-400 px-3 py-2 rounded-xl font-mono truncate">
                  {API_BASE_URL}
                </code>
                <button onClick={copyApiUrl} className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 cursor-pointer">
                  {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
            </Field>
          </Section>

          {/* Gateway Control */}
          <Section title="WhatsApp Gateway" subtitle="Control the WhatsApp connection">
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <p className="text-sm font-bold text-slate-700">Restart Gateway</p>
                  <p className="text-xs text-slate-400 mt-0.5">Disconnects and rebuilds the WhatsApp socket session</p>
                </div>
                <button
                  onClick={() => setConfirmRestart(true)}
                  disabled={restarting}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold border-0 cursor-pointer disabled:opacity-60 transition-colors"
                >
                  {restarting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {restarting ? "Restarting..." : "Restart"}
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <p className="text-sm font-bold text-slate-700">Database Backup</p>
                  <p className="text-xs text-slate-400 mt-0.5">Create a snapshot backup of all CRM data</p>
                </div>
                <button
                  onClick={handleBackup}
                  disabled={backingUp}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer disabled:opacity-60 transition-colors"
                >
                  {backingUp ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  {backingUp ? "Creating..." : "Backup Now"}
                </button>
              </div>
            </div>
          </Section>

          {/* Backup History */}
          <Section title="Backup History" subtitle="WhatsApp session backups">
            <button
              onClick={loadBackups}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 border-0 bg-transparent cursor-pointer mb-4"
            >
              <RefreshCw size={11} />
              Refresh backups
            </button>
            {loadingBackups ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : backups.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">No backups available</p>
            ) : (
              <div className="space-y-2">
                {backups.map((b, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-slate-700 font-mono">{b.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[9px] text-slate-400">{b.timestamp}</span>
                        <span className="text-[9px] text-slate-400">·</span>
                        <span className="text-[9px] text-slate-500 capitalize">{b.connectionStatus}</span>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const ok = await rollbackBackup(b.name);
                        if (ok) success("Rollback successful", b.name);
                        else toastError("Rollback failed");
                      }}
                      className="text-[10px] font-bold text-amber-600 hover:text-amber-700 border-0 bg-transparent cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      <ConfirmDialog
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        onConfirm={handleRestart}
        title="Restart WhatsApp Gateway"
        message="This will disconnect the current WhatsApp session and re-establish the connection. Any pending messages may be delayed."
        confirmLabel="Yes, Restart"
        variant="warning"
        loading={restarting}
      />
    </div>
  );
}
