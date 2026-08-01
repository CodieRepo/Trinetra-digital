import { NextResponse } from "next/server";
import { analyticsService } from "../../../services/analyticsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/analytics
 * Real-time Dashboard Analytics Endpoint
 */
export async function GET() {
  try {
    const metrics = await analyticsService.getDashboardAnalytics();
    return NextResponse.json({ success: true, metrics });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch analytics" }, { status: 500 });
  }
}
