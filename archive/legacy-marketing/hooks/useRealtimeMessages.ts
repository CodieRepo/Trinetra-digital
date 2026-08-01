import { useEffect, useState, useCallback } from "react";
import { createClient } from "../lib/supabase/client";
import { Lead, ConversationMessage, TimelineEvent, Task, LeadNote } from "../types/crm";

export function useRealtimeMessages(selectedLeadId: string | null) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const loadLeadDetails = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const res = await fetch(`/api/v1/leads?leadId=${selectedLeadId}`);
      const data = await res.json();
      if (data.success) {
        setLead(data.lead);
        setMessages(data.messages || []);
        setTimeline(data.timeline || []);
        setTasks(data.tasks || []);
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Error loading lead details:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedLeadId]);

  useEffect(() => {
    loadLeadDetails();

    if (!selectedLeadId) return;

    // 1. Polling interval fallback for active lead messages (every 3 seconds)
    const interval = setInterval(() => {
      loadLeadDetails();
    }, 3000);

    // 2. Realtime channel for messages, conversations, timeline, tasks, notes
    const channel = supabase
      .channel(`lead-details-${selectedLeadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `lead_id=eq.${selectedLeadId}` },
        () => loadLeadDetails()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bhash_conversations", filter: `lead_id=eq.${selectedLeadId}` },
        () => loadLeadDetails()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "timeline_events", filter: `lead_id=eq.${selectedLeadId}` },
        () => loadLeadDetails()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `lead_id=eq.${selectedLeadId}` },
        () => loadLeadDetails()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_notes", filter: `lead_id=eq.${selectedLeadId}` },
        () => loadLeadDetails()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [selectedLeadId, loadLeadDetails]);

  return { lead, messages, timeline, tasks, notes, loading, refetch: loadLeadDetails };
}
