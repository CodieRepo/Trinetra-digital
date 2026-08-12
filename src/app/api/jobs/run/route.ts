import { NextResponse } from "next/server";
import { notificationOutboxService } from "@/services/notificationOutboxService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.JOB_SECRET_KEY || "outbox_worker_secret_123";

    if (authHeader !== `Bearer ${secret}`) {
      // Internal execution check
      const url = new URL(request.url);
      if (url.searchParams.get("secret") !== secret) {
        return NextResponse.json({ error: "Unauthorized worker access" }, { status: 401 });
      }
    }

    const { processed, failed } = await notificationOutboxService.processBatch(10, "cron_outbox_worker");

    return NextResponse.json({
      success: true,
      processed,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal worker error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
