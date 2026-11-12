import { NextResponse } from "next/server";
import { verifyAuthenticatedCrmUser } from "@/lib/auth/crm-auth";
import { callEdgeAiRoute } from "@/services/ai/edgeWorkerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await verifyAuthenticatedCrmUser(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.statusCode || 401 });
  }

  let body: { leadName?: string; message?: string; history?: Array<{ direction?: string; text?: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = String(body.message || "").trim();
  const leadName = String(body.leadName || "there").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const edgeRes = await callEdgeAiRoute("/ai/bhash-reply", {
    leadName,
    message,
    history: Array.isArray(body.history) ? body.history.slice(-5) : [],
  });

  if (edgeRes.ok && edgeRes.reply) {
    return NextResponse.json({
      success: true,
      draft: edgeRes.reply,
      model: edgeRes.model,
      source: "cloudflare-workers-ai",
    });
  }

  return NextResponse.json({
    success: true,
    draft: `Hi ${leadName}, thanks for reaching out to Trinetra Digital Solution! Could you share a quick time that works for a 10-minute walkthrough?`,
    source: "deterministic-fallback",
  });
}
