/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/components/staff/types.ts
 * Description: Staff management component interfaces and form DTOs.
 */

import { StaffRole } from '../../types/auth';

export interface StaffMember {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  name: string;
  role: StaffRole;
  email?: string;
  phone?: string;
  is_active: boolean;
  has_pin: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface CreateStaffFormData {
  name: string;
  role: StaffRole;
  email?: string;
  phone?: string;
  initial_pin?: string;
}
