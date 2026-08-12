import { NextResponse } from "next/server";
import { z } from "zod";
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
  try {
    const body = await request.json();
    const parsed = staffLoginSchema.parse(body);

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

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
