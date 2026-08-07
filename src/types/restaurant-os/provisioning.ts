/**
 * Trinetra Restaurant OS — Milestone 3 Phase 2: Provisioning DTO & Service Contracts
 * Standardized TypeScript contracts for Provisioning, Setup Wizard, and Branch Management.
 */

export type RestaurantStatus =
  | 'Provisioning'
  | 'Setup Pending'
  | 'Ready'
  | 'Operational'
  | 'Maintenance'
  | 'Suspended'
  | 'Archived';

export type RestaurantType =
  | 'FineDining'
  | 'CasualDining'
  | 'Cafe'
  | 'QSR'
  | 'CloudKitchen'
  | 'PubBar'
  | 'Bakery';

export type BrandTheme = 'amber' | 'emerald' | 'cobalt' | 'crimson';

export interface FloorDTO {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  tables?: TableDTO[];
}

export interface TableDTO {
  id: string;
  restaurantId: string;
  floorId: string | null;
  tableNumber: string;
  capacity: number;
  status?: string;
}

export interface TaxSettingsDTO {
  taxInclusive: boolean;
  defaultGstRate: number;
  serviceChargePercentage: number;
  serviceChargeTaxable: boolean;
}

export interface ProvisionRestaurantInput {
  tenantName?: string;
  restaurantName: string;
  ownerEmail: string;
  ownerName: string;
  parentTenantId?: string; // Optional for multi-branch provisioning
  restaurantType?: RestaurantType;
  cuisineType?: string;
}

export interface ProvisionRestaurantResponse {
  success: boolean;
  tenantId: string;
  organizationId: string;
  restaurantId: string;
  ownerStaffId: string;
  status: RestaurantStatus;
  wizardStep: number;
}

export interface RestaurantProfile {
  restaurantId: string;
  tenantId: string;
  status: RestaurantStatus;
  wizardStep: number;
  wizardCompleted: boolean;
  wizardCompletedAt: string | null;
  wizardVersion: string;
  restaurantType: RestaurantType;
  cuisineType: string | null;
  logoUrl: string | null;
  brandTheme: BrandTheme;
  gstin: string | null;
  fssaiLicense: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  orderPrefix: string;
  billPrefix: string;
  openingTime: string;
  closingTime: string;
  fiscalStartMonth: number;
  createdAt: string;
  updatedAt: string;
}

export interface WizardStepData {
  step: number;
  restaurantIdentity?: {
    restaurantName?: string;
    restaurantType?: RestaurantType;
    cuisineType?: string;
    logoUrl?: string;
    brandTheme?: BrandTheme;
  };
  businessInfo?: {
    legalName?: string;
    gstin?: string;
    fssaiLicense?: string;
    address?: string;
    phone?: string;
    email?: string;
    timezone?: string;
    currency?: string;
  };
  operatingConfig?: {
    openingTime?: string;
    closingTime?: string;
    orderPrefix?: string;
    billPrefix?: string;
    fiscalStartMonth?: number;
  };
  floorLayout?: {
    floors?: { id?: string; name: string; sortOrder?: number }[];
    tables?: { id?: string; floorId?: string; tableNumber: string; capacity: number }[];
  };
  taxSettings?: TaxSettingsDTO;
  ownerPin?: {
    rawPin: string;
  };
  sampleDataOptIn?: {
    loadSampleData: boolean;
  };
  completion?: {
    status: RestaurantStatus;
    completed: boolean;
  };
}

export interface ReadinessCheckResult {
  isReady: boolean;
  checks: {
    hasBranch: boolean;
    hasOwner: boolean;
    hasOwnerPin: boolean;
    hasSettings: boolean;
    hasFloors: boolean;
    hasTables: boolean;
    hasTerminal: boolean;
    wizardCompleted: boolean;
  };
}

