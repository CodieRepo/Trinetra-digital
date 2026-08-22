"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type NotificationItem = {
  id: string;
  type: "ORDER_PLACED" | "ORDER_READY" | "ORDER_SERVED" | "BILL_PAID" | "SESSION_OPENED";
  title: string;
  message: string;
  timestamp: string;
  tableNumber?: string;
  orderId?: string;
  amount?: number;
  read: boolean;
};

// Global AudioContext singleton - initialized ONLY after user interaction
let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      try {
        globalAudioCtx = new AudioCtx();
      } catch {}
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      if (!globalAudioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) globalAudioCtx = new AudioCtx();
      } else if (globalAudioCtx.state === "suspended") {
        globalAudioCtx.resume().catch(() => {});
      }
    } catch {}
  };
  window.addEventListener("click", unlockAudio, { once: true, passive: true });
  window.addEventListener("keydown", unlockAudio, { once: true, passive: true });
  window.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
}

// Web Audio API Synthesizer for zero-dependency sound chimes
function playChimeSound(type: "new_order" | "ready" | "paid") {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (type === "new_order") {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.6);
    } else if (type === "ready") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } else if (type === "paid") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    }
  } catch {
    // Audio Context blocked — safe fallback
  }
}

export function useRealtimeNotifications(restaurantId?: string | null, _role?: string) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const addNotification = useCallback(
    (item: Omit<NotificationItem, "id" | "timestamp" | "read">) => {
      const newItem: NotificationItem = {
        ...item,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: false,
      };

      setNotifications((prev) => [newItem, ...prev].slice(0, 50));

      if (soundEnabled) {
        if (newItem.type === "ORDER_PLACED") {
          playChimeSound("new_order");
        } else if (newItem.type === "ORDER_READY") {
          playChimeSound("ready");
        } else if (newItem.type === "BILL_PAID") {
          playChimeSound("paid");
        }
      }
    },
    [soundEnabled]
  );

  const addNotificationRef = useRef(addNotification);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 1. Supabase WebSockets Subscription with single stable channel & safe error handling
  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();
    const channelName = `notifs-live-${restaurantId}`;
    let channel: any = null;

    try {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "restaurant_orders",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newOrder = payload.new;
              if (!knownOrderIds.current.has(newOrder.id)) {
                knownOrderIds.current.add(newOrder.id);
                addNotificationRef.current({
                  type: "ORDER_PLACED",
                  title: `New Order Placed!`,
                  message: `Order #${newOrder.id.slice(0, 6)} totaling ₹${newOrder.total_amount} received.`,
                  orderId: newOrder.id,
                  amount: newOrder.total_amount,
                });
              }
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new;
              if (updated.status === "ready") {
                addNotificationRef.current({
                  type: "ORDER_READY",
                  title: `Order Ready to Serve!`,
                  message: `Order #${updated.id.slice(0, 6)} is ready in kitchen.`,
                  orderId: updated.id,
                });
              } else if (updated.status === "served") {
                addNotificationRef.current({
                  type: "ORDER_SERVED",
                  title: `Order Served`,
                  message: `Order #${updated.id.slice(0, 6)} served to table.`,
                  orderId: updated.id,
                });
              }
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "restaurant_table_sessions",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            const updated = payload.new;
            if (updated.payment_status === "paid" && payload.old?.payment_status !== "paid") {
              addNotificationRef.current({
                type: "BILL_PAID",
                title: `Bill Settled & Paid`,
                message: `Table session has been settled successfully.`,
              });
            }
          }
        )
        .subscribe((status: string) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            try {
              if (channel) void supabase.removeChannel(channel);
            } catch {}
          }
        });
    } catch (subErr) {
      // Safe fallback to polling
    }

    return () => {
      try {
        if (channel) void supabase.removeChannel(channel);
      } catch {
        // Safe cleanup
      }
    };
  }, [restaurantId]);

  // 2. Hybrid Polling Fallback (Runs every 6s to ensure 100% notification reliability)
  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();

    async function pollLatestOrders() {
      try {
        let activeToken = typeof window !== "undefined" ? sessionStorage.getItem("trinetra_staff_token") : null;
        if (!activeToken) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              activeToken = session.access_token;
            }
          } catch {}
        }

        // Only poll authenticated endpoint if an active token is present
        if (!activeToken) return;

        const res = await fetch(`/api/client/restaurant/orders?restaurant_id=${restaurantId}`, {
          headers: { Authorization: `Bearer ${activeToken}` },
          cache: "no-store",
        });

        if (res.status === 401) {
          // Token expired or invalid; safely skip
          return;
        }

        if (!res.ok) return;
        const data = await res.json();
        const orders = data.orders || [];

        if (isFirstLoad.current) {
          orders.forEach((o: any) => knownOrderIds.current.add(o.id));
          isFirstLoad.current = false;
          return;
        }

        for (const ord of orders) {
          if (!knownOrderIds.current.has(ord.id)) {
            knownOrderIds.current.add(ord.id);
            addNotificationRef.current({
              type: "ORDER_PLACED",
              title: `New Order Placed!`,
              message: `Order #${ord.id.slice(0, 6)} totaling ₹${ord.total_amount || ord.totalAmount} received.`,
              orderId: ord.id,
              amount: ord.total_amount || ord.totalAmount,
            });
          }
        }
      } catch {
        // Silent catch for background notification poll
      }
    }

    const interval = setInterval(pollLatestOrders, 6000);
    void pollLatestOrders();

    return () => clearInterval(interval);
  }, [restaurantId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    markAllAsRead,
    clearNotifications,
    triggerManualSound: playChimeSound,
  };
}
