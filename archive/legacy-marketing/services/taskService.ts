import { getSupabaseAdmin } from "../lib/supabase/admin";
import { Task } from "../types/crm";

export class TaskService {
  private db = getSupabaseAdmin();

  async createTask(params: {
    tenant_id?: string;
    lead_id: string;
    title: string;
    description?: string;
    task_type?: "call" | "quotation" | "meeting" | "documents" | "payment_followup" | "support_followup";
    priority?: "low" | "medium" | "high" | "urgent";
    due_date: string;
    assigned_to?: string;
  }): Promise<Task> {
    const tenant_id = params.tenant_id || "00000000-0000-0000-0000-000000000001";

    const { data, error } = await this.db
      .from("tasks")
      .insert({
        tenant_id,
        lead_id: params.lead_id,
        title: params.title,
        description: params.description || null,
        task_type: params.task_type || "call",
        priority: params.priority || "medium",
        due_date: params.due_date,
        assigned_to: params.assigned_to || "Sales Manager",
      })
      .select("*")
      .single();

    if (error) {
      console.error("TaskService.createTask error:", error);
      throw error;
    }

    return data as Task;
  }

  async getTasksByLeadId(leadId: string, limit = 50): Promise<Task[]> {
    const { data, error } = await this.db
      .from("tasks")
      .select("*")
      .eq("lead_id", leadId)
      .is("deleted_at", null)
      .order("due_date", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("TaskService.getTasksByLeadId error:", error);
      return [];
    }

    return (data || []) as Task[];
  }

  async completeTask(taskId: string): Promise<Task> {
    const { data, error } = await this.db
      .from("tasks")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select("*")
      .single();

    if (error) {
      console.error("TaskService.completeTask error:", error);
      throw error;
    }

    return data as Task;
  }
}

export const taskService = new TaskService();
