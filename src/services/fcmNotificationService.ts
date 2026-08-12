import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface OrderPushEvent {
  order_id: string;
  tenant_id: string;
  restaurant_id: string;
  table_number?: string;
  status: string;
  title: string;
  body: string;
  target_roles?: string[];
}

export class FcmNotificationService {
  /**
   * Dispatch an order push notification event asynchronously post-commit.
   * Does NOT block or fail database transactions.
   */
  async dispatchOrderNotification(event: OrderPushEvent): Promise<{
    dispatched_at: string;
    total_recipients: number;
    success_count: number;
    failure_count: number;
    response_time_ms: number;
  }> {
    const startTime = Date.now();
    const db = getSupabaseAdmin();

    try {
      const targetRoles = event.target_roles || ["kitchen", "waiter", "manager", "owner"];

      // 1. Resolve active staff members for this restaurant & role
      const { data: staffList, error: staffError } = await db
        .from("restaurant_staff")
        .select("id")
        .eq("restaurant_id", event.restaurant_id)
        .in("role", targetRoles)
        .eq("is_active", true);

      if (staffError || !staffList || staffList.length === 0) {
        return {
          dispatched_at: new Date().toISOString(),
          total_recipients: 0,
          success_count: 0,
          failure_count: 0,
          response_time_ms: Date.now() - startTime,
        };
      }

      const staffIds = staffList.map((s) => s.id);

      // 2. Resolve active push devices for these staff members
      const { data: devices, error: deviceError } = await db
        .from("staff_push_devices")
        .select("id, device_token, device_token_hash, failure_count")
        .eq("tenant_id", event.tenant_id)
        .eq("restaurant_id", event.restaurant_id)
        .in("staff_id", staffIds)
        .eq("is_active", true);

      if (deviceError || !devices || devices.length === 0) {
        return {
          dispatched_at: new Date().toISOString(),
          total_recipients: 0,
          success_count: 0,
          failure_count: 0,
          response_time_ms: Date.now() - startTime,
        };
      }

      let successCount = 0;
      let failureCount = 0;
      const collapseKey = `order_${event.order_id}_${event.status}`;

      // 3. Dispatch to FCM for each registered device
      for (const device of devices) {
        const sendResult = await this.sendFcmMessage({
          deviceToken: device.device_token,
          title: event.title,
          body: event.body,
          collapseKey,
          data: {
            type: "ORDER_UPDATE",
            order_id: event.order_id,
            status: event.status,
            table_number: event.table_number || "",
            restaurant_id: event.restaurant_id,
          },
        });

        if (sendResult.success) {
          successCount++;
          // Log success telemetry
          await db
            .from("staff_push_devices")
            .update({
              last_push_success_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
            })
            .eq("id", device.id);
        } else {
          failureCount++;
          // Stale / Invalid token handling: auto-deactivate
          if (sendResult.isUnregistered || sendResult.isInvalid) {
            await db
              .from("staff_push_devices")
              .update({
                is_active: false,
                failure_count: (device.failure_count || 0) + 1,
                last_push_failure_at: new Date().toISOString(),
              })
              .eq("id", device.id);
          }
        }
      }

      const responseTimeMs = Date.now() - startTime;
      console.log(
        `[FcmService] Dispatched ${event.status} notification for order ${event.order_id}: ` +
          `${successCount} succeeded, ${failureCount} failed in ${responseTimeMs}ms`
      );

      return {
        dispatched_at: new Date().toISOString(),
        total_recipients: devices.length,
        success_count: successCount,
        failure_count: failureCount,
        response_time_ms: responseTimeMs,
      };
    } catch (err: any) {
      console.error("[FcmService] Event dispatch error:", err.message);
      return {
        dispatched_at: new Date().toISOString(),
        total_recipients: 0,
        success_count: 0,
        failure_count: 1,
        response_time_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Internal FCM Send implementation using OAuth2 / REST or Firebase Admin
   */
  private async sendFcmMessage(params: {
    deviceToken: string;
    title: string;
    body: string;
    collapseKey: string;
    data: Record<string, string>;
  }): Promise<{ success: boolean; isUnregistered?: boolean; isInvalid?: boolean }> {
    const fcmServerKey = process.env.FIREBASE_SERVER_KEY || process.env.FCM_SERVER_KEY;

    // Legacy / Mock Push fallback if FCM key is not set in local dev environment
    if (!fcmServerKey) {
      console.warn("[FcmService] FIREBASE_SERVER_KEY not set. Simulating push notification dispatch.");
      return { success: true };
    }

    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          to: params.deviceToken,
          collapse_key: params.collapseKey,
          priority: "high",
          notification: {
            title: params.title,
            body: params.body,
            sound: "default",
          },
          data: params.data,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        return {
          success: false,
          isUnregistered: status === 404 || status === 410,
          isInvalid: status === 400,
        };
      }

      const resData = await response.json();
      if (resData.failure > 0 && resData.results?.[0]?.error) {
        const errStr = String(resData.results[0].error).toLowerCase();
        return {
          success: false,
          isUnregistered: errStr.includes("notregistered") || errStr.includes("invalidregistration"),
          isInvalid: errStr.includes("invalidargument"),
        };
      }

      return { success: true };
    } catch (e: any) {
      console.error("[FcmService] Direct FCM HTTP error:", e.message);
      return { success: false };
    }
  }
}

export const fcmNotificationService = new FcmNotificationService();
