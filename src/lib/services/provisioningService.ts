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
        const { error: nameError } = await supabase.from('restaurants').update({ name: restaurantName }).eq('id', restaurantId);
        if (nameError) {
          console.error('[ProvisioningService] Restaurant name update failed:', nameError.message);
          // Continue — partial failure should not block profile update
        }
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
      const profile = await this.getRestaurantProfile(restaurantId);
      if (!profile?.tenantId) {
        throw new Error('Unable to resolve tenant for sample menu seeding');
      }
      await this.seedSampleMenuData(restaurantId, profile.tenantId);
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

    // Update existing profile safely without requiring tenant_id in updatePayload
    const { data: updatedProfile, error: updateError } = await supabase
      .from('restaurant_profiles')
      .update(updatePayload)
      .eq('restaurant_id', restaurantId)
      .select()
      .maybeSingle();

    if (updateError) {
      throw new Error(`Failed to update wizard step: ${updateError.message}`);
    }

    if (!updatedProfile) {
      // Profile does not exist yet — fetch tenant_id from restaurants and upsert
      const { data: restData } = await supabase
        .from('restaurants')
        .select('tenant_id')
        .eq('id', restaurantId)
        .maybeSingle();

      const tenantId = restData?.tenant_id;
      if (tenantId) {
        const { error: insertError } = await supabase
          .from('restaurant_profiles')
          .upsert(
            { ...updatePayload, restaurant_id: restaurantId, tenant_id: tenantId },
            { onConflict: 'restaurant_id' }
          );

        if (insertError) {
          throw new Error(`Failed to create restaurant profile: ${insertError.message}`);
        }
      }
    }

    const freshProfile = await this.getRestaurantProfile(restaurantId);
    if (!freshProfile) {
      throw new Error('Failed to retrieve restaurant profile after update.');
    }
    return freshProfile;
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
   * Seed sample menu categories and items scoped strictly to active restaurant tenant
   */
  static async seedSampleMenuData(
    restaurantId: string,
    tenantId: string
  ): Promise<{ success: boolean; categoriesCount: number; itemsCount: number }> {
    const supabase = this.getAdminClient();

    const sampleCategories = [
      { name: 'Starters', display_order: 1 },
      { name: 'Main Course', display_order: 2 },
      { name: 'Breads & Rice', display_order: 3 },
      { name: 'Beverages & Desserts', display_order: 4 },
    ];

    const sampleItems = [
      // Starters
      { category: 'Starters', name: 'Paneer Tikka', description: 'Cottage cheese marinated in tandoori spices and grilled', price: 240, is_veg: true, display_order: 1 },
      { category: 'Starters', name: 'Chicken Tikka', description: 'Tender boneless chicken marinated in yogurt and aromatic spices', price: 290, is_veg: false, display_order: 2 },
      { category: 'Starters', name: 'Hara Bhara Kebab', description: 'Crispy patties of spinach, green peas, and potatoes', price: 210, is_veg: true, display_order: 3 },

      // Main Course
      { category: 'Main Course', name: 'Paneer Butter Masala', description: 'Cottage cheese cubes simmered in a rich tomato, butter, and cashew gravy', price: 320, is_veg: true, display_order: 1 },
      { category: 'Main Course', name: 'Butter Chicken', description: 'Tandoori chicken pieces cooked in a creamy buttery tomato sauce', price: 380, is_veg: false, display_order: 2 },
      { category: 'Main Course', name: 'Dal Makhani', description: 'Slow-cooked black lentils simmered with butter and cream overnight', price: 260, is_veg: true, display_order: 3 },

      // Breads & Rice
      { category: 'Breads & Rice', name: 'Butter Garlic Naan', description: 'Soft refined flour bread brushed with garlic butter and fresh coriander', price: 70, is_veg: true, display_order: 1 },
      { category: 'Breads & Rice', name: 'Tandoori Roti', description: 'Whole wheat flatbread baked crisp in the tandoor clay oven', price: 40, is_veg: true, display_order: 2 },
      { category: 'Breads & Rice', name: 'Hyderabadi Dum Biryani', description: 'Fragrant basmati rice layered with spiced marinated chicken and saffron', price: 340, is_veg: false, display_order: 3 },
      { category: 'Breads & Rice', name: 'Jeera Rice', description: 'Fluffy steamed basmati rice tempered with roasted cumin seeds and ghee', price: 180, is_veg: true, display_order: 4 },

      // Beverages & Desserts
      { category: 'Beverages & Desserts', name: 'Mango Lassi', description: 'Traditional chilled yogurt smoothie blended with Alphonso mango pulp', price: 120, is_veg: true, display_order: 1 },
      { category: 'Beverages & Desserts', name: 'Gulab Jamun (2 pcs)', description: 'Warm golden milk dumplings soaked in cardamom-infused rose syrup', price: 110, is_veg: true, display_order: 2 },
    ];

    // 1. Fetch existing categories for this restaurant to maintain idempotency
    const { data: existingCategories, error: catFetchErr } = await supabase
      .from('menu_categories')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('restaurant_id', restaurantId);

    if (catFetchErr) {
      throw new Error(`Failed to check existing categories: ${catFetchErr.message}`);
    }

    const categoryMap = new Map<string, string>();
    (existingCategories || []).forEach((c) => categoryMap.set(c.name, c.id));

    // 2. Insert missing sample categories
    for (const cat of sampleCategories) {
      if (!categoryMap.has(cat.name)) {
        const { data: insertedCat, error: insertCatErr } = await supabase
          .from('menu_categories')
          .insert({
            tenant_id: tenantId,
            restaurant_id: restaurantId,
            name: cat.name,
            display_order: cat.display_order,
            is_active: true,
          })
          .select('id, name')
          .single();

        if (insertCatErr || !insertedCat) {
          throw new Error(`Failed to insert category ${cat.name}: ${insertCatErr?.message}`);
        }
        categoryMap.set(insertedCat.name, insertedCat.id);
      }
    }

    // 3. Fetch existing items for this restaurant to maintain idempotency
    const { data: existingItems, error: itemFetchErr } = await supabase
      .from('menu_items')
      .select('id, name, category_id')
      .eq('tenant_id', tenantId)
      .eq('restaurant_id', restaurantId);

    if (itemFetchErr) {
      throw new Error(`Failed to check existing items: ${itemFetchErr.message}`);
    }

    const existingItemKeys = new Set(
      (existingItems || []).map((i) => `${i.category_id}:::${i.name}`)
    );

    // 4. Insert missing sample items
    for (const item of sampleItems) {
      const categoryId = categoryMap.get(item.category);
      if (!categoryId) continue;

      const itemKey = `${categoryId}:::${item.name}`;
      if (!existingItemKeys.has(itemKey)) {
        const { error: insertItemErr } = await supabase
          .from('menu_items')
          .insert({
            tenant_id: tenantId,
            restaurant_id: restaurantId,
            category_id: categoryId,
            name: item.name,
            description: item.description,
            price: item.price,
            is_veg: item.is_veg,
            is_available: true,
            display_order: item.display_order,
          });

        if (insertItemErr) {
          throw new Error(`Failed to insert menu item ${item.name}: ${insertItemErr.message}`);
        }
        existingItemKeys.add(itemKey);
      }
    }

    return {
      success: true,
      categoriesCount: categoryMap.size,
      itemsCount: existingItemKeys.size,
    };
  }

  /**
   * Seed demo restaurant operationally via RPC
   */
  static async seedDemoRestaurant(): Promise<{
    success: boolean;
    restaurantId: string;
    restaurant_id: string;
    tenantId: string;
    tenant_id: string;
    floorsCount?: number;
    tablesCount?: number;
    categoriesCount?: number;
    itemsCount?: number;
    staffCount?: number;
  }> {
    const supabase = this.getAdminClient();

    const { data, error } = await supabase.rpc('seed_demo_restaurant_rpc');

    if (error || !data?.success) {
      throw new Error(`Demo seeder RPC failed: ${error?.message || 'Unknown error'}`);
    }

    return {
      success: true,
      restaurantId: data.restaurant_id,
      restaurant_id: data.restaurant_id,
      tenantId: data.tenant_id,
      tenant_id: data.tenant_id,
      floorsCount: data.floors_count,
      tablesCount: data.tables_count,
      categoriesCount: data.categories_count,
      itemsCount: data.items_count,
      staffCount: data.staff_count,
    };
  }
}

