/**
 * Shared TypeScript types for the 8-Agent Itinerary System
 * 
 * Standardized 8-Agent Sequential Pipeline:
 * Agent 1: Discovery    -> Grounding data acquisition
 * Agent 2: Planning     -> Strategic skeleton generation
 * Agent 3: Research     -> Market procurement (Flights/Hotels)
 * Agent 4: Finance      -> Economic audit & optimization
 * Agent 5: Experience   -> Cultural & local enrichment
 * Agent 6: Logistics    -> Spatial/Route optimization
 * Agent 7: ESG          -> Sustainability scoring
 * Agent 8: Composer     -> Final synthesis & narrative
 */

import type { ESGReport } from '@/lib/esg-calculator';

// ─── USER INPUT ──────────────────────────────────────────────────────────────

export interface AgentInput {
    destination: string;
    days: number;
    startDate?: string;
    endDate?: string;
    budget: 'budget' | 'moderate' | 'luxury' | 'custom';
    travelStyle: 'relaxed' | 'balanced' | 'adventure' | 'cultural';
    travelerType: 'single' | 'couple' | 'family' | 'friends';
    interests: string[];
    transport: 'public' | 'rental' | 'walking';
    originCity?: string;
    includeFlights?: boolean;
    includeHotels?: boolean;
    customBudget?: number;     
    currency?: string;         
    discoveredVenues?: any[];  // Grounding pool from Agent 1
}

// ─── AGENT 1: DISCOVERY ──────────────────────────────────────────────────────

export interface DiscoveryResult {
    venues: any[];
    source: string;
    timestamp: string;
    error?: string;
}

// ─── AGENT 2: PLANNING ───────────────────────────────────────────────────────

export interface PlanDay {
    day: number;
    city: string;
    neighborhood: string;
    neighborhoodDescription?: string;
    activities: string[];
    transitNote?: string;
}

export interface PlanResult {
    plan: PlanDay[];
    researchPlan?: string[];
    error?: string;
    details?: string;
    _tokens?: any;
}

// ─── AGENT 3: RESEARCH ───────────────────────────────────────────────────────

export interface Flight {
    from: string;
    to: string;
    price: number;
    date: string;
    airline?: string;
    duration?: string;
    stops?: number;
    source?: string;
    bookingUrl?: string;
    cabin?: string;
    isEstimate?: boolean;
    tier?: 'budget' | 'value' | 'premium';
    comparisonLinks?: any;
}

export interface Hotel {
    city: string;
    name: string;
    price: number;
    rating?: number;
    stars?: number;
    source?: string;
    bookingUrl?: string;
    amenities?: string[];
    isEstimate?: boolean;
    tier?: 'budget' | 'mid-range' | 'luxury';
    comparisonLinks?: any;
    roomType?: string;
    tag?: string;
}

export interface PlaceDetail {
    name: string;
    address: string;
    rating: number;
    totalRatings: number;
    summary: string;
    photoUrl: string | null;
    openingHours: string[];
    types: string[];
    lat?: number;
    lng?: number;
    airQuality?: {
        aqi: number;
        category: string;
        dominantPollutant: string;
        color: string;
    } | null;
}

export interface ResearchResult {
    flights: Flight[];
    hotels: Hotel[];
    placeDetails: Record<string, PlaceDetail>;
    weather?: any;
    currency?: any;
    locationCoords?: { lat: number; lng: number };
    error?: string;
    details?: string;
}

// ─── AGENT 4: FINANCE ────────────────────────────────────────────────────────

export interface FlightAnalysis {
    cheapestDay: string | null;
    averagePrice: number;
    lowestPrice: number;
    bestOption: Flight | null;
    recommendation: string;
}

export interface BudgetResult {
    isWithinBudget: boolean;
    totalCost: number;
    flightsCost: number;
    hotelsCost: number;
    dailyBudgetRemaining: number;
    adjustments: string[];
}

// ─── AGENT 5: EXPERIENCE ─────────────────────────────────────────────────────

export interface PlaceSearchResult {
    name: string;
    address: string;
    rating: number;
    totalRatings: number;
    priceLevel: number | null;
    types: string[];
    lat?: number;
    lng?: number;
}

export interface ExperienceDay {
    day: number;
    activities: PlaceSearchResult[];
    restaurants: PlaceSearchResult[];
}

export interface ExperienceResult {
    experiences: ExperienceDay[];
    error?: string;
    details?: string;
}

// ─── AGENT 6: LOGISTICS ──────────────────────────────────────────────────────

export interface OptimizedRoute {
    optimizedRoute: string[];
    removedBacktracks: number;
    routeChanged: boolean;
    error?: string;
}

// ─── AGENT 7: SUSTAINABILITY (ESG) ──────────────────────────────────────────

export interface SustainabilityResult {
    report: ESGReport;
    error?: string;
}

// ─── AGENT 8: COMPOSER ───────────────────────────────────────────────────────

export interface FinalActivity {
    time: string;
    title: string;
    description: string;
    highlights: string[];
    photoUrl: string | null;
    editorialSummary: string;
    duration: string;
    cost: string;
    tip: string;
    rating: number;
    totalRatings: number;
    address: string;
    openingHours?: string[];
    source: string;
    transportNote: string;
    bookingUrl?: string;
    lat?: number;
    lng?: number;
    transitToNextMinutes?: number;
    transitToNextMode?: string;
    transitToNextKm?: number;
    mealNearby?: string;
    accessibilityNote?: string;
    airQuality?: {
        aqi: number;
        category: string;
        dominantPollutant: string;
        color: string;
    } | null;
}

export interface FinalDay {
    day: number;
    theme: string;
    areaFocus: string;
    difficulty: 'high' | 'medium' | 'low';
    pace: string;
    activities: FinalActivity[];
    dayResources: any;
}

export interface FinalItinerary {
    title: string;
    overview: string;
    bestTimeToVisit: string;
    whyThisPlan: string[];
    travelTips: string[];
    localCustoms: string[];
    safetyAdvice: string[];
    budgetTips: string[];
    realityCheck: any;
    days: FinalDay[];
    budgetBreakdown: any;
    flightInfo?: any;
    hotelInfo?: Hotel[];
    esgReport?: ESGReport;
    _tokens?: any;
}

export interface ComposerInput {
    input: AgentInput;
    plan: PlanResult;
    research: ResearchResult;
    experiences: ExperienceResult;
    flightAnalysis: FlightAnalysis;
    budgetCheck: BudgetResult;
    optimizedRoute: OptimizedRoute;
    sustainability: SustainabilityResult;
}

// ─── STREAMING ───────────────────────────────────────────────────────────────

export interface AgentLog {
    agent: string;
    durationMs: number;
    status: 'success' | 'error' | 'skipped';
    details?: string;
    timestamp: string;
}

export type StreamEvent =
    | { event: 'log'; data: AgentLog }
    | { event: 'result'; data: any }
    | { event: 'error'; data: { message: string } };
