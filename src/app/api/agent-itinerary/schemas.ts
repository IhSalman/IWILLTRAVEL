/**
 * Zod Runtime Schemas for DGIS 8-Agent Blackboard Boundaries
 * Enforces strict schema compliance at every agent handoff (Thesis Section 4.4 & 4.5).
 */

import { z } from 'zod';

// ─── AGENT 1: DISCOVERY ──────────────────────────────────────────────────────

export const DiscoveredVenueSchema = z.object({
    name: z.string().min(1),
    placeId: z.string().optional(),
    address: z.string().optional().default(''),
    rating: z.number().optional().default(0),
    totalRatings: z.number().optional().default(0),
    priceLevel: z.union([z.number(), z.string(), z.null()]).optional(),
    types: z.array(z.string()).optional().default([]),
    lat: z.number().optional(),
    lng: z.number().optional(),
}).passthrough();

export const DiscoveryResultSchema = z.object({
    venues: z.array(DiscoveredVenueSchema),
    source: z.string(),
    timestamp: z.string(),
    error: z.string().optional(),
});

// ─── AGENT 2: PLANNING ───────────────────────────────────────────────────────

export const PlanDaySchema = z.object({
    day: z.number().int().min(1),
    date: z.string().optional(),
    city: z.string().min(1),
    neighborhood: z.string().min(1),
    neighborhoodDescription: z.string().optional().default(''),
    activities: z.array(z.string().min(1)).min(1),
    transitNote: z.string().optional().default(''),
});

export const Agent2LLMOutputSchema = z.object({
    plan: z.array(PlanDaySchema).min(1),
    researchPlan: z.array(z.string()).optional().default([]),
});

export const PlanResultSchema = z.object({
    plan: z.array(PlanDaySchema),
    researchPlan: z.array(z.string()).optional(),
    error: z.string().optional(),
    details: z.string().optional(),
    _tokens: z.any().optional(),
});

// ─── AGENT 3: RESEARCH ───────────────────────────────────────────────────────

export const FlightSchema = z.object({
    id: z.string().optional(),
    offerId: z.string().optional(),
    flightIata: z.string().optional(),
    from: z.string(),
    to: z.string(),
    price: z.number(),
    currency: z.string().optional(),
    date: z.string(),
    departureTime: z.string().optional(),
    arrivalTime: z.string().optional(),
    airline: z.string().optional(),
    duration: z.string().optional(),
    stops: z.number().optional(),
    source: z.string().optional(),
    bookingUrl: z.string().optional(),
    cabin: z.string().optional(),
    isEstimate: z.boolean().optional(),
    tier: z.enum(['budget', 'value', 'premium']).optional(),
    comparisonLinks: z.any().optional(),
}).passthrough();

export const HotelSchema = z.object({
    id: z.string().optional(),
    offerId: z.string().optional(),
    city: z.string(),
    name: z.string(),
    price: z.number(),
    currency: z.string().optional(),
    rating: z.number().optional(),
    stars: z.number().optional(),
    source: z.string().optional(),
    bookingUrl: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    isEstimate: z.boolean().optional(),
    tier: z.enum(['budget', 'mid-range', 'luxury']).optional(),
    comparisonLinks: z.any().optional(),
    roomType: z.string().optional(),
    tag: z.string().optional(),
    imageUrl: z.string().optional(),
    location: z.string().optional(),
}).passthrough();

export const AirQualitySchema = z.object({
    aqi: z.number(),
    category: z.string(),
    dominantPollutant: z.string(),
    color: z.string(),
});

export const PlaceDetailSchema = z.object({
    name: z.string(),
    address: z.string(),
    rating: z.number(),
    totalRatings: z.number(),
    summary: z.string(),
    photoUrl: z.string().nullable(),
    openingHours: z.array(z.string()),
    types: z.array(z.string()),
    lat: z.number().optional(),
    lng: z.number().optional(),
    airQuality: AirQualitySchema.nullable().optional(),
}).passthrough();

export const ResearchResultSchema = z.object({
    flights: z.array(FlightSchema),
    hotels: z.array(HotelSchema),
    placeDetails: z.record(z.string(), PlaceDetailSchema),
    weather: z.any().optional(),
    currency: z.any().optional(),
    locationCoords: z.object({ lat: z.number(), lng: z.number() }).optional(),
    error: z.string().optional(),
    details: z.string().optional(),
});

// ─── AGENT 8: CREATIVE & FINAL ITINERARY ─────────────────────────────────────

export const ActivityCreativeDescriptionSchema = z.object({
    description: z.string().min(10),
    highlights: z.array(z.string()).optional().default([]),
    cost: z.string().optional().default('Varies'),
    duration: z.string().optional().default('2-3 hours'),
    tip: z.string().optional().default(''),
    bestTimeToVisit: z.string().optional().default(''),
    mealNearby: z.string().optional().default(''),
    transportToNext: z.string().optional().default(''),
    category: z.string().optional().default('Landmark'),
    accessibilityNote: z.string().optional().default(''),
});

export const Agent8CreativeOutputSchema = z.object({
    title: z.string().min(3),
    overview: z.string().min(10),
    bestTimeToVisit: z.string().optional().default('Year-round'),
    whyThisPlan: z.array(z.string()).optional().default([]),
    travelTips: z.array(z.string()).optional().default([]),
    localCustoms: z.array(z.string()).optional().default([]),
    safetyAdvice: z.array(z.string()).optional().default([]),
    budgetTips: z.array(z.string()).optional().default([]),
    weatherForecast: z.string().optional(),
    currencyAdvice: z.string().optional(),
    dayThemes: z.array(z.string()).optional().default([]),
    activityDescriptions: z.record(z.string(), ActivityCreativeDescriptionSchema).optional().default({}),
});

export const FinalActivitySchema = z.object({
    time: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    highlights: z.array(z.string()).optional().default([]),
    photoUrl: z.string().nullable().optional(),
    editorialSummary: z.string().optional().default(''),
    duration: z.string(),
    cost: z.string(),
    tip: z.string().optional().default(''),
    rating: z.number().optional().default(0),
    totalRatings: z.number().optional().default(0),
    address: z.string().optional().default(''),
    openingHours: z.array(z.string()).optional(),
    openingHoursVerified: z.boolean().optional(),
    scheduleAdjustmentNote: z.string().optional(),
    source: z.string().optional().default('Google Places API'),
    transportNote: z.string().optional().default(''),
    bookingUrl: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    transitToNextMinutes: z.number().optional(),
    transitToNextMode: z.string().optional(),
    transitToNextKm: z.number().optional(),
    mealNearby: z.string().optional(),
    accessibilityNote: z.string().optional(),
    airQuality: AirQualitySchema.nullable().optional(),
}).passthrough();

export const FinalDaySchema = z.object({
    day: z.number().int().min(1),
    date: z.string().optional(),
    weekday: z.string().optional(),
    theme: z.string(),
    areaFocus: z.string(),
    difficulty: z.enum(['high', 'medium', 'low']),
    pace: z.string(),
    activities: z.array(FinalActivitySchema),
    dayResources: z.any(),
}).passthrough();

export const FinalItinerarySchema = z.object({
    title: z.string().min(1),
    overview: z.string(),
    bestTimeToVisit: z.string(),
    whyThisPlan: z.array(z.string()),
    travelTips: z.array(z.string()),
    localCustoms: z.array(z.string()),
    safetyAdvice: z.array(z.string()),
    budgetTips: z.array(z.string()),
    realityCheck: z.any(),
    days: z.array(FinalDaySchema).min(1),
    budgetBreakdown: z.any(),
    flightInfo: z.any().optional(),
    hotelInfo: z.array(HotelSchema).optional(),
    esgReport: z.any().optional(),
    _tokens: z.any().optional(),
}).passthrough();
