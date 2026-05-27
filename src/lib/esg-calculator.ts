/**
 * ESG Carbon Footprint Calculator
 * ─────────────────────────────────────────────────────────────
 * Pillar IV — IWILLTRAVEL ESG Consultant
 *
 * Calculates CO2 emissions for travel segments using the
 * Haversine formula + ICAO/Our World in Data emission factors.
 *
 * No external API needed — this is a pure utility module.
 * Emission factors sourced from:
 *   - ICAO Carbon Emissions Calculator methodology
 *   - Our World in Data (2023 transport emissions data)
 */

// ── Emission Factors (kg CO2 per passenger per km) ──────────

export const EMISSION_FACTORS = {
  flight_short:   0.255,  // < 1500 km  (incl. radiative forcing)
  flight_medium:  0.195,  // 1500–4000 km
  flight_long:    0.147,  // > 4000 km (long-haul efficiency)
  high_speed_rail: 0.006, // TGV, Eurostar, Shinkansen
  train:           0.041, // Regional rail
  bus:             0.089, // Coach intercity
  electric_bus:    0.035,
  car_petrol:      0.171, // Per passenger (avg occupancy 1.5)
  car_electric:    0.053,
  ferry:           0.113,
  metro:           0.033,
  taxi:            0.149,
} as const;

export type TransportMode = keyof typeof EMISSION_FACTORS;

// ── Haversine Distance Formula ───────────────────────────────

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Segment Analysis ─────────────────────────────────────────

export interface TravelSegment {
  mode: TransportMode;
  origin_lat: number;
  origin_lon: number;
  dest_lat: number;
  dest_lon: number;
  passengers?: number;  // Defaults to 1
  distance_km?: number; // Optional override
}

export interface SegmentResult {
  mode: TransportMode;
  distance_km: number;
  co2_kg: number;
  co2_per_passenger_kg: number;
  passengers: number;
}

export function calculateSegmentEmissions(segment: TravelSegment): SegmentResult {
  const passengers = segment.passengers ?? 1;
  const distance_km = segment.distance_km ?? haversineKm(
    segment.origin_lat, segment.origin_lon,
    segment.dest_lat, segment.dest_lon
  );

  // For flights, pick the right factor based on distance
  let factor: number;
  if (segment.mode === 'flight_short' || segment.mode === 'flight_medium' || segment.mode === 'flight_long') {
    if (distance_km < 1500) factor = EMISSION_FACTORS.flight_short;
    else if (distance_km < 4000) factor = EMISSION_FACTORS.flight_medium;
    else factor = EMISSION_FACTORS.flight_long;
  } else {
    factor = EMISSION_FACTORS[segment.mode];
  }

  const co2_per_passenger_kg = distance_km * factor;

  return {
    mode: segment.mode,
    distance_km: Math.round(distance_km),
    co2_kg: Math.round(co2_per_passenger_kg * passengers * 10) / 10,
    co2_per_passenger_kg: Math.round(co2_per_passenger_kg * 10) / 10,
    passengers,
  };
}

// ── Full Itinerary ESG Score ─────────────────────────────────

export interface ESGReport {
  total_distance_km: number;
  total_co2_kg: number;
  segments: SegmentResult[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  grade_label: string;
  trees_to_offset: number;     // Approx trees needed for 1-year offset
  vs_car_savings_kg: number;   // CO2 saved vs. driving equivalent distance
  recommendation: string;
}

function gradeEmissions(co2_kg: number, distance_km: number): ESGReport['grade'] {
  const intensity = co2_kg / Math.max(distance_km, 1); // kg per km
  if (intensity < 0.02) return 'A';
  if (intensity < 0.07) return 'B';
  if (intensity < 0.14) return 'C';
  if (intensity < 0.22) return 'D';
  return 'F';
}

const GRADE_LABELS: Record<ESGReport['grade'], string> = {
  A: 'Ultra-Low Carbon Journey 🌿',
  B: 'Low Carbon Journey 🌱',
  C: 'Moderate Emissions 🌍',
  D: 'High Emissions ⚠️',
  F: 'Very High Emissions 🔴',
};

export function calculateItineraryESG(segments: TravelSegment[]): ESGReport {
  const results = segments.map(calculateSegmentEmissions);
  const total_co2_kg = results.reduce((s, r) => s + r.co2_kg, 0);
  const total_distance_km = results.reduce((s, r) => s + r.distance_km, 0);

  const grade = gradeEmissions(total_co2_kg, total_distance_km);

  // 1 tree absorbs ~21 kg CO2 per year
  const trees_to_offset = Math.ceil(total_co2_kg / 21);

  // What if they drove the same distance?
  const car_co2 = total_distance_km * EMISSION_FACTORS.car_petrol;
  const vs_car_savings_kg = Math.max(0, Math.round((car_co2 - total_co2_kg) * 10) / 10);

  const recommendation =
    grade === 'A' || grade === 'B'
      ? 'Great choice! Your travel plan has a low carbon footprint.'
      : grade === 'C'
      ? 'Consider replacing short-haul flights with high-speed rail where available.'
      : 'Significant CO2 impact detected. Consider rail alternatives or carbon offset programs.';

  return {
    total_distance_km: Math.round(total_distance_km),
    total_co2_kg: Math.round(total_co2_kg * 10) / 10,
    segments: results,
    grade,
    grade_label: GRADE_LABELS[grade],
    trees_to_offset,
    vs_car_savings_kg,
    recommendation,
  };
}
