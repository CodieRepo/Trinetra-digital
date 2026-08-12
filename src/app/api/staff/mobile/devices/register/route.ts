import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyStaffJwt, hashDeviceToken } from "@/lib/crypto/auth-tokens";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerDeviceSchema = z.object({
  device_token: z.string().min(10, "Invalid FCM token"),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  device_name: z.string().optional().default("Mobile POS"),
  app_version: z.string().optional().default("1.0.0"),
  environment: z.enum(["development", "staging", "production"]).optional().default("production"),
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
    const parsed = registerDeviceSchema.parse(body);

    const deviceTokenHash = hashDeviceToken(parsed.device_token);
    const db = getSupabaseAdmin();

    const { data: device, error } = await db
      .from("staff_push_devices")
      .upsert(
        {
          tenant_id: payload.tenant_id,
          restaurant_id: payload.restaurant_id,
          staff_id: payload.staff_id,
          device_token: parsed.device_token,
          device_token_hash: deviceTokenHash,
          platform: parsed.platform,
          device_name: parsed.device_name,
          app_version: parsed.app_version,
          environment: parsed.environment,
          is_active: true,
          failure_count: 0,
          last_seen_at: new Date().toISOString(),
          last_token_refresh_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "device_token" }
      )
      .select("id, created_at, updated_at")
      .single();

    if (error) {
      console.error("[DeviceRegisterApi] Database error:", error.message);
      throw new Error(`Failed to register push device: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      device_id: device.id,
      registered_at: device.updated_at || device.created_at,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || "Device registration failed" }, { status: 500 });
  }
}
