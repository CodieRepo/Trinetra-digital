export const normalizeRawPhone = (phone: string | null | undefined): string => {
  if (!phone) return "";
  let clean = phone.split('@')[0].trim();
  const isPlus = clean.startsWith('+');
  clean = clean.replace(/[^0-9]/g, '');
  if (!clean) return "";
  if (!isPlus) {
    if (clean.length === 10) {
      clean = '91' + clean;
    }
    clean = '+' + clean;
  } else {
    clean = '+' + clean;
  }
  return clean;
};

export const formatPhoneForDisplay = (phone: string | null | undefined): string => {
  const normalized = normalizeRawPhone(phone);
  return normalized || "Unknown WhatsApp Contact";
};

export const getDisplayName = (lead: { name?: string | null; phone?: string | null; company?: string | null } | null | undefined): string => {
  if (!lead) return "Unknown WhatsApp Contact";
  
  const name = lead.name?.trim();
  const isJidOrPhone = (str: string) => {
    return str.includes('@') || /^[+0-9\s-]+$/.test(str);
  };
  
  if (name && !isJidOrPhone(name)) {
    return name;
  }
  
  const phone = lead.phone?.trim();
  if (phone) {
    const formatted = formatPhoneForDisplay(phone);
    if (formatted !== "Unknown WhatsApp Contact") {
      return formatted;
    }
  }
  
  const company = lead.company?.trim();
  if (company) {
    return company;
  }
  
  return "Unknown WhatsApp Contact";
};
