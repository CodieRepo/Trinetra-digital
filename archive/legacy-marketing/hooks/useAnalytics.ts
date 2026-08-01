import { useEffect, useState } from "react";
import { DashboardMetrics } from "../types/crm";

export function useAnalytics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000); // Polling refresh every 15 sec
    return () => clearInterval(interval);
  }, []);

  return { metrics, loading, refetch: fetchAnalytics };
}
