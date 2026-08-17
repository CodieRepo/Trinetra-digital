/**
 * Trinetra Restaurant OS — Setup Wizard Zustand Store
 * State management store handling 8-step wizard progress, form state,
 * debounced autosave, readiness check diagnostics, and go-live status transitions.
 */

import { create } from 'zustand';
import {
  BrandTheme,
  ReadinessCheckResult,
  RestaurantProfile,
  RestaurantType,
} from '@/types/restaurant-os/provisioning';

export interface Step1Data {
  restaurantName: string;
  restaurantType: RestaurantType;
  cuisineType: string;
  logoUrl: string;
  brandTheme: BrandTheme;
}

export interface Step2Data {
  legalName: string;
  gstin: string;
  fssaiLicense: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
}

export interface Step3Data {
  openingTime: string;
  closingTime: string;
  orderPrefix: string;
  billPrefix: string;
  fiscalStartMonth: number;
}

export interface Step4Data {
  floors: { id: string; name: string; sortOrder: number }[];
  tables: { id: string; floorId: string | null; tableNumber: string; capacity: number }[];
}

export interface Step5Data {
  taxInclusive: boolean;
  defaultGstRate: number;
  serviceChargePercentage: number;
  serviceChargeTaxable: boolean;
}

export interface Step6Data {
  rawPin: string;
  confirmPin: string;
}

export interface Step7Data {
  loadSampleData: boolean;
}

export interface Step8Data {
  isCompleted: boolean;
}

export interface SetupWizardStore {
  restaurantId: string | null;
  currentStep: number;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage: string | null;
  isOffline: boolean;
  profile: RestaurantProfile | null;
  readiness: ReadinessCheckResult | null;

  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
  step5: Step5Data;
  step6: Step6Data;
  step7: Step7Data;
  step8: Step8Data;

  // Actions
  initWizard: (restaurantId: string) => Promise<void>;
  setStep: (step: number) => void;
  updateStep1: (data: Partial<Step1Data>) => void;
  updateStep2: (data: Partial<Step2Data>) => void;
  updateStep3: (data: Partial<Step3Data>) => void;
  updateStep4: (data: Partial<Step4Data>) => void;
  updateStep5: (data: Partial<Step5Data>) => void;
  updateStep6: (data: Partial<Step6Data>) => void;
  updateStep7: (data: Partial<Step7Data>) => void;
  triggerDebouncedSave: () => void;

  saveCurrentStep: (stepNumber?: number) => Promise<boolean>;
  runReadinessCheck: () => Promise<ReadinessCheckResult | null>;
  completeGoLive: () => Promise<boolean>;
  setOfflineStatus: (offline: boolean) => void;
}

let saveDebounceTimer: NodeJS.Timeout | null = null;

export const useSetupWizardStore = create<SetupWizardStore>((set, get) => ({
  restaurantId: null,
  currentStep: 1,
  isSaving: false,
  saveStatus: 'idle',
  errorMessage: null,
  isOffline: false,
  profile: null,
  readiness: null,

  step1: {
    restaurantName: 'My Restaurant',
    restaurantType: 'FineDining',
    cuisineType: 'MultiCuisine',
    logoUrl: '',
    brandTheme: 'amber',
  },
  step2: {
    legalName: '',
    gstin: '',
    fssaiLicense: '',
    address: '',
    phone: '',
    email: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  },
  step3: {
    openingTime: '10:00',
    closingTime: '23:00',
    orderPrefix: 'ORD-',
    billPrefix: 'INV-',
    fiscalStartMonth: 4,
  },
  step4: {
    floors: [],
    tables: [],
  },
  step5: {
    taxInclusive: false,
    defaultGstRate: 5,
    serviceChargePercentage: 0,
    serviceChargeTaxable: true,
  },
  step6: {
    rawPin: '',
    confirmPin: '',
  },
  step7: {
    loadSampleData: true,
  },
  step8: {
    isCompleted: false,
  },

  setOfflineStatus: (offline: boolean) => set({ isOffline: offline }),

  setStep: (step: number) => {
    if (step >= 1 && step <= 8) {
      set({ currentStep: step });
      get().saveCurrentStep(step);
    }
  },

  updateStep1: (data) => {
    set((state) => ({ step1: { ...state.step1, ...data } }));
    get().triggerDebouncedSave();
  },

  updateStep2: (data) => {
    set((state) => ({ step2: { ...state.step2, ...data } }));
    get().triggerDebouncedSave();
  },

  updateStep3: (data) => {
    set((state) => ({ step3: { ...state.step3, ...data } }));
    get().triggerDebouncedSave();
  },

  updateStep4: (data) => {
    set((state) => ({ step4: { ...state.step4, ...data } }));
    get().triggerDebouncedSave();
  },

  updateStep5: (data) => {
    set((state) => ({ step5: { ...state.step5, ...data } }));
    get().triggerDebouncedSave();
  },

  updateStep6: (data) => {
    set((state) => ({ step6: { ...state.step6, ...data } }));
  },

  updateStep7: (data) => {
    set((state) => ({ step7: { ...state.step7, ...data } }));
    get().triggerDebouncedSave();
  },

  triggerDebouncedSave: () => {
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    set({ saveStatus: 'saving' });
    saveDebounceTimer = setTimeout(() => {
      get().saveCurrentStep();
    }, 800);
  },

  initWizard: async (restaurantId: string) => {
    set({ restaurantId, saveStatus: 'idle', errorMessage: null });
    try {
      // Fetch wizard profile
      const res = await fetch(`/api/restaurant-os/provisioning/wizard?restaurantId=${restaurantId}`);
      const json = await res.json();

      if (json.success && json.data) {
        const p: RestaurantProfile = json.data;
        set({
          profile: p,
          currentStep: p.wizardStep || 1,
          step1: {
            restaurantName: p.restaurantName || 'My Restaurant',
            restaurantType: p.restaurantType || 'FineDining',
            cuisineType: p.cuisineType || 'MultiCuisine',
            logoUrl: p.logoUrl || '',
            brandTheme: p.brandTheme || 'amber',
          },
          step2: {
            legalName: p.email || '',
            gstin: p.gstin || '',
            fssaiLicense: p.fssaiLicense || '',
            address: '',
            phone: p.phone || '',
            email: p.email || '',
            timezone: p.timezone || 'Asia/Kolkata',
            currency: 'INR',
          },
          step3: {
            openingTime: p.openingTime || '10:00',
            closingTime: p.closingTime || '23:00',
            orderPrefix: p.orderPrefix || 'ORD-',
            billPrefix: p.billPrefix || 'INV-',
            fiscalStartMonth: p.fiscalStartMonth || 4,
          },
        });
      }

      // Fetch floor/table layout
      const fRes = await fetch(`/api/restaurant-os/provisioning/floors?restaurantId=${restaurantId}`);
      const fJson = await fRes.json();
      if (fJson.success && fJson.data) {
        set({
          step4: {
            floors: fJson.data.floors || [],
            tables: fJson.data.tables || [],
          },
        });
      }

      // Run initial readiness check
      get().runReadinessCheck();
    } catch (err: any) {
      set({ errorMessage: err.message });
    }
  },

  saveCurrentStep: async (overrideStep?: number) => {
    const state = get();
    if (!state.restaurantId) return false;

    const step = overrideStep || state.currentStep;
    set({ isSaving: true, saveStatus: 'saving' });

    try {
      const stepPayload: any = { step };

      if (step === 1) {
        stepPayload.restaurantIdentity = {
          restaurantName: state.step1.restaurantName,
          restaurantType: state.step1.restaurantType,
          cuisineType: state.step1.cuisineType,
          logoUrl: state.step1.logoUrl,
          brandTheme: state.step1.brandTheme,
        };
      } else if (step === 2) {
        stepPayload.businessInfo = {
          gstin: state.step2.gstin,
          fssaiLicense: state.step2.fssaiLicense,
          address: state.step2.address,
          phone: state.step2.phone,
          email: state.step2.email,
          timezone: state.step2.timezone,
        };
      } else if (step === 3) {
        stepPayload.operatingConfig = {
          openingTime: state.step3.openingTime,
          closingTime: state.step3.closingTime,
          orderPrefix: state.step3.orderPrefix,
          billPrefix: state.step3.billPrefix,
          fiscalStartMonth: state.step3.fiscalStartMonth,
        };
      } else if (step === 5) {
        stepPayload.taxSettings = {
          taxInclusive: state.step5.taxInclusive,
          defaultGstRate: state.step5.defaultGstRate,
          serviceChargePercentage: state.step5.serviceChargePercentage,
          serviceChargeTaxable: state.step5.serviceChargeTaxable,
        };
      } else if (step === 6 && state.step6.rawPin && state.step6.rawPin === state.step6.confirmPin) {
        stepPayload.ownerPin = {
          rawPin: state.step6.rawPin,
        };
      } else if (step === 7) {
        stepPayload.sampleDataOptIn = {
          loadSampleData: state.step7.loadSampleData,
        };
      }

      const res = await fetch('/api/restaurant-os/provisioning/wizard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: state.restaurantId,
          stepData: stepPayload,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to save step');
      }

      set({
        profile: json.data,
        isSaving: false,
        saveStatus: 'saved',
        errorMessage: null,
      });

      // Update readiness status asynchronously
      get().runReadinessCheck();
      return true;
    } catch (err: any) {
      set({
        isSaving: false,
        saveStatus: 'error',
        errorMessage: err.message,
      });
      return false;
    }
  },

  runReadinessCheck: async () => {
    const { restaurantId } = get();
    if (!restaurantId) return null;

    try {
      const res = await fetch(`/api/restaurant-os/provisioning/readiness?restaurantId=${restaurantId}`);
      const json = await res.json();
      if (json.success && json.data) {
        set({ readiness: json.data });
        return json.data;
      }
      return null;
    } catch (err) {
      return null;
    }
  },

  completeGoLive: async () => {
    const { restaurantId } = get();
    if (!restaurantId) return false;

    set({ isSaving: true, saveStatus: 'saving' });

    try {
      const res = await fetch('/api/restaurant-os/provisioning/wizard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          stepData: {
            step: 8,
            completion: { status: 'Operational', completed: true },
          },
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to transition restaurant to Operational');
      }

      set({
        profile: json.data,
        step8: { isCompleted: true },
        isSaving: false,
        saveStatus: 'saved',
      });

      return true;
    } catch (err: any) {
      set({
        isSaving: false,
        saveStatus: 'error',
        errorMessage: err.message,
      });
      return false;
    }
  },
}));
