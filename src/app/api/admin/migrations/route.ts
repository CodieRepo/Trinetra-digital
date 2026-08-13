import { NextResponse } from "next/server";
import { Client } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const adminKey = request.headers.get("x-admin-key") || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const secretKey = process.env.ADMIN_ONBOARDING_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey || (adminKey !== secretKey && bearerToken !== secretKey)) {
    return NextResponse.json({ error: "Unauthorized access to migration endpoint" }, { status: 401 });
  }

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "Missing DATABASE_URL" }, { status: 500 });
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();

    // 1. Enable Supabase Realtime publication on restaurant tables
    const realtimeSql = `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'restaurant_orders'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_orders;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'restaurant_table_sessions'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_table_sessions;
          END IF;
        END IF;
      END $$;
    `;
    await client.query(realtimeSql);

    // 2. Add custom columns to restaurants table if missing
    const columnsSql = `
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS upi_id TEXT,
      ADD COLUMN IF NOT EXISTS upi_qr_url TEXT,
      ADD COLUMN IF NOT EXISTS business_gstin TEXT,
      ADD COLUMN IF NOT EXISTS receipt_header_note TEXT,
      ADD COLUMN IF NOT EXISTS receipt_footer_note TEXT,
      ADD COLUMN IF NOT EXISTS tax_rate_percent NUMERIC DEFAULT 5,
      ADD COLUMN IF NOT EXISTS service_charge_percent NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{"cash": true, "upi": true, "card": true, "split": true}'::jsonb;

      ALTER TABLE restaurant_table_sessions
      ADD COLUMN IF NOT EXISTS payment_method TEXT,
      ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS customer_utr TEXT;

      ALTER TABLE restaurant_bills
      ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
      ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10, 2) DEFAULT 0;
    `;
    await client.query(columnsSql);

    return NextResponse.json({
      success: true,
      message: "Database schema and Supabase Realtime publication updated successfully!",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await client.end();
  }
}
