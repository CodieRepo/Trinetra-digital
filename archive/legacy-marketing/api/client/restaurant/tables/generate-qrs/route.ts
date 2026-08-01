import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../../context";
import QRCode from "qrcode";
import JSZip from "jszip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request, body);
    
    if (!restaurantId) {
      return NextResponse.json({ error: "No restaurant profile found" }, { status: 404 });
    }

    const { table_ids } = body;
    if (!table_ids || !Array.isArray(table_ids) || table_ids.length === 0) {
      return NextResponse.json({ error: "table_ids array is required" }, { status: 400 });
    }

    // 1. Fetch tables details
    const { data: tables, error: tableErr } = await db
      .from("restaurant_tables")
      .select("id, table_number, table_token")
      .in("id", table_ids)
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId);

    if (tableErr) {
      return NextResponse.json({ error: tableErr.message }, { status: 500 });
    }

    if (!tables || tables.length === 0) {
      return NextResponse.json({ error: "No valid tables found to export" }, { status: 404 });
    }

    // Determine host for scanning URLs
    const host = request.headers.get("host") || "trinetradigitalsolution.com";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // 2. Initialize JSZip
    const zip = new JSZip();

    // 3. Generate QR code for each table and append to zip
    for (const table of tables) {
      const qrUrl = `${baseUrl}/r/${table.table_token}`;
      
      // Generate QR buffer
      const qrBuffer = await QRCode.toBuffer(qrUrl, {
        errorCorrectionLevel: "H",
        type: "png",
        width: 400,
        margin: 2
      });

      // Name format: Table_T-01_QR.png (sanitize file name spaces)
      const filename = `Table_${table.table_number.replace(/\s+/g, "_")}_QR.png`;
      zip.file(filename, qrBuffer);
    }

    // 4. Generate ZIP file buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const base64Zip = zipBuffer.toString("base64");
    const downloadUrl = `data:application/zip;base64,${base64Zip}`;

    return NextResponse.json({ success: true, download_url: downloadUrl });
  } catch (err: any) {
    console.error("❌ QR Generation Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
