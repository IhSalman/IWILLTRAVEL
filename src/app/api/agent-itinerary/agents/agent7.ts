/**
 * Agent 7: Sustainability Agent (ESG)
 * Pure code — calculates carbon footprint and sustainability score.
 */

import { calculateItineraryESG } from '@/lib/esg-calculator';
import type { AgentInput, ResearchResult, OptimizedRoute, SustainabilityResult } from '../types';
import type { TravelSegment } from '@/lib/esg-calculator';

export async function sustainabilityAgent(
    input: AgentInput,
    research: ResearchResult,
    optimizedRoute: OptimizedRoute,
): Promise<SustainabilityResult> {
    console.log('[Agent 7: Sustainability] Starting...');

    try {
        const segments: TravelSegment[] = [];
        const coords = research.locationCoords || { lat: 0, lng: 0 };

        // 1. Flights
        if (input.includeFlights && input.originCity && research.flights.length > 0) {
            // Find the best flight to base our distance on
            const flight = research.flights[0];
            let flightDistanceKm = 0;
            
            const mins = parseDurationMinutes(flight.duration);
            if (mins > 0) {
                // Avg commercial flight speed ~ 800 km/h
                flightDistanceKm = (mins / 60) * 800;
            } else {
                flightDistanceKm = estimateDistance(input.days);
            }

            segments.push({
                mode: flightDistanceKm > 4000 ? 'flight_long' : flightDistanceKm > 1500 ? 'flight_medium' : 'flight_short',
                origin_lat: coords.lat,
                origin_lon: coords.lng,
                dest_lat: coords.lat, // Ignored because we use distance_km
                dest_lon: coords.lng,
                distance_km: flightDistanceKm,
                passengers: 1, // Assuming 1 person for the base score; could be scaled by input.travelerType
            });
            
            // Add return flight
            segments.push({
                mode: flightDistanceKm > 4000 ? 'flight_long' : flightDistanceKm > 1500 ? 'flight_medium' : 'flight_short',
                origin_lat: coords.lat,
                origin_lon: coords.lng,
                dest_lat: coords.lat,
                dest_lon: coords.lng,
                distance_km: flightDistanceKm,
                passengers: 1,
            });
        }

        // 2. Inter-city transport (if applicable)
        const cities = optimizedRoute.optimizedRoute;
        if (cities.length > 1) {
            const mode = input.transport === 'public' ? 'train' : input.transport === 'rental' ? 'car_petrol' : 'bus';
            // Estimate 150km per city hop if coordinates aren't varying accurately
            for (let i = 0; i < cities.length - 1; i++) {
                segments.push({
                    mode,
                    origin_lat: coords.lat,
                    origin_lon: coords.lng,
                    dest_lat: coords.lat,
                    dest_lon: coords.lng,
                    distance_km: 150, 
                    passengers: 1,
                });
            }
        }

        // 3. Daily local transport
        const localMode = input.transport === 'public' ? 'metro' : input.transport === 'rental' ? 'car_petrol' : 'metro';
        // Estimate ~15 km of local travel per day
        for (let i = 0; i < input.days; i++) {
            segments.push({
                mode: localMode,
                origin_lat: coords.lat,
                origin_lon: coords.lng,
                dest_lat: coords.lat,
                dest_lon: coords.lng,
                distance_km: 15,
                passengers: 1,
            });
        }

        const report = calculateItineraryESG(segments);
        console.log(`[Agent 7: Sustainability] Grade: ${report.grade} | CO2: ${report.total_co2_kg}kg`);
        return { report };
    } catch (err: any) {
        console.error('[Agent 7: Sustainability] Error:', err.message);
        const fallback = calculateItineraryESG([{
            mode: 'train',
            origin_lat: 0, origin_lon: 0,
            dest_lat: 0, dest_lon: 0,
            distance_km: 100,
            passengers: 1,
        }]);
        return { report: fallback, error: err.message };
    }
}

function parseDurationMinutes(dur?: string): number {
    if (!dur) return 0;
    const isoMatch = dur.match(/PT(\d+)H(?:(\d+)M)?/);
    if (isoMatch) return parseInt(isoMatch[1]) * 60 + parseInt(isoMatch[2] || '0');
    const humanMatch = dur.match(/(\d+)h\s*(\d+)?m?/i);
    if (humanMatch) return parseInt(humanMatch[1]) * 60 + parseInt(humanMatch[2] || '0');
    return 0;
}

/** Rough distance estimate based on trip length for mode selection if duration is missing */
function estimateDistance(days: number): number {
    if (days <= 3) return 800;
    if (days <= 7) return 2500;
    if (days <= 14) return 5000;
    return 8000;
}
