import { getDatabaseClient } from "../../core/database";
import { eventBus, createEventEnvelope } from "../../core/event-bus";
import { logger } from "../../core/logging";
import { DEFAULT_TENANT_ID, TenantContext } from "../../core/auth";

export interface RestaurantRecord {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerSessionSyncParams {
  tenantId: string;
  restaurantId: string;
  sessionId: string;
  customerName: string;
  customerPhone: string;
}

/**
 * Resolves or creates a restaurant profile for the active Organization (tenant).
 */
export async function getOrCreateRestaurantForTenant(
  tenantId: string = DEFAULT_TENANT_ID,
  restaurantName: string = "Trinetra Restaurant"
): Promise<RestaurantRecord> {
  const db = getDatabaseClient();

  const { data: existing, error: selectErr } = await db
    .from("restaurants")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (selectErr) {
    logger.error("[RestaurantService] Database select error:", selectErr.message);
    throw new Error(`Failed to fetch restaurant for tenant: ${selectErr.message}`);
  }

  if (existing) {
    return existing as RestaurantRecord;
  }

  const { data: inserted, error: insertErr } = await db
    .from("restaurants")
    .insert({
      tenant_id: tenantId,
      name: restaurantName,
      currency: "INR",
      is_active: true,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    logger.error("[RestaurantService] Database insert error:", insertErr?.message);
    throw new Error(`Failed to provision restaurant for tenant: ${insertErr?.message}`);
  }

  logger.info(`[RestaurantService] Provisioned new restaurant profile for Tenant: ${tenantId}`);
  return inserted as RestaurantRecord;
}

/**
 * CRM Integration: Syncs a restaurant customer session with Trinetra CRM leads.
 * Automatically upserts a contact in `leads` table and links `lead_id` to the table session.
 */
export async function syncSessionCustomerToCrmLead(
  params: CustomerSessionSyncParams
): Promise<string | null> {
  const { tenantId, restaurantId, sessionId, customerName, customerPhone } = params;

  if (!customerPhone) return null;

  const db = getDatabaseClient();
  const cleanPhone = customerPhone.replace(/\D/g, "");

  try {
    // 1. Search existing CRM lead for this tenant
    const { data: existingLead } = await db
      .from("leads")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone", cleanPhone)
      .maybeSingle();

    let leadId: string;

    if (existingLead) {
      leadId = existingLead.id;
      await db
        .from("leads")
        .update({
          name: customerName || "Restaurant Customer",
          is_customer: true,
          service_interest: "Restaurant OS",
          last_message: `Dined at table session on ${new Date().toLocaleDateString()}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } else {
      const { data: newLead, error: leadErr } = await db
        .from("leads")
        .insert({
          tenant_id: tenantId,
          name: customerName || "Restaurant Customer",
          phone: cleanPhone,
          is_customer: true,
          source: "Restaurant OS",
          status: "new",
          score: 80,
          service_interest: "Restaurant OS",
          ai_summary: "Customer acquired via Restaurant OS QR Menu",
        })
        .select("id")
        .single();

      if (leadErr || !newLead) {
        logger.error("[RestaurantService] Lead creation error:", leadErr?.message);
        return null;
      }
      leadId = newLead.id;
    }

    // 2. Link lead_id back to restaurant table session
    await db
      .from("restaurant_table_sessions")
      .update({ lead_id: leadId })
      .eq("id", sessionId)
      .eq("tenant_id", tenantId);

    // 3. Emit CustomerRegistered event to Trinetra EventBus
    await eventBus.publish(
      createEventEnvelope(tenantId, "restaurant-os", "CustomerRegistered", {
        sessionId,
        restaurantId,
        leadId,
        customerName,
        customerPhone: cleanPhone,
      })
    );

    logger.info(`[RestaurantService] Linked Customer ${cleanPhone} to CRM Lead ${leadId}`);
    return leadId;
  } catch (err) {
    logger.error("[RestaurantService] Exception in CRM lead sync:", err);
    return null;
  }
}

/**
 * Trinetra Event Bus Dispatchers for Restaurant OS Actions
 */
export async function notifyOrderPlaced(tenantId: string, orderId: string, totalAmount: number): Promise<void> {
  await eventBus.publish(
    createEventEnvelope(tenantId, "restaurant-os", "OrderPlaced", {
      orderId,
      totalAmount,
      timestamp: new Date().toISOString(),
    })
  );
}

export async function notifyOrderReady(tenantId: string, orderId: string, tableNumber: string): Promise<void> {
  await eventBus.publish(
    createEventEnvelope(tenantId, "restaurant-os", "OrderReady", {
      orderId,
      tableNumber,
      timestamp: new Date().toISOString(),
    })
  );
}

export async function notifyPaymentCompleted(tenantId: string, sessionId: string, amount: number): Promise<void> {
  await eventBus.publish(
    createEventEnvelope(tenantId, "restaurant-os", "PaymentCompleted", {
      sessionId,
      amount,
      timestamp: new Date().toISOString(),
    })
  );
}
