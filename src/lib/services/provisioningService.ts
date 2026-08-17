/**
 * Trinetra Restaurant OS — Milestone 3 Phase 2: Provisioning Domain Service
 * Pure TypeScript Service layer enforcing provisioning logic, RPC execution,
 * and wizard state transitions. No direct database calls inside UI or Route Handlers.
 */

import { createClient } from '@supabase/supabase-js';
import {
  ProvisionRestaurantInput,
  ProvisionRestaurantResponse,
  ReadinessCheckResult,
  RestaurantProfile,
  WizardStepData,
} from '@/types/restaurant-os/provisioning';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class ProvisioningService {
  private static getAdminClient() {
    return createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Provision a new restaurant tenant or branch via RPC
   */
  static async provisionRestaurant(
    input: ProvisionRestaurantInput
  ): Promise<ProvisionRestaurantResponse> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase.rpc('provision_restaurant_rpc', {
      p_tenant_name: input.tenantName || null,
      p_restaurant_name: input.restaurantName,
      p_owner_email: input.ownerEmail,
      p_owner_name: input.ownerName,
      p_tenant_id: input.parentTenantId || null,
      p_restaurant_type: input.restaurantType || 'FineDining',
      p_cuisine_type: input.cuisineType || 'MultiCuisine',
    });

    if (error) {
      throw new Error(`Provisioning RPC error: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error(`Provisioning failed: ${data?.message || 'Unknown error'}`);
    }

    return {
      success: true,
      tenantId: data.tenant_id,
      organizationId: data.organization_id,
      restaurantId: data.restaurant_id,
      ownerStaffId: data.owner_staff_id,
      status: data.status,
      wizardStep: data.wizard_step,
    };
  }

  /**
   * Fetch complete restaurant profile metadata
   */
  static async getRestaurantProfile(restaurantId: string): Promise<RestaurantProfile | null> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase
      .from('restaurant_profiles')
      .select('*, restaurants(name)')
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      return null;
    }

    const restaurantName = Array.isArray(data.restaurants)
      ? (data.restaurants[0] as { name?: string })?.name ?? null
      : (data.restaurants as { name?: string } | null)?.name ?? null;

    return {
      restaurantId: data.restaurant_id,
      tenantId: data.tenant_id,
      restaurantName,
      status: data.status,
      wizardStep: data.wizard_step,
      wizardCompleted: data.wizard_completed,
      wizardCompletedAt: data.wizard_completed_at,
      wizardVersion: data.wizard_version,
      restaurantType: data.restaurant_type,
      cuisineType: data.cuisine_type,
      logoUrl: data.logo_url,
      brandTheme: data.brand_theme,
      gstin: data.gstin,
      fssaiLicense: data.fssai_license,
      phone: data.phone,
      email: data.email,
      timezone: data.timezone,
      orderPrefix: data.order_prefix,
      billPrefix: data.bill_prefix,
      openingTime: data.opening_time,
      closingTime: data.closing_time,
      fiscalStartMonth: data.fiscal_start_month,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Update wizard progress step and step-specific metadata
   */
  static async updateWizardStep(
    restaurantId: string,
    stepData: WizardStepData
  ): Promise<RestaurantProfile> {
    const supabase = this.getAdminClient();

    const updatePayload: Record<string, any> = {
      wizard_step: stepData.step,
      updated_at: new Date().toISOString(),
    };

    if (stepData.restaurantIdentity) {
      const { restaurantName, restaurantType, cuisineType, logoUrl, brandTheme } = stepData.restaurantIdentity;
      if (restaurantType) updatePayload.restaurant_type = restaurantType;
      if (cuisineType) updatePayload.cuisine_type = cuisineType;
      if (logoUrl !== undefined) updatePayload.logo_url = logoUrl;
      if (brandTheme) updatePayload.brand_theme = brandTheme;
      if (restaurantName) {
        // Also update canonical restaurant name
        await supabase.from('restaurants').update({ name: restaurantName }).eq('id', restaurantId);
      }
    }

    if (stepData.businessInfo) {
      const { gstin, fssaiLicense, phone, email, timezone } = stepData.businessInfo;
      if (gstin !== undefined) updatePayload.gstin = gstin;
      if (fssaiLicense !== undefined) updatePayload.fssai_license = fssaiLicense;
      if (phone !== undefined) updatePayload.phone = phone;
      if (email !== undefined) updatePayload.email = email;
      if (timezone) updatePayload.timezone = timezone;
    }

    if (stepData.operatingConfig) {
      const { openingTime, closingTime, orderPrefix, billPrefix, fiscalStartMonth } =
        stepData.operatingConfig;
      if (openingTime) updatePayload.opening_time = openingTime;
      if (closingTime) updatePayload.closing_time = closingTime;
      if (orderPrefix) updatePayload.order_prefix = orderPrefix;
      if (billPrefix) updatePayload.bill_prefix = billPrefix;
      if (fiscalStartMonth) updatePayload.fiscal_start_month = fiscalStartMonth;
    }

    // Step 5: Tax & Service Charge settings
    if (stepData.taxSettings) {
      await this.updateTaxSettings(restaurantId, stepData.taxSettings);
    }

    // Step 6: Owner PIN Setting
    if (stepData.ownerPin?.rawPin) {
      const ownerStaff = await supabase
        .from('restaurant_staff')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('role', 'owner')
        .single();

      if (ownerStaff.data?.id) {
        await supabase.rpc('set_staff_pin_rpc', {
          p_staff_id: ownerStaff.data.id,
          p_restaurant_id: restaurantId,
          p_raw_pin: stepData.ownerPin.rawPin,
        });
      }
    }

    // Step 7: Sample Data Seeding Opt-in
    if (stepData.sampleDataOptIn?.loadSampleData) {
      await this.seedDemoRestaurant();
    }

    // Step 8: Mark Wizard Completed & Restaurant Operational
    if (stepData.step === 8 && stepData.completion?.completed) {
      updatePayload.wizard_completed = true;
      updatePayload.wizard_completed_at = new Date().toISOString();
      updatePayload.status = 'Operational';

      // Log completion audit event
      const profile = await this.getRestaurantProfile(restaurantId);
      if (profile) {
        await supabase.from('provisioning_audit_events').insert({
          tenant_id: profile.tenantId,
          restaurant_id: restaurantId,
          event_name: 'restaurant.wizard_completed',
          payload: { wizard_version: 'v1.1', status: 'Operational' },
        });
      }
    }

    const { data, error } = await supabase
      .from('restaurant_profiles')
      .update(updatePayload)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update wizard step: ${error?.message || 'Update failed'}`);
    }

    return this.getRestaurantProfile(restaurantId) as Promise<RestaurantProfile>;
  }

  /**
   * Floor & Table management helpers
   */
  static async getFloorsAndTables(restaurantId: string) {
    const supabase = this.getAdminClient();
    const floorsRes = await supabase
      .from('restaurant_floors')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true });

    const tablesRes = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true });

    return {
      floors: floorsRes.data || [],
      tables: tablesRes.data || [],
    };
  }

  static async createFloor(restaurantId: string, name: string) {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from('restaurant_floors')
      .insert({ restaurant_id: restaurantId, name, sort_order: 1 })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteFloor(floorId: string) {
    const supabase = this.getAdminClient();
    const { error } = await supabase.from('restaurant_floors').delete().eq('id', floorId);
    if (error) throw new Error(error.message);
    return true;
  }

  static async createTable(restaurantId: string, floorId: string, tableNumber: string, capacity: number) {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({
        restaurant_id: restaurantId,
        floor_id: floorId,
        table_number: tableNumber,
        capacity,
        status: 'Available',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async updateTable(tableId: string, tableNumber: string, capacity: number) {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({ table_number: tableNumber, capacity })
      .eq('id', tableId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteTable(tableId: string) {
    const supabase = this.getAdminClient();
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', tableId);
    if (error) throw new Error(error.message);
    return true;
  }

  /**
   * Tax & Settings Management
   */
  static async getTaxSettings(restaurantId: string) {
    const supabase = this.getAdminClient();
    const { data } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    return {
      taxInclusive: data?.tax_inclusive ?? false,
      defaultGstRate: data?.default_gst_rate ?? 5,
      serviceChargePercentage: data?.service_charge_percentage ?? 0,
      serviceChargeTaxable: true,
    };
  }

  static async updateTaxSettings(
    restaurantId: string,
    settings: { taxInclusive?: boolean; defaultGstRate?: number; serviceChargePercentage?: number }
  ) {
    const supabase = this.getAdminClient();
    const payload: any = {
      restaurant_id: restaurantId,
      updated_at: new Date().toISOString(),
    };
    if (settings.taxInclusive !== undefined) payload.tax_inclusive = settings.taxInclusive;
    if (settings.defaultGstRate !== undefined) payload.default_gst_rate = settings.defaultGstRate;
    if (settings.serviceChargePercentage !== undefined)
      payload.service_charge_percentage = settings.serviceChargePercentage;

    const { data, error } = await supabase
      .from('restaurant_settings')
      .upsert(payload, { onConflict: 'restaurant_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Validate restaurant operational readiness via RPC
   */
  static async checkReadiness(restaurantId: string): Promise<ReadinessCheckResult> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase.rpc('validate_restaurant_readiness_rpc', {
      p_restaurant_id: restaurantId,
    });

    if (error) {
      throw new Error(`Readiness check failed: ${error.message}`);
    }

    return {
      isReady: data.is_ready,
      checks: {
        hasBranch: data.checks.has_branch,
        hasOwner: data.checks.has_owner,
        hasOwnerPin: data.checks.has_owner_pin,
        hasSettings: data.checks.has_settings,
        hasFloors: data.checks.has_floors,
        hasTables: data.checks.has_tables,
        hasTerminal: data.checks.has_terminal,
        wizardCompleted: data.checks.wizard_completed,
      },
    };
  }

  /**
   * Seed demo restaurant operationally via RPC
   */
  static async seedDemoRestaurant(): Promise<{ success: boolean; restaurantId: string }> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase.rpc('seed_demo_restaurant_rpc');

    if (error || !data?.success) {
      throw new Error(`Demo seeder RPC failed: ${error?.message || 'Unknown error'}`);
    }

    return {
      success: true,
      restaurantId: data.restaurant_id,
    };
  }
}

