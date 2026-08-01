import { describe, it, expect } from 'vitest';

function validateReservationTime(timeIsoString: string, openingHour: number = 10, closingHour: number = 23) {
  const date = new Date(timeIsoString);
  const hour = date.getUTCHours();
  const isWithinHours = hour >= openingHour && hour <= closingHour;
  return { isValid: !isNaN(date.getTime()) && isWithinHours, hour };
}

describe('Sprint 5 Reservations & Waitlist Unit Tests', () => {
  it('validates reservation operating hours and time slot parsing', () => {
    const validTime = '2026-08-01T19:30:00.000Z'; // 7:30 PM UTC
    const res = validateReservationTime(validTime);
    expect(res.isValid).toBe(true);
    expect(res.hour).toBe(19);
  });

  it('generates SMS/WhatsApp notification payload format correctly', () => {
    const formatSmsHook = (name: string, guests: number, timeStr: string) => {
      return `Hi ${name}, your reservation at Trinetra Bistro for ${guests} guests at ${timeStr} is CONFIRMED!`;
    };

    const msg = formatSmsHook('Sarah Connor', 4, '7:00 PM');
    expect(msg).toContain('Sarah Connor');
    expect(msg).toContain('4 guests');
    expect(msg).toContain('7:00 PM');
  });
});
