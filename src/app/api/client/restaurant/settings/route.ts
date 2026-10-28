import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  resolveRestaurantContext,
  requireStaffRole,
  RestaurantContextError,
} from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { restaurantId, isAuthenticated } = await resolveRestaurantContext(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }
    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant context not found" }, { status: 404 });
    }

    // 1. Fetch restaurant basic info
    const { data: restaurant, error: restErr } = await db
      .from("restaurants")
      .select("id, tenant_id, name, address, currency, tax_rate, tax_label")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: restErr?.message || "Restaurant not found" }, { status: 404 });
    }

    // 2. Fetch canonical restaurant_settings & restaurant_profiles concurrently
    const [settingsRes, profileRes] = await Promise.all([
      db
        .from("restaurant_settings")
        .select("cgst_pct, sgst_pct, service_charge_pct, is_tax_inclusive, auto_print_bill")
        .eq("restaurant_id", restaurantId)
        .maybeSingle(),
      db
        .from("restaurant_profiles")
        .select("gstin, fssai_license, phone, email, opening_time, closing_time, order_prefix, bill_prefix")
        .eq("restaurant_id", restaurantId)
        .maybeSingle(),
    ]);

    const dbSettings = settingsRes.data;
    const dbProfile = profileRes.data;

    // 3. Fetch custom settings from tenant_settings (using tenant_id)
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

    // Derive tax rate: check restaurant_settings first, then restaurants.tax_rate, fallback to 5
    const computedGst =
      dbSettings?.cgst_pct !== undefined && dbSettings?.sgst_pct !== undefined
        ? Number(dbSettings.cgst_pct) + Number(dbSettings.sgst_pct)
        : Number(restaurant.tax_rate ?? paymentSettings.tax_rate_percent ?? 5);

    const computedServiceCharge =
      dbSettings?.service_charge_pct !== undefined
        ? Number(dbSettings.service_charge_pct)
        : Number(paymentSettings.service_charge_percent ?? 0);

    return NextResponse.json({
      success: true,
      settings: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        currency: restaurant.currency || "INR",
        upi_id: paymentSettings.upi_id || "",
        upi_qr_url: paymentSettings.upi_qr_url || "",
        business_gstin: dbProfile?.gstin || paymentSettings.business_gstin || "",
        fssai_license: dbProfile?.fssai_license || "",
        phone: dbProfile?.phone || "",
        email: dbProfile?.email || "",
        opening_time: dbProfile?.opening_time || "10:00:00",
        closing_time: dbProfile?.closing_time || "23:00:00",
        order_prefix: dbProfile?.order_prefix || "ORD-",
        bill_prefix: dbProfile?.bill_prefix || "BILL-",
        receipt_header_note: paymentSettings.receipt_header_note || "",
        receipt_footer_note: paymentSettings.receipt_footer_note || "",
        tax_rate_percent: computedGst,
        cgst_pct: Number(dbSettings?.cgst_pct ?? (computedGst / 2)),
        sgst_pct: Number(dbSettings?.sgst_pct ?? (computedGst / 2)),
        service_charge_percent: computedServiceCharge,
        is_tax_inclusive: Boolean(dbSettings?.is_tax_inclusive ?? false),
        auto_print_bill: Boolean(dbSettings?.auto_print_bill ?? false),
        payment_methods: paymentSettings.payment_methods || { cash: true, upi: true, card: true, split: true },
      },
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();

    const {
      name,
      address,
      currency,
      upi_id,
      upi_qr_url,
      business_gstin,
      fssai_license,
      phone,
      email,
      receipt_header_note,
      receipt_footer_note,
      tax_rate_percent,
      service_charge_percent,
      is_tax_inclusive,
      auto_print_bill,
      payment_methods,
    } = body;

    // Check if body includes owner-only financial/tax fields
    const hasFinancialFields =
      upi_id !== undefined ||
      upi_qr_url !== undefined ||
      business_gstin !== undefined ||
      tax_rate_percent !== undefined ||
      service_charge_percent !== undefined ||
      is_tax_inclusive !== undefined ||
      payment_methods !== undefined;

    // Enforce role authorization:
    // Financial/tax settings require 'owner' role.
    // General profile/receipt settings require 'owner' or 'manager'.
    let caller;
    if (hasFinancialFields) {
      caller = await requireStaffRole(request, ["owner"], body);
    } else {
      caller = await requireStaffRole(request, ["owner", "manager"], body);
    }

    const restaurantId = caller.restaurantId;

    // 1. Fetch restaurant to get tenant_id
    const { data: restaurant, error: restErr } = await db
      .from("restaurants")
      .select("id, tenant_id, name, address, currency")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const tenantId = restaurant.tenant_id;

    // 2. Update basic restaurant info
    const restUpdatePayload: Record<string, any> = {};
    if (name !== undefined) restUpdatePayload.name = name;
    if (address !== undefined) restUpdatePayload.address = address;
    if (currency !== undefined) restUpdatePayload.currency = currency;
    if (tax_rate_percent !== undefined) restUpdatePayload.tax_rate = Number(tax_rate_percent);

    if (Object.keys(restUpdatePayload).length > 0) {
      await db.from("restaurants").update(restUpdatePayload).eq("id", restaurantId);
    }

    // 3. Update canonical restaurant_settings table (taxes and operational charges)
    if (tax_rate_percent !== undefined || service_charge_percent !== undefined || is_tax_inclusive !== undefined || auto_print_bill !== undefined) {
      const halfTax = tax_rate_percent !== undefined ? Number((Number(tax_rate_percent) / 2).toFixed(2)) : undefined;
      const settingsPayload: Record<string, any> = {
        restaurant_id: restaurantId,
        updated_at: new Date().toISOString(),
      };
      if (tenantId) settingsPayload.tenant_id = tenantId;
      if (halfTax !== undefined) {
        settingsPayload.cgst_pct = halfTax;
        settingsPayload.sgst_pct = halfTax;
      }
      if (service_charge_percent !== undefined) {
        settingsPayload.service_charge_pct = Number(service_charge_percent);
      }
      if (is_tax_inclusive !== undefined) {
        settingsPayload.is_tax_inclusive = Boolean(is_tax_inclusive);
      }
      if (auto_print_bill !== undefined) {
        settingsPayload.auto_print_bill = Boolean(auto_print_bill);
      }

      await db
        .from("restaurant_settings")
        .upsert(settingsPayload, { onConflict: "restaurant_id" });
    }

    // 4. Update restaurant_profiles (business compliance info)
    const profilePayload: Record<string, any> = {};
    if (business_gstin !== undefined) profilePayload.gstin = business_gstin;
    if (fssai_license !== undefined) profilePayload.fssai_license = fssai_license;
    if (phone !== undefined) profilePayload.phone = phone;
    if (email !== undefined) profilePayload.email = email;

    if (Object.keys(profilePayload).length > 0) {
      profilePayload.updated_at = new Date().toISOString();
      await db
        .from("restaurant_profiles")
        .update(profilePayload)
        .eq("restaurant_id", restaurantId);
    }

    // 5. Store custom payment & receipt settings inside tenant_settings.feature_flags
    if (tenantId) {
      const { data: existingTenantSettings } = await db
        .from("tenant_settings")
        .select("feature_flags")
        .eq("tenant_id", tenantId)
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

      await db
        .from("tenant_settings")
        .upsert(
          {
            tenant_id: tenantId,
            feature_flags: newFeatureFlags,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" }
        );
    }

    return NextResponse.json({ success: true, message: "Restaurant settings updated successfully" });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
