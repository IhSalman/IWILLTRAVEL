/**
 * Entry point for flight status data. Returns null when no provider is configured,
 * so callers can switch paid features off cleanly.
 *
 * Calls are cached in api_cache and shared across users: ten travellers tracking BA123
 * on the same day cost one provider call per check window, not ten.
 */
import { cached } from '@/utils/cache';
import { AeroDataBoxProvider } from './aerodatabox';
import type { AirportBoard, FlightSnapshot, FlightStatusProvider } from './types';

let provider: FlightStatusProvider | null | undefined;

export function getFlightStatusProvider(): FlightStatusProvider | null {
    if (provider !== undefined) return provider;
    const key = process.env.AERODATABOX_API_KEY;
    provider = key ? new AeroDataBoxProvider(key, process.env.AERODATABOX_MARKET || 'api.market') : null;
    return provider;
}

export function flightStatusEnabled(): boolean {
    return !!getFlightStatusProvider();
}

/** Flight legs for a number and local date. `maxAgeMs` controls how fresh the shared copy must be. */
export async function fetchFlightStatus(flightNumber: string, dateLocal: string, maxAgeMs = 4 * 60_000): Promise<FlightSnapshot[]> {
    const p = getFlightStatusProvider();
    if (!p) return [];
    return cached(`fs:${p.name}:${flightNumber}:${dateLocal}`, maxAgeMs, () => p.getFlight(flightNumber, dateLocal));
}

/**
 * Departures/arrivals board around now (default: 2h back to 10h ahead). One shared cache row per
 * airport and window, refreshed when older than `maxAgeMs` (10 minutes by default).
 */
export async function fetchAirportBoard(iata: string, offsetMinutes = -120, durationMinutes = 720, maxAgeMs = 10 * 60_000): Promise<AirportBoard | null> {
    const p = getFlightStatusProvider();
    if (!p) return null;
    return cached(`board:${p.name}:${iata}:${offsetMinutes}:${durationMinutes}`, maxAgeMs, async () => {
        const b = await p.getAirportBoard(iata, offsetMinutes, durationMinutes);
        // cached() skips null, so an empty board is retried next time instead of being cached.
        return b.departures.length + b.arrivals.length > 0 ? b : null;
    });
}
