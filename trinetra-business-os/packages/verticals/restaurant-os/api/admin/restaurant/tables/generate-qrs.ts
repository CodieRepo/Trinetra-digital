import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import QRCode from "qrcode";
import { verifyAdmin } from "@trinetra/core/auth";
import { getDatabaseClient } from "@trinetra/core/database";
import { buildRestaurantQrUrl, isUuid } from "../types";
import { getPublicBaseUrl } from "@/lib/scanUrl";
import { logger } from "@trinetra/core/logging";

export const dynamic = "force-dynamic";

type RestaurantRecord = {
  id: string;
};

type TableRecord = {
  id: string;
  table_number: string;
  table_token: string;
};

async function getRestaurantIdByClientId(clientId: string) {
  const supabase = getSupabaseAdmin();
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("id")
    .eq("client_id", clientId)
    .maybeSingle<RestaurantRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return restaurant?.id ?? null;
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    logger.info("[restaurant.qr.admin] request received");

    const body = await request.json();
    const clientId =
      typeof body?.client_id === "string" ? body.client_id.trim() : "";
    const tableIds = Array.isArray(body?.table_ids)
      ? (body.table_ids as unknown[])
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      : [];

    logger.info(
      { client_id: clientId || null, requested_table_count: tableIds.length },
      "[restaurant.qr.admin] parsed request",
    );

    if (!isUuid(clientId)) {
      logger.warn("[restaurant.qr.admin] rejected: invalid client_id");
      return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
    }

    if (tableIds.length > 0 && tableIds.some((tableId) => !isUuid(tableId))) {
      logger.warn(
        { client_id: clientId },
        "[restaurant.qr.admin] rejected: invalid table_ids payload",
      );
      return NextResponse.json(
        { error: "table_ids must be UUIDs" },
        { status: 400 },
      );
    }

    const restaurantId = await getRestaurantIdByClientId(clientId);
    if (!restaurantId) {
      logger.warn(
        { client_id: clientId },
        "[restaurant.qr.admin] restaurant not found for client",
      );
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const supabase = getSupabaseAdmin();
    let tableQuery = supabase
      .from("restaurant_tables")
      .select("id, table_number, table_token")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("table_number", { ascending: true });

    if (tableIds.length > 0) {
      tableQuery = tableQuery.in("id", tableIds);
    }

    const { data: tables, error: tablesError } =
      await tableQuery.returns<TableRecord[]>();

    if (tablesError) {
      throw new Error(tablesError.message);
    }

    logger.info(
      {
        client_id: clientId,
        restaurant_id: restaurantId,
        requested_table_count: tableIds.length,
        resolved_table_count: tables?.length ?? 0,
      },
      "[restaurant.qr.admin] table lookup completed",
    );

    if (!tables || tables.length === 0) {
      logger.warn(
        { client_id: clientId, restaurant_id: restaurantId },
        "[restaurant.qr.admin] no active tables found",
      );
      return NextResponse.json(
        { error: "No active tables found" },
        { status: 404 },
      );
    }

    if (tableIds.length > 0 && tables.length !== tableIds.length) {
      logger.warn(
        { client_id: clientId, restaurant_id: restaurantId },
        "[restaurant.qr.admin] one or more requested tables missing",
      );
      return NextResponse.json(
        { error: "One or more tables were not found" },
        { status: 404 },
      );
    }

    const baseUrl = getPublicBaseUrl();

    // Auto-create storage bucket if it doesn't exist yet
    const { data: bucket, error: bucketError } =
      await supabase.storage.getBucket("restaurant-qrs");
    if (bucketError || !bucket) {
      logger.info(
        { client_id: clientId, restaurant_id: restaurantId },
        "[restaurant.qr.admin] bucket missing — creating restaurant-qrs",
      );
      const { error: createBucketError } = await supabase.storage.createBucket(
        "restaurant-qrs",
        {
          public: false,
          fileSizeLimit: 52428800, // 50 MB
        },
      );
      if (
        createBucketError &&
        !createBucketError.message?.includes("already exists")
      ) {
        logger.error(
          {
            client_id: clientId,
            restaurant_id: restaurantId,
            error: createBucketError.message,
          },
          "[restaurant.qr.admin] failed to create storage bucket",
        );
        throw new Error(
          "Failed to initialize QR storage. Please try again or contact support.",
        );
      }
    }

    const zip = new JSZip();
    let csvContent = "table_number,table_token,url\n";

    for (const table of tables) {
      const qrUrl = buildRestaurantQrUrl(baseUrl, table.table_token);
      const buffer = await QRCode.toBuffer(qrUrl, {
        errorCorrectionLevel: "M",
        width: 300,
        margin: 2,
        type: "png",
      });

      const safeTableNumber = table.table_number.replace(/[^a-z0-9-_]+/gi, "_");
      zip.file(`${safeTableNumber || table.id}.png`, new Uint8Array(buffer));
      csvContent += `${table.table_number},${table.table_token},${qrUrl}\n`;
    }

    zip.file("restaurant_tables.csv", csvContent);

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "STORE",
    });

    const filePath = `${restaurantId}/${randomUUID()}.zip`;

    const { error: uploadError } = await supabase.storage
      .from("restaurant-qrs")
      .upload(filePath, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      logger.error(
        {
          client_id: clientId,
          restaurant_id: restaurantId,
          file_path: filePath,
          error: uploadError.message,
        },
        "[restaurant.qr.admin] upload failed",
      );
      throw new Error(uploadError.message);
    }

    logger.info(
      { client_id: clientId, restaurant_id: restaurantId, file_path: filePath },
      "[restaurant.qr.admin] upload succeeded",
    );

    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from("restaurant-qrs")
        .createSignedUrl(filePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      logger.error(
        {
          client_id: clientId,
          restaurant_id: restaurantId,
          file_path: filePath,
          error: signedUrlError?.message,
        },
        "[restaurant.qr.admin] signed url creation failed",
      );
      throw new Error(signedUrlError?.message || "Failed to sign QR archive");
    }

    logger.info(
      { client_id: clientId, restaurant_id: restaurantId, file_path: filePath },
      "[restaurant.qr.admin] signed url created",
    );

    return NextResponse.json({
      download_url: signedUrlData.signedUrl,
      file_path: filePath,
      generated_count: tables.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    logger.error({ error: message }, "[restaurant.qr.admin] failed");
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : message.includes("not found")
          ? 404
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
