/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/repositories/auth/supabase-auth.repository.ts
 * Description: Concrete Supabase implementation of IAuthRepository executing 
 *              Security Definer RPCs and database queries.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  IAuthRepository,
  PairTerminalRepositoryInput,
  VerifyStaffPinRepositoryInput,
  SetStaffPinRepositoryInput,
  LogAuthEventRepositoryInput,
  TerminalEntity,
  StaffEntity,
  AuthAuditLogEntity,
} from './auth.repository';

export class SupabaseAuthRepository implements IAuthRepository {
  private client: SupabaseClient;

  constructor(customClient?: SupabaseClient) {
    if (customClient) {
      this.client = customClient;
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
      this.client = createClient(supabaseUrl, supabaseKey);
    }
  }

  async pairTerminalDevice(input: PairTerminalRepositoryInput): Promise<{
    success: boolean;
    terminal_id: string;
    terminal_name: string;
    terminal_type: string;
  }> {
    const { data, error } = await this.client.rpc('pair_terminal_device_rpc', {
      p_tenant_id: input.tenant_id,
      p_restaurant_id: input.restaurant_id,
      p_terminal_name: input.terminal_name,
      p_terminal_type: input.terminal_type,
      p_device_token_hash: input.device_token_hash,
      p_device_fingerprint: input.device_fingerprint || null,
      p_owner_id: input.owner_id || null,
    });

    if (error) {
      throw new Error(`Failed to pair terminal device via RPC: ${error.message}`);
    }

    return data;
  }

  async verifyStaffPin(input: VerifyStaffPinRepositoryInput): Promise<{
    success: boolean;
    error_code?: string;
    message?: string;
    tenant_id?: string;
    restaurant_id?: string;
    terminal_id?: string;
    staff_id?: string;
    staff_name?: string;
    role?: string;
  }> {
    const { data, error } = await this.client.rpc('verify_staff_pin_rpc', {
      p_restaurant_id: input.restaurant_id,
      p_device_token_hash: input.device_token_hash,
      p_raw_pin: input.pin,
      p_ip_address: input.ip_address || null,
    });

    if (error) {
      throw new Error(`Failed to verify staff PIN via RPC: ${error.message}`);
    }

    return data;
  }

  async setStaffPin(input: SetStaffPinRepositoryInput): Promise<{
    success: boolean;
    message: string;
  }> {
    const { data, error } = await this.client.rpc('set_staff_pin_rpc', {
      p_staff_id: input.staff_id,
      p_restaurant_id: input.restaurant_id,
      p_raw_pin: input.pin_hash,
    });

    if (error) {
      throw new Error(`Failed to set staff PIN via RPC: ${error.message}`);
    }

    return data;
  }

  async revokeTerminalDevice(terminal_id: string, revoked_by?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const { data, error } = await this.client.rpc('revoke_terminal_device_rpc', {
      p_terminal_id: terminal_id,
      p_revoked_by: revoked_by || null,
    });

    if (error) {
      throw new Error(`Failed to revoke terminal device via RPC: ${error.message}`);
    }

    return data;
  }

  async getTerminalById(terminal_id: string): Promise<TerminalEntity | null> {
    const { data, error } = await this.client
      .from('restaurant_terminals')
      .select('*')
      .eq('id', terminal_id)
      .single();

    if (error || !data) return null;
    return data as TerminalEntity;
  }

  async getStaffById(staff_id: string, restaurant_id: string): Promise<StaffEntity | null> {
    const { data, error } = await this.client
      .from('restaurant_staff')
      .select('*')
      .eq('id', staff_id)
      .eq('restaurant_id', restaurant_id)
      .single();

    if (error || !data) return null;
    return data as StaffEntity;
  }

  async logAuthEvent(input: LogAuthEventRepositoryInput): Promise<void> {
    const { error } = await this.client.from('auth_audit_logs').insert({
      tenant_id: input.tenant_id,
      restaurant_id: input.restaurant_id,
      terminal_id: input.terminal_id || null,
      actor_id: input.actor_id || null,
      actor_role: input.actor_role || null,
      event_type: input.event_type,
      ip_address: input.ip_address || null,
      metadata: input.metadata || {},
    });

    if (error) {
      console.error('Failed to log auth audit event:', error.message);
    }
  }

  async getAuditLogs(
    tenant_id: string,
    restaurant_id: string,
    limit: number = 50
  ): Promise<AuthAuditLogEntity[]> {
    const { data, error } = await this.client
      .from('auth_audit_logs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('restaurant_id', restaurant_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as AuthAuditLogEntity[];
  }
}
