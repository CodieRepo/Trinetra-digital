import { KBItem } from '../types/chat';
import { getKBItemById } from './index';

// Canonical service progression pathway:
// Website → SEO → Google Ads → CRM → WhatsApp Automation → AI Automation
export const SERVICE_PROGRESSION_PATHWAY = [
  'service-website',
  'service-seo',
  'service-google-ads',
  'service-crm',
  'service-whatsapp',
  'service-ai-automation',
  'service-ai-avatar'
];

export function getRecommendedNextSteps(currentItemId: string): KBItem[] {
  const current = getKBItemById(currentItemId);
  const recommendations: KBItem[] = [];

  if (!current) return recommendations;

  // 1. Next step from item definition
  if (current.next_step) {
    const nextItem = getKBItemById(current.next_step);
    if (nextItem) recommendations.push(nextItem);
  }

  // 2. Upsell / Cross-sell
  if (current.upsell) {
    const upsellItem = getKBItemById(current.upsell);
    if (upsellItem && !recommendations.some((r) => r.id === upsellItem.id)) {
      recommendations.push(upsellItem);
    }
  }

  if (current.cross_sell) {
    current.cross_sell.forEach((csId) => {
      const csItem = getKBItemById(csId);
      if (csItem && !recommendations.some((r) => r.id === csItem.id)) {
        recommendations.push(csItem);
      }
    });
  }

  // 3. Fallback to progression pathway
  const pathIndex = SERVICE_PROGRESSION_PATHWAY.indexOf(currentItemId);
  if (pathIndex !== -1 && pathIndex + 1 < SERVICE_PROGRESSION_PATHWAY.length) {
    const pathwayItem = getKBItemById(SERVICE_PROGRESSION_PATHWAY[pathIndex + 1]);
    if (pathwayItem && !recommendations.some((r) => r.id === pathwayItem.id)) {
      recommendations.push(pathwayItem);
    }
  }

  return recommendations;
}
