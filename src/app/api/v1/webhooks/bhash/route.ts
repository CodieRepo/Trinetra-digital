import { NextResponse } from "next/server";
import { POST as handleTokenWebhook, GET as handleTokenGet } from "./[token]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || request.headers.get("x-webhook-token");

  if (token) {
    return handleTokenGet(request, { params: Promise.resolve({ token }) });
  }

  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");
  return new Response(challenge || "BhashSMS Webhook Service Active. Configure with your dedicated token URL: /api/v1/webhooks/bhash/<token>", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || request.headers.get("x-webhook-token");

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized: Missing webhook token. Configure endpoint as: /api/v1/webhooks/bhash/<token>" },
      { status: 401 }
    );
  }

  return handleTokenWebhook(request, { params: Promise.resolve({ token }) });
}
