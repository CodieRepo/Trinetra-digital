import { getSupabaseAdmin } from "../../lib/supabase/admin";

export interface BackgroundJob {
  id: string;
  tenant_id: string;
  idempotency_key: string;
  job_type: string;
  payload: Record<string, any>;
  status: "pending" | "processing" | "completed" | "failed";
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export class BackgroundJobService {
  private db = getSupabaseAdmin();

  async enqueueJob(params: {
    tenant_id?: string;
    idempotency_key: string;
    job_type: string;
    payload: Record<string, any>;
    max_retries?: number;
  }): Promise<BackgroundJob> {
    const tenant_id = params.tenant_id || "00000000-0000-0000-0000-000000000001";

    const { data: existing } = await this.db
      .from("background_jobs")
      .select("*")
      .eq("idempotency_key", params.idempotency_key)
      .maybeSingle();

    if (existing) {
      return existing as BackgroundJob;
    }

    const { data, error } = await this.db
      .from("background_jobs")
      .insert({
        tenant_id,
        idempotency_key: params.idempotency_key,
        job_type: params.job_type,
        payload: params.payload,
        status: "pending",
        retry_count: 0,
        max_retries: params.max_retries || 3,
      })
      .select("*")
      .single();

    if (error) {
      console.error("BackgroundJobService.enqueueJob error:", error);
      throw error;
    }

    return data as BackgroundJob;
  }

  async markJobStatus(
    jobId: string,
    status: "processing" | "completed" | "failed",
    errorMessage?: string,
    incrementRetry: boolean = false
  ): Promise<void> {
    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (errorMessage) {
      updatePayload.error_message = errorMessage;
    }

    if (incrementRetry) {
      const { data: job } = await this.db.from("background_jobs").select("retry_count").eq("id", jobId).single();
      updatePayload.retry_count = (job?.retry_count || 0) + 1;
    }

    await this.db.from("background_jobs").update(updatePayload).eq("id", jobId);
  }
}

export const backgroundJobService = new BackgroundJobService();
