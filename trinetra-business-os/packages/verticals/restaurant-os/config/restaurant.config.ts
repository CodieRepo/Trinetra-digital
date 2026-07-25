export interface TaxConfig {
  gstRate: number;      // e.g. 0.05 for 5%
  serviceChargeRate: number; // e.g. 0.10 for 10%
}

export interface BrandingConfig {
  brandName: string;
  themeColor: string; // HSL or hex color
}

export interface QrConfig {
  baseUrl: string;
  qrDesign: {
    colorDark: string;
    colorLight: string;
  };
}

export interface BusinessHours {
  openTime: string;  // "09:00"
  closeTime: string; // "23:00"
}

export interface RestaurantConfig {
  currency: string;
  taxes: TaxConfig;
  branding: BrandingConfig;
  qr: QrConfig;
  businessHours: BusinessHours;
}

export const defaultRestaurantConfig: RestaurantConfig = {
  currency: "INR",
  taxes: {
    gstRate: 0.05,
    serviceChargeRate: 0.10,
  },
  branding: {
    brandName: "Restaurant OS",
    themeColor: "#fbbf24", // Amber-400
  },
  qr: {
    baseUrl: "https://r.trinetra-os.com",
    qrDesign: {
      colorDark: "#000000",
      colorLight: "#ffffff",
    },
  },
  businessHours: {
    openTime: "11:00",
    closeTime: "23:00",
  },
};
