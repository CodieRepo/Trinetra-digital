import { tokenize } from './tokenizer';

export const SYNONYM_DICTIONARY: Record<string, string[]> = {
  website: ['site', 'webpage', 'web', 'portal', 'landing page', 'ecommerce', 'e-commerce', 'web design', 'web development'],
  pricing: ['price', 'cost', 'charge', 'rate', 'budget', 'packages', 'plans', 'fee', 'how much', 'expensive', 'cheap', 'discount'],
  seo: ['search engine optimization', 'google ranking', 'rank first', 'google rank', 'organic traffic', 'search traffic', 'keywords', 'backlinks'],
  appointment: ['booking', 'book', 'schedule', 'call', 'meeting', 'consultation', 'demo', 'slot', 'talk', 'discuss', 'strategy call'],
  whatsapp: ['wa', 'whatsapp api', 'bot', 'chat bot', 'auto reply', 'messaging', 'whatsapp automation'],
  crm: ['lead management', 'sales tracking', 'customer tracking', 'pipeline', 'lead tracker'],
  ads: ['google ads', 'meta ads', 'facebook ads', 'instagram ads', 'ppc', 'pay per click', 'social media ads', 'advertising', 'marketing'],
  ai: ['artificial intelligence', 'ai automation', 'ai bot', 'agent', 'automation', 'n8n', 'workflow'],
  contact: ['phone', 'email', 'number', 'address', 'location', 'reach', 'mobile', 'whatsapp number'],
  greeting: ['hi', 'hello', 'hey', 'greetings', 'namaste', 'good morning', 'good afternoon', 'good evening'],
  thanks: ['thank you', 'thanks', 'thx', 'appreciated', 'awesome', 'great', 'perfect'],
  company: ['trinetra', 'agency', 'team', 'who founded', 'about', 'firm', 'business']
};

/**
 * Expands a query with synonyms to broaden search scope
 */
export function expandQueryWithSynonyms(query: string): string[] {
  const tokens = tokenize(query);
  const expandedSet = new Set<string>(tokens);

  for (const token of tokens) {
    for (const [key, synonyms] of Object.entries(SYNONYM_DICTIONARY)) {
      if (key === token || synonyms.includes(token)) {
        expandedSet.add(key);
        synonyms.forEach((s) => expandedSet.add(s));
      }
    }
  }

  return Array.from(expandedSet);
}

/**
 * Gets canonical term for a synonym (e.g. 'site' -> 'website')
 */
export function getCanonicalTerm(word: string): string {
  const cleanWord = word.toLowerCase();
  for (const [canonical, synonyms] of Object.entries(SYNONYM_DICTIONARY)) {
    if (canonical === cleanWord || synonyms.includes(cleanWord)) {
      return canonical;
    }
  }
  return cleanWord;
}
