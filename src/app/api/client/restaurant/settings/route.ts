import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { restaurantId } = await resolveRestaurantContext(request);

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant context not found" }, { status: 404 });
    }

    // 1. Fetch restaurant basic info
    const { data: restaurant, error: restErr } = await db
      .from("restaurants")
      .select("id, tenant_id, name, address, currency, logo_url")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: restErr?.message || "Restaurant not found" }, { status: 404 });
    }

    // 2. Fetch custom settings from tenant_settings (using tenant_id)
    let paymentSettings: any = {};
    if (restaurant.tenant_id) {
      const { data: tenantSettings } = await db
        .from("tenant_settings")
        .select("feature_flags")
        .eq("tenant_id", restaurant.tenant_id)
        .maybeSingle();

      if (tenantSettings?.feature_flags?.payment_settings) {
        paymentSettings = tenantSettings.feature_flags.payment_settings;
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        currency: restaurant.currency || "INR",
        logo_url: restaurant.logo_url || paymentSettings.logo_url || "",
        upi_id: paymentSettings.upi_id || "",
        upi_qr_url: paymentSettings.upi_qr_url || "",
        business_gstin: paymentSettings.business_gstin || "",
        receipt_header_note: paymentSettings.receipt_header_note || "",
        receipt_footer_note: paymentSettings.receipt_footer_note || "",
        tax_rate_percent: Number(paymentSettings.tax_rate_percent ?? 5),
        service_charge_percent: Number(paymentSettings.service_charge_percent ?? 0),
        payment_methods: paymentSettings.payment_methods || { cash: true, upi: true, card: true, split: true },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { restaurantId } = await resolveRestaurantContext(request, body);

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant context not found" }, { status: 404 });
    }

    // 1. Fetch restaurant to get tenant_id
    const { data: restaurant, error: restErr } = await db
      .from("restaurants")
      .select("id, tenant_id, name, address, currency, logo_url")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const {
      name,
      address,
      currency,
      logo_url,
      upi_id,
      upi_qr_url,
      business_gstin,
      receipt_header_note,
      receipt_footer_note,
      tax_rate_percent,
      service_charge_percent,
      payment_methods,
    } = body;

    // 2. Update basic restaurant info if provided
    const restUpdatePayload: Record<string, any> = {};
    if (name !== undefined) restUpdatePayload.name = name;
    if (address !== undefined) restUpdatePayload.address = address;
    if (currency !== undefined) restUpdatePayload.currency = currency;
    if (logo_url !== undefined) restUpdatePayload.logo_url = logo_url;

    if (Object.keys(restUpdatePayload).length > 0) {
      await db.from("restaurants").update(restUpdatePayload).eq("id", restaurantId);
    }

    // 3. Store custom payment & receipt settings inside tenant_settings.feature_flags
    if (restaurant.tenant_id) {
      const { data: existingTenantSettings } = await db
        .from("tenant_settings")
        .select("feature_flags")
        .eq("tenant_id", restaurant.tenant_id)
        .maybeSingle();

      const currentFlags = existingTenantSettings?.feature_flags || {};
      const currentPaymentSettings = currentFlags.payment_settings || {};

      const updatedPaymentSettings = {
        ...currentPaymentSettings,
        ...(upi_id !== undefined && { upi_id }),
        ...(upi_qr_url !== undefined && { upi_qr_url }),
        ...(business_gstin !== undefined && { business_gstin }),
        ...(receipt_header_note !== undefined && { receipt_header_note }),
        ...(receipt_footer_note !== undefined && { receipt_footer_note }),
        ...(tax_rate_percent !== undefined && { tax_rate_percent: Number(tax_rate_percent) }),
        ...(service_charge_percent !== undefined && { service_charge_percent: Number(service_charge_percent) }),
        ...(payment_methods !== undefined && { payment_methods }),
      };

      const newFeatureFlags = {
        ...currentFlags,
        payment_settings: updatedPaymentSettings,
      };

      const { error: upsertErr } = await db
        .from("tenant_settings")
        .upsert(
          {
            tenant_id: restaurant.tenant_id,
            feature_flags: newFeatureFlags,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" }
        );

      if (upsertErr) {
        console.warn("[Settings API] Warning saving tenant payment settings:", upsertErr.message);
      }
    }

    return NextResponse.json({ success: true, message: "Restaurant settings updated successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
