/** Print-ready model for the itinerary PDF (built server-side from a FinalItinerary). */

export interface PdfImage {
    data: Buffer;
    format: 'jpg' | 'png';
}

export interface PdfLink {
    label: string;
    url: string;
    note?: string;
}

export interface PdfStop {
    index: number;
    time?: string;
    title: string;
    category?: string;
    rating?: number;
    totalRatings?: number;
    address?: string;
    mapsUrl: string;
    hoursToday?: string;
    closedToday?: boolean;
    duration?: string;
    cost?: string;
    description?: string;
    highlights?: string[];
    tip?: string;
    mealNearby?: string;
    accessibility?: string;
    verified: boolean;
    photoUrl?: string | null; // source URL (resolved to `photo` by the loader)
    photo?: PdfImage;
    lat?: number;
    lng?: number;
    transitNext?: { minutes?: number; km?: number; mode?: string; url?: string };
}

export interface PdfDay {
    day: number;
    anchor: string; // internal link target, e.g. "day-1"
    weekday?: string;
    dateLabel?: string;
    title: string;
    area?: string;
    summary?: string;
    stops: PdfStop[];
    totalTransitMinutes: number;
    totalKm: number;
    routeUrl?: string;
    map?: PdfImage;
    eat: PdfLink[];
    more: PdfLink[];
    transportTip?: string;
}

export interface PdfFlight {
    route: string;
    date?: string;
    airline?: string;
    duration?: string;
    stops?: number;
    price: string;
    isEstimate: boolean;
    url?: string;
    source?: string;
}

export interface PdfHotel {
    name: string;
    price: string;
    stars?: number;
    roomType?: string;
    isEstimate: boolean;
    url?: string;
    source?: string;
}

export interface PdfWeatherDay {
    date: string;
    label: string;
}

export interface ItineraryPdfModel {
    title: string;
    destination: string;
    dateRange?: string;
    travellers?: string;
    budgetLevel?: string;
    pace?: string;
    transport?: string;
    overview?: string;
    bestTime?: string;
    whyThisPlan: string[];
    budgetEstimate?: string;
    budgetTips: string[];
    travelTips: string[];
    localCustoms: string[];
    safetyAdvice: string[];
    crowds?: string;
    physical?: string;
    weather: PdfWeatherDay[];
    days: PdfDay[];
    flights: PdfFlight[];
    hotels: PdfHotel[];
    esg?: { grade?: string; co2Kg?: number };
    cover?: PdfImage;
    coverUrl?: string | null;
    totalStops: number;
    generatedAt: string;
    verifiedAt?: string;
    tripUrl?: string;
    siteUrl: string;
}
