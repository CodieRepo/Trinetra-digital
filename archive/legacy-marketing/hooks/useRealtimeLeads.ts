import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { Lead } from "../types/crm";

export function useRealtimeLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/v1/leads");
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    // 1. Polling interval fallback for instant UI updates (every 3 seconds)
    const interval = setInterval(() => {
      fetchLeads();
    }, 3000);

    // 2. Subscribe to Supabase Realtime changes on 'leads' table
    const channel = supabase
      .channel("realtime-leads-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          console.log("⚡ Realtime Lead Event:", payload);
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return { leads, loading, refetch: fetchLeads };
}
