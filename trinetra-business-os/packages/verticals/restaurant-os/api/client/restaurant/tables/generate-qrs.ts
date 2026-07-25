import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import QRCode from "qrcode";
import { buildRestaurantQrUrl, isUuid } from "../types";
import { getPublicBaseUrl } from "@/lib/scanUrl";
import { logger } from "@trinetra/core/logging";
import {
  getApiErrorStatus,
  getErrorMessage,
  requireRestaurantClientContext,
} from "../../services/server";

export const dynamic = "force-dynamic";

type TableRecord = {
  id: string;
  table_number: string;
  table_token: string;
};

export async function POST() {
  return NextResponse.json(
    { error: "QR generation is restricted to admin panel" },
    { status: 403 },
  );
}
