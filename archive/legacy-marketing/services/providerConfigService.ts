import { getSupabaseAdmin } from "../lib/supabase/admin";

export interface ProviderConfigData {
  provider_key: string;
  config_json: Record<string, any>;
  is_active: boolean;
}

export class ProviderConfigService {
  private db = getSupabaseAdmin();

  async getConfigs(tenant_id: string): Promise<ProviderConfigData[]> {
    const { data, error } = await this.db
      .from("provider_configs")
      .select("provider_key, config_json, is_active")
      .eq("tenant_id", tenant_id);

    if (error) throw error;
    return (data || []) as ProviderConfigData[];
  }

  async getConfig(tenant_id: string, provider_key: string): Promise<ProviderConfigData | null> {
    const { data } = await this.db
      .from("provider_configs")
      .select("provider_key, config_json, is_active")
      .eq("tenant_id", tenant_id)
      .eq("provider_key", provider_key)
      .maybeSingle();

    return data as ProviderConfigData | null;
  }

  async setConfig(tenant_id: string, provider_key: string, config_json: Record<string, any>, is_active: boolean = true): Promise<ProviderConfigData> {
    const { data, error } = await this.db
      .from("provider_configs")
      .upsert({
        tenant_id,
        provider_key,
        config_json,
        is_active,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id,provider_key" })
      .select("provider_key, config_json, is_active")
      .single();

    if (error) throw error;
    return data as ProviderConfigData;
  }
}

export const providerConfigService = new ProviderConfigService();
