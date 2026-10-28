import { NextResponse } from "next/server";
import { notificationOutboxService } from "@/services/notificationOutboxService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.JOB_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Server misconfiguration: JOB_SECRET_KEY is required" }, { status: 500 });
    }

    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    const isAuthorized = authHeader === `Bearer ${secret}` || querySecret === secret;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized worker access" }, { status: 401 });
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
