"use client";

import { useState } from "react";
import { Bell, BellOff, Trash2, X, ChefHat, UtensilsCrossed, Receipt, CheckCircle } from "lucide-react";
import { useRealtimeNotifications, NotificationItem } from "@/hooks/useRealtimeNotifications";

export default function NotificationCenter({
  restaurantId,
  role,
}: {
  restaurantId?: string | null;
  role?: string;
}) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    markAllAsRead,
    clearNotifications,
  } = useRealtimeNotifications(restaurantId, role);

  function getIcon(type: NotificationItem["type"]) {
    switch (type) {
      case "ORDER_PLACED":
        return <ChefHat size={16} className="text-amber-400" />;
      case "ORDER_READY":
        return <UtensilsCrossed size={16} className="text-cyan-400" />;
      case "BILL_PAID":
        return <Receipt size={16} className="text-emerald-400" />;
      default:
        return <CheckCircle size={16} className="text-indigo-400" />;
    }
  }

  return (
    <div className="relative z-50">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) markAllAsRead();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition-all focus:outline-none"
        title="Realtime Notifications"
      >
        {soundEnabled ? (
          <Bell size={18} className={unreadCount > 0 ? "text-amber-400 animate-bounce" : "text-slate-300"} />
        ) : (
          <BellOff size={18} className="text-slate-500" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow-md shadow-rose-500/40">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Drawer Dropdown */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white">Live Notifications</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSoundEnabled((prev) => !prev)}
                  className={`p-1.5 rounded-lg border text-xs transition ${
                    soundEnabled
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                      : "border-white/10 bg-white/5 text-slate-500"
                  }`}
                  title={soundEnabled ? "Mute Sound Alerts" : "Enable Sound Alerts"}
                >
                  {soundEnabled ? <Bell size={13} /> : <BellOff size={13} />}
                </button>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearNotifications}
                    className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-rose-300 transition"
                    title="Clear All"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white transition"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="mt-3 max-h-80 space-y-2.5 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No notifications yet. Realtime events will chime here live.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                      notif.read
                        ? "border-white/5 bg-white/3 text-slate-300"
                        : "border-amber-400/30 bg-amber-400/5 text-white shadow-sm"
                    }`}
                  >
                    <div className="mt-0.5 rounded-lg bg-black/40 p-2">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                        <span className="text-[10px] text-slate-500 shrink-0">{notif.timestamp}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300 leading-snug">{notif.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 border-t border-white/10 pt-2 text-center text-[10px] text-slate-500">
              Connected via Supabase Realtime Engine · {soundEnabled ? "Audio Active" : "Muted"}
            </div>
          </div>
        </>
      )}

      {/* Floating Live Toast Popup for Newest Event */}
      {notifications.length > 0 && !notifications[0].read && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-slate-900/95 p-4 text-slate-100 shadow-2xl shadow-amber-500/20 backdrop-blur-xl max-w-xs sm:max-w-sm animate-bounce-short">
          <div className="rounded-xl bg-amber-400/20 p-2 text-amber-400">
            {getIcon(notifications[0].type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold text-white truncate">{notifications[0].title}</h4>
              <span className="text-[10px] text-slate-400 shrink-0">{notifications[0].timestamp}</span>
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-snug">{notifications[0].message}</p>
          </div>
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
