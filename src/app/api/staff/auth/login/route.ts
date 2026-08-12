import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SupabaseAuthRepository } from "@/repositories/auth/supabase-auth.repository";
import { StaffAuthenticationService } from "@/services/auth/staff-authentication.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const staffLoginSchema = z.object({
  restaurant_id: z.string().uuid("Invalid restaurant ID format"),
  device_token: z.string().optional().default("mobile-pos"),
  pin: z.string().min(4, "PIN must be at least 4 digits").max(8, "PIN max 8 digits"),
});

export async function POST(request: Request) {
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "127.0.0.1";

  try {
    const db = getSupabaseAdmin();

    // 1. IP-Level Sliding Window Rate Limit Check (Max 10 failed attempts / 15 mins)
    const { data: rateLimitRes } = await db.rpc("check_ip_login_rate_limit_rpc", {
      p_ip_address: ipAddress,
      p_max_attempts: 10,
      p_window_minutes: 15,
    });

    if (rateLimitRes && rateLimitRes.allowed === false) {
      return NextResponse.json(
        { error: "Too many login attempts from this IP. Please try again in 15 minutes." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitRes.retry_after_seconds || 900) },
        }
      );
    }

    const body = await request.json();
    const parsed = staffLoginSchema.parse(body);

    const authRepo = new SupabaseAuthRepository();
    const authService = new StaffAuthenticationService(authRepo);

    const result = await authService.loginWithPin({
      restaurant_id: parsed.restaurant_id,
      device_token: parsed.device_token,
      pin: parsed.pin,
      ip_address: ipAddress,
    });

    return NextResponse.json({
      success: true,
      token: result.staff_jwt,
      expires_at: result.expires_at,
      staff: result.staff,
      terminal: result.terminal,
      session_type: result.session_type,
    });
  } catch (error: any) {
    console.error("[StaffAuthApi] Login error:", error.message);

    // Record failed IP login attempt
    try {
      const db = getSupabaseAdmin();
      await db.rpc("record_failed_ip_login_rpc", { p_ip_address: ipAddress });
    } catch (e) {}

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation Error", details: error.issues },
        { status: 400 }
      );
    }

    const message = error.message || "Authentication failed";
    const statusCode =
      message.includes("PIN") || message.includes("INVALID")
        ? 401
        : message.includes("TERMINAL")
        ? 403
        : 500;

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
