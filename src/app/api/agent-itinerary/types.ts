/**
 * Shared TypeScript types for the 9-Agent Itinerary System
 * 
 * Each agent has strictly typed input/output interfaces.
 * Data flows: Input → Agent1 → Agent2 → ... → Agent9 → FinalItinerary
 */

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
    customBudget?: number;     // exact amount in user's currency
    currency?: string;         // e.g. 'USD', 'EUR', 'BDT', 'INR'
}

// ─── AGENT 1: TRAVEL PLANNING AGENT ─────────────────────────────────────────

export interface PlanDay {
    day: number;
    city: string;
    activities: string[];        // Activity names/descriptions (skeleton)
}

export interface PlanResult {
    plan: PlanDay[];
    researchPlan?: string[];     // Strategic steps the agent will take
    error?: string;
    details?: string;
}

// ─── AGENT 2: TRAVEL RESEARCH AGENT ─────────────────────────────────────────

export interface Flight {
    from: string;
    to: string;
    price: number;
    date: string;
    airline?: string;
    duration?: string;
    stops?: number;
    departureTime?: string;
    source?: string;           // 'Kiwi' | 'Amadeus'
    bookingUrl?: string;       // direct booking link
    returnDate?: string;
    arrivalTime?: string;
    cabin?: string;
}

export interface Hotel {
    city: string;
    name: string;
    price: number;
    rating?: number;
    roomType?: string;
    source?: string;           // 'Kiwi' | 'Amadeus'
    bookingUrl?: string;
    stars?: number;            // 1-5 star classification
    reviewScore?: number;      // guest review score (0-10)
    location?: string;         // neighbourhood / address
    amenities?: string[];      // e.g. ['WiFi', 'Pool', 'Breakfast']
    imageUrl?: string;
    tag?: 'cheapest' | 'best-rated' | 'best-value';  // analysis tag
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
}

export interface ResearchResult {
    flights: Flight[];
    hotels: Hotel[];
    placeDetails: Record<string, PlaceDetail>;  // key = place name
    weather?: any;                              // Monthly/Forecast data
    currency?: { base: string; rates: Record<string, number> };
    locationCoords?: { lat: number; lng: number };
    error?: string;
    details?: string;
}

// ─── AGENT 3: LOCAL EXPERIENCE AGENT ────────────────────────────────────────

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

// ─── AGENT 4: FLIGHT ANALYSIS AGENT ────────────────────────────────────────

export interface FlightAnalysis {
    cheapestDay: string | null;
    averagePrice: number;
    lowestPrice: number;
    bestOption: Flight | null;
    recommendation: string;
    error?: string;
}

// ─── AGENT 5: BUDGET OPTIMIZATION AGENT ─────────────────────────────────────

export interface BudgetResult {
    isWithinBudget: boolean;
    totalCost: number;
    flightsCost: number;
    hotelsCost: number;
    dailyBudgetRemaining: number;
    adjustments: string[];
    error?: string;
}

// ─── AGENT 6: ROUTE OPTIMIZATION AGENT ──────────────────────────────────────

export interface OptimizedRoute {
    optimizedRoute: string[];        // Reordered city sequence
    removedBacktracks: number;
    routeChanged: boolean;
    error?: string;
}

// ─── AGENT 9: FINAL ITINERARY COMPOSER ──────────────────────────────────────

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
}

export interface FinalDayResources {
    whereToEat: { label: string; url: string; photoUrl?: string; rating?: number; lat?: number; lng?: number }[];
    experiences: { label: string; url: string; lat?: number; lng?: number }[];
    transportTip: string;
}

export interface FinalDay {
    day: number;
    theme: string;
    areaFocus: string;
    difficulty: 'high' | 'medium' | 'low';
    pace: string;
    activities: FinalActivity[];
    dayResources: FinalDayResources;
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
    realityCheck: {
        crowds: { level: 'high' | 'medium' | 'low'; description: string };
        physical: { level: 'high' | 'medium' | 'low'; description: string };
        weather: string[];
    };
    days: FinalDay[];
    budgetBreakdown: {
        totalEstimate: string;
        savingTips: string[];
        currencyCode?: string;
        conversionRate?: number;
    };
    flightInfo?: {
        bestOption: Flight | null;
        analysis: string;
    };
    hotelInfo?: Hotel[];
    weatherForecast?: any;
}

// ─── COMPOSER MERGED INPUT ──────────────────────────────────────────────────

export interface ComposerInput {
    input: AgentInput;
    plan: PlanResult;
    research: ResearchResult;
    experiences: ExperienceResult;
    flightAnalysis: FlightAnalysis;
    budgetCheck: BudgetResult;
    optimizedRoute: OptimizedRoute;
}

// ─── PIPELINE LOG ───────────────────────────────────────────────────────────

export interface AgentLog {
    agent: string;
    durationMs: number;
    status: 'success' | 'error' | 'skipped';
    details?: string;
}
