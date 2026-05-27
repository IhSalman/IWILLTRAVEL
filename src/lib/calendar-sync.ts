/**
 * Calendar Sync Configuration & Utility
 * ─────────────────────────────────────────────────────────────
 * Part of the IWILLTRAVEL 2026 External Ingestion Phase.
 *
 * Capabilities:
 *   1. Define OIDC scopes for Google/Outlook integrations.
 *   2. Token management for persistent calendar scanning.
 *   3. ICS (iCalendar) file parsing logic.
 */

// ── OAuth 2.0 Scopes ─────────────────────────────────────────

export const CALENDAR_OAUTH_CONFIG = {
  google: {
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    response_type: 'code',
    access_type: 'offline', // Required for background scanning
    prompt: 'consent'
  },
  outlook: {
    scopes: ['Calendars.Read'],
    response_type: 'code',
    access_type: 'offline'
  }
} as const;

// ── Helper: Keyword Matching ─────────────────────────────────

export const SYNC_KEYWORDS = [
  'flight', 'airline', 'booking', 'reservation', 'confirmation',
  'check-in', 'departure', 'arrival', 'itinerary', 'gate'
];

/**
 * matchesSyncKeywords: Checks if a calendar event is likely 
 * a travel-related booking.
 */
export function matchesSyncKeywords(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SYNC_KEYWORDS.some(kw => lower.includes(kw));
}

// ── ICS Parser (Abstract implementation for server context) ───

export interface ICalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
}

/**
 * parseIcsFile: Basic string parsing for .ics content.
 * Real implementation would typically use 'ical.js' or similar.
 */
export function parseIcsContent(content: string): ICalendarEvent[] {
  const events: ICalendarEvent[] = [];
  const eventSections = content.split('BEGIN:VEVENT');

  for (const section of eventSections.slice(1)) {
    const summaryMatch = section.match(/SUMMARY:(.*)/);
    const startMatch = section.match(/DTSTART[:;](.*)/);
    const endMatch = section.match(/DTEND[:;](.*)/);
    const locationMatch = section.match(/LOCATION:(.*)/);
    const descriptionMatch = section.match(/DESCRIPTION:(.*)/);

    if (summaryMatch && startMatch) {
      events.push({
        summary: summaryMatch[1].trim(),
        start: new Date(startMatch[1].trim()),
        end: endMatch ? new Date(endMatch[1].trim()) : new Date(),
        location: locationMatch ? locationMatch[1].trim() : undefined,
        description: descriptionMatch ? descriptionMatch[1].trim() : undefined
      });
    }
  }

  return events;
}

// ── Extraction Logic ─────────────────────────────────────────

/**
 * extractFlightCode: Uses a regex to find flight numbers
 * like "TK123", "AA 4567", etc. from text content.
 */
export function extractFlightCode(text: string): string | null {
  // Regex: 2 letters (Airline IATA) + optional space + 1-4 numbers
  const flightRegex = /[A-Z]{2}\s?\d{1,4}/i;
  const match = text.match(flightRegex);
  return match ? match[0].toUpperCase().replace(/\s/g, '') : null;
}
