/**
 * date-parser.ts
 * Robust parser for relative and natural language dates/times in English and Hinglish.
 * 
 * Supports:
 * - today, aaj, tomorrow, kal, parso, day after tomorrow
 * - next monday, next tuesday, etc.
 * - 2 pm, 2 baje, kal 2 baje, 11 am, evening 6 baje, parso morning
 */

export function getKolkataDate(): Date {
  const now = new Date();
  const tzOffset = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + tzOffset);
}

export function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseNaturalDateTime(text: string, refDate: Date = getKolkataDate()): { date: string | null; time: string | null } {
  const normalized = text.toLowerCase().trim();
  let parsedDate: string | null = null;
  let parsedTime: string | null = null;

  // 1. Parse Date
  if (/\b(tomorrow|kal)\b/.test(normalized)) {
    const d = new Date(refDate);
    d.setDate(d.getDate() + 1);
    parsedDate = formatDate(d);
  } else if (/\b(parso|day after tomorrow)\b/.test(normalized)) {
    const d = new Date(refDate);
    d.setDate(d.getDate() + 2);
    parsedDate = formatDate(d);
  } else if (/\b(today|aaj)\b/.test(normalized)) {
    parsedDate = formatDate(refDate);
  } else if (/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(normalized)) {
    const match = normalized.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (match) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = dayNames.indexOf(match[1]);
      const currentDay = refDate.getDay();
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // next week
      const d = new Date(refDate);
      d.setDate(d.getDate() + daysToAdd);
      parsedDate = formatDate(d);
    }
  }

  // 2. Parse Time
  // Match "pm" or "evening" or "afternoon" to force 12-hour offset
  const pmMatch = normalized.match(/\b(\d{1,2})\s*(?:pm|baje\s+in\s+afternoon|baje\s+in\s+evening|evening\s+\d+\s*baje)\b/) ||
                  (normalized.includes('pm') && normalized.match(/\b(\d{1,2})\s*pm\b/)) ||
                  (normalized.includes('evening') && normalized.match(/\b(\d{1,2})\s*baje\b/)) ||
                  (normalized.includes('afternoon') && normalized.match(/\b(\d{1,2})\s*baje\b/));

  const amMatch = normalized.match(/\b(\d{1,2})\s*(?:am|baje\s+in\s+morning|morning\s+\d+\s*baje)\b/) ||
                  (normalized.includes('am') && normalized.match(/\b(\d{1,2})\s*am\b/)) ||
                  (normalized.includes('morning') && normalized.match(/\b(\d{1,2})\s*baje\b/));

  if (pmMatch) {
    let hour = parseInt(pmMatch[1], 10);
    if (hour < 12) hour += 12;
    parsedTime = `${String(hour).padStart(2, '0')}:00`;
  } else if (amMatch) {
    let hour = parseInt(amMatch[1], 10);
    if (hour === 12) hour = 0;
    parsedTime = `${String(hour).padStart(2, '0')}:00`;
  } else {
    // Check for general "baje" or raw digit followed by am/pm/baje
    const bajeMatch = normalized.match(/\b(\d{1,2})\s*(?:baje|pm|am)\b/) || normalized.match(/\b(\d{1,2})\s+baje\b/);
    if (bajeMatch) {
      let hour = parseInt(bajeMatch[1], 10);
      if (normalized.includes('pm')) {
        if (hour < 12) hour += 12;
      } else if (normalized.includes('am')) {
        if (hour === 12) hour = 0;
      } else {
        // Default heuristics: 1 to 7 is PM, 8 to 12 is AM
        if (hour >= 1 && hour <= 7) {
          hour += 12;
        }
      }
      parsedTime = `${String(hour).padStart(2, '0')}:00`;
    } else {
      // Direct general word checks
      if (normalized.includes('afternoon')) {
        parsedTime = '14:00';
      } else if (normalized.includes('morning')) {
        parsedTime = '10:00';
      } else if (normalized.includes('evening')) {
        parsedTime = '18:00';
      }
    }
  }

  return { date: parsedDate, time: parsedTime };
}
