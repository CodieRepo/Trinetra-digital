import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

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

export default function SettingsPanel() {
  const { success, error: toastError } = useToast();
  
  // General profile settings state
  const [businessName, setBusinessName] = useState("Trinetra Digital Solutions");
  const [notifyEmail, setNotifyEmail] = useState("");
  
  // WhatsApp settings state
  const [wabaId, setWabaId] = useState("");
  const [wabaToken, setWabaToken] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTenantSettings() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
          
        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id);
          const { data: tenant } = await supabase
            .from('tenants')
            .select('whatsapp_phone_number_id, whatsapp_access_token_encrypted, name')
            .eq('id', profile.tenant_id)
            .single();
            
          if (tenant) {
            setBusinessName(tenant.name || "Trinetra Digital Solutions");
            setWabaId(tenant.whatsapp_phone_number_id || "");
            setWabaToken(tenant.whatsapp_access_token_encrypted || "");
          }
        }
      } catch (e) {
        console.error("Failed loading settings:", e);
      } finally {
        setLoading(false);
      }
    }
    loadTenantSettings();
  }, []);

  const handleSaveProfile = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tenants')
        .update({
          name: businessName,
          whatsapp_phone_number_id: wabaId,
          whatsapp_access_token_encrypted: wabaToken
        })
        .eq('id', tenantId);
        
      if (error) throw error;
      success("Settings saved", "Business & WhatsApp configurations updated successfully");
    } catch (e: any) {
      toastError("Save failed", e.message || "Could not save tenant settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900">Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Configure your workspace and integrations</p>
      </div>

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
          <Field label="WhatsApp Phone Number ID">
            <input
              type="text"
              value={wabaId}
              onChange={e => setWabaId(e.target.value)}
              placeholder="e.g. 10928374656"
              className="w-full sm:max-w-xs px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
            />
          </Field>
          <Field label="WhatsApp / BhashSMS Key">
            <input
              type="password"
              value={wabaToken}
              onChange={e => setWabaToken(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full sm:max-md px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
            />
          </Field>
          <div className="pt-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "Saving..." : "Save Changes"}
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
        </Section>

        <Section title="Security" subtitle="Account and access settings">
          <Field label="Session">
            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                ✓ Authenticated
              </span>
            </div>
          </Field>
        </Section>
      </div>
    </div>
  );
}
