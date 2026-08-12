import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { FcmNotificationService, OrderPushEvent } from "./fcmNotificationService";

export interface OutboxJob {
  outbox_id: string;
  tenant_id: string;
  restaurant_id: string;
  event_type: string;
  aggregate_id: string;
  idempotency_key: string;
  payload: any;
  attempts: number;
}

export class NotificationOutboxService {
  /**
   * Processes a batch of pending outbox jobs using atomic row locking
   */
  public async processBatch(batchSize: number = 10, workerId: string = "outbox_worker_1"): Promise<{ processed: number; failed: number }> {
    const db = getSupabaseAdmin();
    const fcmService = new FcmNotificationService();

    // 1. Claim batch of jobs atomically (SKIP LOCKED)
    const { data: jobs, error: claimErr } = await db.rpc("claim_notification_outbox_batch_rpc", {
      p_batch_size: batchSize,
      p_worker_id: workerId,
      p_lease_seconds: 60,
    });

    if (claimErr || !jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return { processed: 0, failed: 0 };
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const job of jobs as OutboxJob[]) {
      try {
        const payload = job.payload || {};
        const status = payload.status || "placed";
        const pushEvent: OrderPushEvent = {
          order_id: payload.order_id || job.aggregate_id,
          tenant_id: job.tenant_id,
          restaurant_id: job.restaurant_id,
          table_number: payload.table_number || "Direct",
          status: status,
          title: `New Order Update: #${(payload.order_id || job.aggregate_id).slice(-4)}`,
          body: `Table ${payload.table_number || "Direct"} status is now ${status}`,
        };

        // 2. Dispatch FCM notification
        await fcmService.dispatchOrderNotification(pushEvent);

        // 3. Mark job as PROCESSED on success
        const now = new Date().toISOString();
        await db
          .from("notification_outbox")
          .update({
            status: "processed",
            processed_at: now,
            last_error: null,
          })
          .eq("id", job.outbox_id);

        processedCount++;
      } catch (err: any) {
        failedCount++;
        const errorMessage = err.message || "FCM dispatch error";
        const attempts = job.attempts || 1;
        const maxAttempts = 5;

        if (attempts >= maxAttempts) {
          // Permanently mark job as FAILED if max attempts reached
          await db
            .from("notification_outbox")
            .update({
              status: "failed",
              last_error: `Permanent Failure (Attempts: ${attempts}/${maxAttempts}): ${errorMessage}`,
            })
            .eq("id", job.outbox_id);
        } else {
          // Re-queue with exponential backoff (2^attempts * 10 seconds)
          const backoffSeconds = Math.pow(2, attempts) * 10;
          const availableAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

          await db
            .from("notification_outbox")
            .update({
              status: "pending",
              available_at: availableAt,
              last_error: `Retry ${attempts}/${maxAttempts}: ${errorMessage}`,
            })
            .eq("id", job.outbox_id);
        }
      }
    }

    return { processed: processedCount, failed: failedCount };
  }

  /**
   * Metrics query for operational visibility
   */
  public async getOutboxMetrics(tenantId?: string, restaurantId?: string) {
    const db = getSupabaseAdmin();
    let query = db.from("notification_outbox").select("status, attempts", { count: "exact" });

    if (tenantId && restaurantId) {
      query = query.eq("tenant_id", tenantId).eq("restaurant_id", restaurantId);
    }

    const { data, error } = await query;
    if (error || !data) return { pending: 0, processing: 0, processed: 0, failed: 0 };

    const metrics = {
      pending: data.filter((d) => d.status === "pending").length,
      processing: data.filter((d) => d.status === "processing").length,
      processed: data.filter((d) => d.status === "processed").length,
      failed: data.filter((d) => d.status === "failed").length,
    };

    return metrics;
  }
}

export const notificationOutboxService = new NotificationOutboxService();
