/**
 * Utility functions for safely triggering Meta Pixel tracking events.
 * This ensures that if fbq is not loaded or blocked, the site doesn't break with TS errors.
 */

// Declare the fbq function on the global window object to avoid TypeScript errors
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

/**
 * Track a PageView event
 */
export const trackPageView = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
};

/**
 * Track a Lead event (e.g., form submissions)
 */
export const trackLead = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead');
  }
};

/**
 * Track a Contact event (e.g., WhatsApp clicks, Call button clicks)
 */
export const trackContact = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Contact');
  }
};
