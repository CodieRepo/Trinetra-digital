import { useState, useEffect } from "react";
import {
  Calendar, Clock, Plus, CheckCircle2, Loader2,
  Phone, Building2, Video, MapPin,
  Check, X, RefreshCw
} from "lucide-react";
import { apiService } from "@/services/api";
import type { Appointment, AppointmentSlot } from "@/services/api";
import { useToast } from "@/components/ui/Toast";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

const CALL_TYPE_ICONS: Record<string, React.ReactNode> = {
  call:      <Phone size={12} />,
  video:     <Video size={12} />,
  in_person: <MapPin size={12} />,
};

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

// ── Appointment Row ───────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  onConfirm,
  onComplete,
  onCancel,
}: {
  appt: Appointment;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 hover:border-indigo-200 transition-all">
      <div className="flex items-start gap-4">
        {/* Date Block */}
        <div className="shrink-0 text-center bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 w-14">
          <p className="text-[9px] font-black text-indigo-500 uppercase">
            {new Date(appt.preferred_date).toLocaleDateString("en-IN", { month: "short" })}
          </p>
          <p className="text-xl font-black text-indigo-700 leading-none mt-0.5">
            {new Date(appt.preferred_date).getDate()}
          </p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-800 text-sm truncate">
                {appt.lead_name || "Unknown Contact"}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock size={10} />
                  {appt.preferred_time}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  {CALL_TYPE_ICONS[appt.call_type]}
                  {appt.call_type.replace("_", " ")}
                </span>
                {appt.lead_company && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Building2 size={10} />
                    {appt.lead_company}
                  </span>
                )}
              </div>
              {appt.notes && (
                <p className="text-[10px] text-slate-400 mt-1 italic truncate">"{appt.notes}"</p>
              )}
              {appt.meeting_link && (
                <a
                  href={appt.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-600 font-bold hover:underline mt-1 block"
                >
                  🔗 {appt.meeting_link}
                </a>
              )}
            </div>
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_STYLES[appt.status]}`}>
              {appt.status}
            </span>
          </div>

          {/* Actions */}
          {appt.status === "pending" && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onConfirm}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border-0"
              >
                <Check size={11} /> Confirm
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border-0"
              >
                <X size={11} /> Cancel
              </button>
            </div>
          )}
          {appt.status === "confirmed" && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onComplete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border-0"
              >
                <CheckCircle2 size={11} /> Mark Complete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BookingsPanel() {
  const { success, error: toastError } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"appointments" | "slots">("appointments");
  const [filterStatus, setFilterStatus] = useState("all");

  // Slot creation
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [creatingSlot, setCreatingSlot] = useState(false);

  // Modals
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [dealValue, setDealValue] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [calRes, slotsRes] = await Promise.all([
        apiService.appointments.getCalendar(),
        apiService.appointments.getSlots(),
      ]);
      setAppointments(calRes.appointments || []);
      setSlots(slotsRes || []);
    } catch (e: any) {
      toastError("Failed to load", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = filterStatus === "all"
    ? appointments
    : appointments.filter(a => a.status === filterStatus);

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === "pending").length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    completed: appointments.filter(a => a.status === "completed").length,
  };

  const handleConfirm = async () => {
    if (!confirmingId) return;
    try {
      await apiService.appointments.confirm(confirmingId, { meeting_link: meetingLink || undefined });
      setConfirmingId(null); setMeetingLink("");
      success("Appointment confirmed", "Confirmation message sent to lead");
      load();
    } catch (e: any) { toastError("Failed", e.message); }
  };

  const handleCancel = async () => {
    if (!cancellingId) return;
    try {
      await apiService.appointments.cancel(cancellingId);
      setCancellingId(null);
      success("Appointment cancelled");
      load();
    } catch (e: any) { toastError("Failed", e.message); }
  };

  const handleComplete = async () => {
    if (!completingId) return;
    try {
      await apiService.appointments.complete(completingId, { deal_value: dealValue || undefined });
      setCompletingId(null); setDealValue(0);
      success("Marked complete!", "Appointment closed");
      load();
    } catch (e: any) { toastError("Failed", e.message); }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDate || !slotTime) return;
    setCreatingSlot(true);
    try {
      await apiService.appointments.createSlot({ slot_date: slotDate, slot_time: slotTime, duration_mins: 30 });
      success("Slot created", `${slotDate} at ${slotTime}`);
      setSlotDate(""); setSlotTime("");
      load();
    } catch (e: any) { toastError("Failed", e.message); }
    setCreatingSlot(false);
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await apiService.appointments.deleteSlot(id);
      setSlots(prev => prev.filter(s => s.id !== id));
      success("Slot removed");
    } catch (e: any) { toastError("Failed", e.message); }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Bookings & Appointments</h1>
          <p className="text-xs text-slate-400 mt-0.5">{stats.total} total · {stats.pending} pending · {stats.confirmed} confirmed</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 h-9 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total",     value: stats.total,     color: "bg-slate-800",   text: "text-white" },
          { label: "Pending",   value: stats.pending,   color: "bg-amber-500",   text: "text-white" },
          { label: "Confirmed", value: stats.confirmed, color: "bg-emerald-500", text: "text-white" },
          { label: "Completed", value: stats.completed, color: "bg-blue-500",    text: "text-white" },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4 ${s.text}`}>
            <p className="text-2xl font-black font-mono leading-none">{s.value}</p>
            <p className="text-xs font-bold opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["appointments", "slots"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border-0 cursor-pointer capitalize ${
              tab === t ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "appointments" && (
        <>
          {/* Status Filter */}
          <div className="flex gap-2">
            {["all", "pending", "confirmed", "completed", "cancelled"].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer capitalize ${
                  filterStatus === s ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl py-20 text-center">
              <Calendar size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">No appointments</p>
              <p className="text-xs text-slate-400 mt-1">Create available slots for leads to book</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(appt => (
                <AppointmentRow
                  key={appt.id}
                  appt={appt}
                  onConfirm={() => setConfirmingId(appt.id)}
                  onComplete={() => setCompletingId(appt.id)}
                  onCancel={() => setCancellingId(appt.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "slots" && (
        <div className="space-y-4">
          {/* Create Slot */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Add Available Slot</h3>
            <form onSubmit={handleCreateSlot} className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={e => setSlotDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  className="h-9 px-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</label>
                <input
                  type="time"
                  value={slotTime}
                  onChange={e => setSlotTime(e.target.value)}
                  required
                  className="h-9 px-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={creatingSlot}
                className="flex items-center gap-2 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer disabled:opacity-60"
              >
                {creatingSlot ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add Slot
              </button>
            </form>
          </div>

          {/* Slot List */}
          <div className="space-y-2">
            {slots.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl py-12 text-center text-slate-400 text-xs">
                No available slots. Add some above.
              </div>
            ) : slots.map(slot => (
              <div key={slot.id} className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{formatDate(slot.slot_date)} at {slot.slot_time}</p>
                    <p className="text-[10px] text-slate-400">{slot.duration_mins} min session</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {slot.booked_by_lead_id ? (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Booked by {slot.booked_by_lead_name || "Lead"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Available
                    </span>
                  )}
                  {!slot.booked_by_lead_id && (
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors border-0 cursor-pointer bg-transparent"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <Modal open={!!confirmingId} onClose={() => setConfirmingId(null)} title="Confirm Appointment" maxWidth="sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meeting Link (optional)</label>
            <input
              type="url"
              value={meetingLink}
              onChange={e => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleConfirm} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer">
              Confirm & Notify Lead
            </button>
            <button onClick={() => setConfirmingId(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-0 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Complete Modal */}
      <Modal open={!!completingId} onClose={() => setCompletingId(null)} title="Mark as Completed" maxWidth="sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deal Value (₹, optional)</label>
            <input
              type="number"
              value={dealValue || ""}
              onChange={e => setDealValue(Number(e.target.value))}
              placeholder="e.g. 29999"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleComplete} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer">
              Complete Appointment
            </button>
            <button onClick={() => setCompletingId(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-0 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!cancellingId}
        onClose={() => setCancellingId(null)}
        onConfirm={handleCancel}
        title="Cancel Appointment"
        message="This appointment will be cancelled. The lead will not be automatically notified."
        confirmLabel="Yes, Cancel It"
        variant="danger"
      />
    </div>
  );
}
