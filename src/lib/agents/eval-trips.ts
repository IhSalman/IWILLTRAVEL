/**
 * Fixed benchmark trips for regression evaluation.
 * Varied on purpose: big/small cities, transport modes, pace, and the thesis city (Kuopio).
 * Flights/hotels are off to keep runs cheap and focused on itinerary quality.
 */
import type { AgentInput } from '@/app/api/agent-itinerary/types';

export interface EvalTrip {
    key: string;
    input: Omit<AgentInput, 'startDate' | 'endDate'>;
}

export const EVAL_TRIPS: EvalTrip[] = [
    {
        key: 'lisbon-3d-walking',
        input: {
            destination: 'Lisbon, Portugal', days: 3, budget: 'moderate', travelStyle: 'balanced',
            travelerType: 'couple', interests: ['culture', 'food'], transport: 'walking',
            includeFlights: false, includeHotels: false, currency: 'EUR',
        },
    },
    {
        key: 'kyoto-4d-transit',
        input: {
            destination: 'Kyoto, Japan', days: 4, budget: 'moderate', travelStyle: 'cultural',
            travelerType: 'single', interests: ['temples', 'history', 'food'], transport: 'public',
            includeFlights: false, includeHotels: false, currency: 'EUR',
        },
    },
    {
        key: 'kuopio-3d-thesis',
        input: {
            destination: 'Kuopio, Finland', days: 3, budget: 'moderate', travelStyle: 'balanced',
            travelerType: 'couple', interests: ['nature', 'food'], transport: 'public',
            includeFlights: false, includeHotels: false, currency: 'EUR',
        },
    },
    {
        key: 'newyork-3d-packed',
        input: {
            destination: 'New York City, USA', days: 3, budget: 'luxury', travelStyle: 'adventure',
            travelerType: 'friends', interests: ['museums', 'nightlife'], transport: 'public',
            includeFlights: false, includeHotels: false, currency: 'USD',
        },
    },
    {
        key: 'marrakech-2d-relaxed',
        input: {
            destination: 'Marrakech, Morocco', days: 2, budget: 'budget', travelStyle: 'relaxed',
            travelerType: 'family', interests: ['markets', 'architecture'], transport: 'walking',
            includeFlights: false, includeHotels: false, currency: 'EUR',
        },
    },
];

/** Start dates 30 days out (Monday-aligned) so opening-hours checks use stable weekdays. */
export function evalStartDate(now = new Date()): string {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 30);
    const shift = (8 - d.getUTCDay()) % 7; // next Monday (0 if already Monday)
    d.setUTCDate(d.getUTCDate() + shift);
    return d.toISOString().slice(0, 10);
}
