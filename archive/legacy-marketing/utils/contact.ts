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
  if (!normalized) return "Unknown WhatsApp Contact";
  
  // Format Indian numbers cleanly (e.g. +91 98765 43210)
  if (normalized.startsWith('+91') && normalized.length === 13) {
    return `+91 ${normalized.slice(3, 8)} ${normalized.slice(8)}`;
  }
  return normalized;
};

export const getDisplayName = (lead: { name?: string | null; phone?: string | null; company?: string | null } | null | undefined): string => {
  if (!lead) return "New Lead";
  
  const name = lead.name?.trim();
  const isPlaceholder = (str: string) => {
    const lower = str.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    return (
      lower === 'unknown contact' ||
      lower === 'unknown whatsapp contact' ||
      lower === 'unknown' ||
      lower === 'private lead' ||
      lower === 'whatsapp contact' ||
      lower === 'new lead' ||
      str.includes('@') ||
      /^[+0-9\s-]+$/.test(str)
    );
  };
  
  if (name && !isPlaceholder(name)) {
    return name;
  }
  
  const phone = lead.phone?.trim();
  if (phone) {
    const formatted = formatPhoneForDisplay(phone);
    if (formatted && formatted !== "Unknown WhatsApp Contact") {
      return `New Lead (${formatted})`;
    }
  }
  
  const company = lead.company?.trim();
  if (company) {
    return `New Lead @ ${company}`;
  }
  
  return "New Lead";
};

