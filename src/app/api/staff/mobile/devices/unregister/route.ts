import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyStaffJwt, hashDeviceToken } from "@/lib/crypto/auth-tokens";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unregisterDeviceSchema = z.object({
  device_token: z.string().min(10, "Invalid FCM token"),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing Bearer token" }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();
    const payload = verifyStaffJwt(token);

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = unregisterDeviceSchema.parse(body);

    const deviceTokenHash = hashDeviceToken(parsed.device_token);
    const db = getSupabaseAdmin();

    const { error } = await db
      .from("staff_push_devices")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("staff_id", payload.staff_id)
      .eq("device_token_hash", deviceTokenHash);

    if (error) {
      console.error("[DeviceUnregisterApi] Database error:", error.message);
      throw new Error(`Failed to unregister push device: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      unregistered: true,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || "Device unregistration failed" }, { status: 500 });
  }
}
