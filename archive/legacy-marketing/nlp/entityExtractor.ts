import { UserContextMemory } from '../../types/chat';

/**
 * Extracts entities (Name, Phone, Email, Business, City, Budget, Service) from natural text input
 */
export function extractEntitiesFromMessage(text: string): Partial<UserContextMemory> {
  const extracted: Partial<UserContextMemory> = {};
  if (!text) return extracted;

  const lower = text.toLowerCase();

  // 1. Phone number extraction (Indian 10-digit formats with optional +91/0)
  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);
  if (phoneMatch) {
    extracted.phone = phoneMatch[0].replace(/\s+|-/g, '');
  }

  // 2. Email extraction
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    extracted.email = emailMatch[0].toLowerCase();
  }

  // 3. Name extraction ("My name is Rahul", "I am Priya", "Call me Vikram", "Name: Amit")
  const namePatterns = [
    /(?:my name is|i am|i'm|call me|name is|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]{2,15})$/ // Single word starting with capital if short message
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const forbidden = ['hello', 'hi', 'hey', 'trinetra', 'website', 'service', 'price', 'cost'];
      if (!forbidden.includes(candidate.toLowerCase())) {
        extracted.name = candidate;
        break;
      }
    }
  }

  // 4. City extraction
  const cityPatterns = [
    /(?:in|from|at|located in|based in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  const knownCities = ['gorakhpur', 'lucknow', 'delhi', 'mumbai', 'varanasi', 'kanpur', 'noida', 'bangalore', 'pune', 'hyderabad', 'chennai', 'kolkata'];

  for (const city of knownCities) {
    if (lower.includes(city)) {
      extracted.city = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }
  if (!extracted.city) {
    for (const pattern of cityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        const nonCities = ['website', 'seo', 'growth', 'india', 'business', 'today', 'tomorrow'];
        if (!nonCities.includes(candidate.toLowerCase())) {
          extracted.city = candidate;
          break;
        }
      }
    }
  }

  // 5. Budget extraction (e.g. "15k", "25,000", "50000", "under 20k", "budget is 30000")
  const budgetMatch = text.match(/(?:budget|price|cost)?\s*(?:is|around|under)?\s*(?:₹|rs\.?|inr)?\s*(\d+[\d,]*\s*(?:k|thousand|lakh)?)/i);
  if (budgetMatch && budgetMatch[1]) {
    extracted.budget = budgetMatch[1].trim();
  }

  // 6. Business Type extraction
  const businessKeywords: Record<string, string> = {
    clinic: 'Healthcare / Clinic',
    hospital: 'Healthcare',
    doctor: 'Healthcare',
    coaching: 'Education / Coaching',
    school: 'Education',
    college: 'Education',
    'real estate': 'Real Estate',
    builder: 'Real Estate',
    property: 'Real Estate',
    restaurant: 'Food & Restaurant',
    hotel: 'Hospitality & Hotel',
    solar: 'Solar & Renewable Energy',
    ecommerce: 'E-Commerce Retail',
    shop: 'Retail Store',
    salon: 'Beauty & Wellness',
    gym: 'Fitness & Gym'
  };

  for (const [key, category] of Object.entries(businessKeywords)) {
    if (lower.includes(key)) {
      extracted.businessType = category;
      break;
    }
  }

  // 7. Preferred Service extraction
  if (lower.includes('website') || lower.includes('site') || lower.includes('web design')) {
    extracted.preferredService = 'Website Development';
  } else if (lower.includes('seo') || lower.includes('google rank') || lower.includes('ranking')) {
    extracted.preferredService = 'Search Engine Optimization (SEO)';
  } else if (lower.includes('ads') || lower.includes('google ad') || lower.includes('facebook ad') || lower.includes('meta ad')) {
    extracted.preferredService = 'Paid Ads Marketing';
  } else if (lower.includes('whatsapp') || lower.includes('bot')) {
    extracted.preferredService = 'WhatsApp Automation';
  } else if (lower.includes('crm') || lower.includes('lead management')) {
    extracted.preferredService = 'Custom CRM System';
  } else if (lower.includes('ai') || lower.includes('automation')) {
    extracted.preferredService = 'AI Business Automation';
  }

  return extracted;
}
