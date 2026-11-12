import { NextResponse } from "next/server";
import { callEdgeAiRoute } from "@/services/ai/edgeWorkerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { message?: string; knowledgeContext?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const message = String(body.message || "").trim();
  if (!message) {
    return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
  }

  const edgeRes = await callEdgeAiRoute("/ai/website-chat", {
    message,
    knowledgeContext: String(body.knowledgeContext || "").slice(0, 1500),
  });

  if (edgeRes.ok && edgeRes.reply) {
    return NextResponse.json({
      ok: true,
      reply: edgeRes.reply,
      source: "cloudflare-workers-ai",
    });
  }

  return NextResponse.json({
    ok: false,
    fallback: true,
    error: edgeRes.error || "Edge AI unavailable",
  });
}
