/** Stored shape of an auto-generated itinerary guide (blogs.content, JSON). */

export interface GuideStop {
    name: string;
    time?: string;
    category?: string;
    description?: string;
    address?: string;
    mapsUrl: string;
    photoUrl?: string;
    rating?: number;
    totalRatings?: number;
    hours?: string[]; // "Monday: 9:00 AM – 5:00 PM"
    tip?: string;
    lat?: number;
    lng?: number;
    verified: boolean;
}

export interface GuideDay {
    day: number;
    title: string;
    area?: string;
    summary?: string;
    routeUrl?: string;
    stops: GuideStop[];
    eat: { label: string; url: string }[];
}

export interface ItineraryGuideContent {
    is_structured_json: true;
    kind: 'itinerary_guide';
    version: 2;
    destination: string; // "Kyoto, Japan"
    city: string; // "Kyoto"
    days: number;
    keyword: string; // "3 days in Kyoto itinerary"
    intro: string;
    whoItsFor: string;
    faq: { q: string; a: string }[];
    tips: string[];
    /** Practical "know before you go" advice (airport, transport, money, safety, etiquette, booking ahead). */
    beforeYouGo?: { topic: string; tip: string }[];
    quickFacts: { bestTime?: string; budget?: string; gettingAround?: string; pace?: string };
    plan: GuideDay[];
    verifiedAt: string; // ISO
    stats: { stops: number; verifiedRate: number; photoRate: number };
}

export function isItineraryGuide(c: unknown): c is ItineraryGuideContent {
    return !!c && typeof c === 'object' && (c as any).kind === 'itinerary_guide' && Array.isArray((c as any).plan);
}
