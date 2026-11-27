/**
 * Turns flight events into one email per check (several changes at once arrive together).
 * Delivery goes through notifyUser (src/lib/notify.ts), which handles unsubscribe links,
 * opt-outs and Telegram.
 */
import { notifyUser, type NotifyMessage } from '@/lib/notify';
import { getSiteUrl } from '@/utils/site-url';
import type { FlightEvent } from './diff';
import type { FlightSnapshot } from './types';

const PRIORITY: FlightEvent['kind'][] = [
    'cancelled', 'diverted', 'delay', 'gate', 'terminal', 'aircraft_swap', 'day_of_travel', 'checkin_reminder', 'departed', 'landed', 'belt',
];

export function buildFlightEmail(events: FlightEvent[], snapshot: FlightSnapshot, extra: string[] = []): NotifyMessage | null {
    if (events.length === 0) return null;
    const sorted = [...events].sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
    const lead = sorted[0];
    const paragraphs = sorted.map(e => (sorted.length > 1 ? `${e.title}. ${e.detail}` : e.detail));
    paragraphs.push(...extra);
    paragraphs.push('Times are local to each airport. Always confirm with your airline before acting on a change.');
    const url = `${getSiteUrl()}/en/flights?flight=${encodeURIComponent(snapshot.flightNumber)}`;
    return {
        subject: sorted.length > 1 ? `${lead.title} (+${sorted.length - 1} more update${sorted.length > 2 ? 's' : ''})` : lead.title,
        heading: lead.title,
        paragraphs,
        cta: { label: 'Open live flight', url },
        telegramText: `*${lead.title}*\n\n${sorted.map(e => e.detail).join('\n\n')}\n\n${url}`,
    };
}

export async function sendFlightEmail(userId: string, events: FlightEvent[], snapshot: FlightSnapshot, extra: string[] = []) {
    const msg = buildFlightEmail(events, snapshot, extra);
    if (!msg) return { email: false, telegram: false };
    return notifyUser(userId, msg);
}
