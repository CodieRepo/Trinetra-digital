import { useEffect, useState } from "react";
import { Lead } from "../types/crm";

export function useRealtimeLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Fast polling interval for instant UI updates (every 3 seconds)
    const interval = setInterval(() => {
      fetchLeads();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return { leads, loading, refetch: fetchLeads };
}
