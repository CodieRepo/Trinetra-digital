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
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?leadId=${selectedLeadId}`);
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

    // Realtime channel for conversations, timeline, tasks, notes
    const channel = supabase
      .channel(`lead-details-${selectedLeadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bhash_conversations", filter: `lead_id=eq.${selectedLeadId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ConversationMessage]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bhash_timeline_events", filter: `lead_id=eq.${selectedLeadId}` },
        (payload) => {
          setTimeline((prev) => [payload.new as TimelineEvent, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bhash_tasks", filter: `lead_id=eq.${selectedLeadId}` },
        () => {
          loadLeadDetails();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bhash_lead_notes", filter: `lead_id=eq.${selectedLeadId}` },
        (payload) => {
          setNotes((prev) => [payload.new as LeadNote, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLeadId, loadLeadDetails]);

  return { lead, messages, timeline, tasks, notes, loading, refetch: loadLeadDetails };
}
