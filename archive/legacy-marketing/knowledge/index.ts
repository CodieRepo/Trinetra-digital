import { KBItem } from '../types/chat';
import initialKBData from './trinetraKB.json';

const LOCAL_STORAGE_KB_KEY = 'trinetra_custom_kb_v1';

/**
 * Retrieves full Knowledge Base list (merges base trinetraKB.json with user-customized items in localStorage)
 */
export function getKnowledgeBase(): KBItem[] {
  if (typeof window === 'undefined') {
    return initialKBData as KBItem[];
  }
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KB_KEY);
    if (saved) {
      const customItems: KBItem[] = JSON.parse(saved);
      return customItems;
    }
  } catch (e) {
    console.error('Failed to parse custom KB from localStorage', e);
  }
  return initialKBData as KBItem[];
}

/**
 * Saves modified KB array to localStorage
 */
export function saveKnowledgeBase(items: KBItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KB_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save custom KB to localStorage', e);
  }
}

/**
 * Reset KB back to initial default
 */
export function resetKnowledgeBaseToDefault(): KBItem[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KB_KEY);
  }
  return initialKBData as KBItem[];
}

/**
 * Find KB item by ID
 */
export function getKBItemById(id: string): KBItem | undefined {
  const kb = getKnowledgeBase();
  return kb.find((item) => item.id === id);
}

/**
 * Get all KB categories
 */
export function getKBCategories(): string[] {
  const kb = getKnowledgeBase();
  const categories = new Set(kb.map((item) => item.category));
  return Array.from(categories);
}
