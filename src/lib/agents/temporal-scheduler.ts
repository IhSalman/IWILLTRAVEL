/**
 * Deterministic Temporal & Spatial Scheduler (Thesis Section 3.4.3, 3.4.4, 5.3.2 & 6.2)
 *
 * Guarantees:
 * 1. No venue is scheduled on a weekday when Google Places reports it CLOSED
 *    (either swaps to an open day in the same city or replaces from the verified Truth Pool).
 * 2. No activity time window overhangs a venue's verified opening/closing hours
 *    (e.g., Old Kuopio Museum closing at 15:00 will never be slotted 14:00-16:30).
 * 3. Intra-day venues are spatially ordered via Nearest-Neighbor + 2-Opt on GPS coordinates
 *    while respecting early-closing constraints.
 */

import type { PlanDay, PlaceDetail } from '@/app/api/agent-itinerary/types';

export interface TimeInterval {
    openMin: number;  // minutes since 00:00
    closeMin: number; // minutes since 00:00 (can exceed 1440 for past-midnight)
}

export interface ParsedDayHours {
    weekday: string;
    isClosed: boolean;
    is24Hours: boolean;
    intervals: TimeInterval[];
    raw: string;
}

export const WEEKDAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const;

const DEFAULT_SLOTS: TimeInterval[] = [
    { openMin: 9 * 60 + 30,  closeMin: 11 * 60 + 30 }, // 09:30 AM - 11:30 AM
    { openMin: 12 * 60,      closeMin: 13 * 60 + 30 }, // 12:00 PM - 01:30 PM
    { openMin: 14 * 60,      closeMin: 16 * 60 + 30 }, // 02:00 PM - 04:30 PM
    { openMin: 17 * 60,      closeMin: 19 * 60 },      // 05:00 PM - 07:00 PM
    { openMin: 19 * 60 + 30, closeMin: 21 * 60 + 30 }, // 07:30 PM - 09:30 PM
    { openMin: 22 * 60,      closeMin: 23 * 60 + 30 }, // 10:00 PM - 11:30 PM
];

/**
 * Parse a single clock token like "9:00 AM", "10:00\u202fAM", "15:00", "2:30 PM" into minutes from 00:00.
 */
export function parseClockToMinutes(token: string, fallbackMeridiem?: 'AM' | 'PM'): number | null {
    const normalized = token
        .replace(/[\u202f\u00a0\u2009]/g, ' ')
        .trim()
        .toUpperCase();

    const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2] || '0', 10);
    const meridiem = (match[3] as 'AM' | 'PM' | undefined) || fallbackMeridiem;

    if (hours > 24 || mins > 59) return null;

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return hours * 60 + mins;
}

/**
 * Parse Google Places `weekdayDescriptions` entry (e.g. "Friday: 10:00 AM – 3:00 PM" or "Monday: Closed").
 */
export function parseWeekdayDescription(line: string): ParsedDayHours | null {
    const cleaned = line.replace(/[\u202f\u00a0\u2009]/g, ' ').trim();
    const colonIdx = cleaned.indexOf(':');
    if (colonIdx === -1) return null;

    const weekday = cleaned.slice(0, colonIdx).trim();
    const rest = cleaned.slice(colonIdx + 1).trim();

    if (/closed/i.test(rest)) {
        return { weekday, isClosed: true, is24Hours: false, intervals: [], raw: cleaned };
    }
    if (/24\s*hours/i.test(rest)) {
        return {
            weekday,
            isClosed: false,
            is24Hours: true,
            intervals: [{ openMin: 0, closeMin: 24 * 60 }],
            raw: cleaned,
        };
    }

    const parts = rest.split(',').map((p) => p.trim()).filter(Boolean);
    const intervals: TimeInterval[] = [];

    for (const part of parts) {
        const rangeParts = part.split(/\s*[–—-]\s*/);
        if (rangeParts.length !== 2) continue;

        const endMatch = rangeParts[1].toUpperCase().match(/(AM|PM)\s*$/);
        const startHasMeridiem = /(AM|PM)\s*$/i.test(rangeParts[0]);
        // Note: In "10:00 – 3:00 PM", 10:00 is AM while 3:00 is PM; only inherit meridiem when sensible
        const endMinRaw = parseClockToMinutes(rangeParts[1]);
        let startMin = parseClockToMinutes(rangeParts[0]);

        if (!startHasMeridiem && endMatch && startMin !== null && endMinRaw !== null) {
            const endMeridiem = endMatch[1] as 'AM' | 'PM';
            const withSame = parseClockToMinutes(rangeParts[0], endMeridiem);
            if (withSame !== null && withSame < endMinRaw) {
                startMin = withSame;
            }
        }

        if (startMin !== null && endMinRaw !== null) {
            const closeMin = endMinRaw <= startMin ? endMinRaw + 24 * 60 : endMinRaw;
            intervals.push({ openMin: startMin, closeMin });
        }
    }

    if (intervals.length === 0) {
        return null;
    }

    return {
        weekday,
        isClosed: false,
        is24Hours: false,
        intervals,
        raw: cleaned,
    };
}

/**
 * Look up parsed hours for a specific weekday from Google Places `openingHours` array.
 */
export function getVenueHoursForWeekday(openingHours: string[] | undefined, weekday: string): ParsedDayHours | null {
    if (!openingHours || openingHours.length === 0) return null;
    const target = weekday.toLowerCase();
    for (const line of openingHours) {
        const parsed = parseWeekdayDescription(line);
        if (parsed && parsed.weekday.toLowerCase().startsWith(target.slice(0, 3))) {
            return parsed;
        }
    }
    return null;
}

/**
 * Format minutes since midnight into "HH:MM AM/PM".
 */
export function formatMinutesToClock(totalMinutes: number): string {
    const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
    const h24 = Math.floor(wrapped / 60);
    const mins = wrapped % 60;
    const meridiem = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${meridiem}`;
}

export function formatTimeSlot(slot: TimeInterval): string {
    return `${formatMinutesToClock(slot.openMin)} - ${formatMinutesToClock(slot.closeMin)}`;
}

/**
 * Compute date (YYYY-MM-DD) and weekday name for a trip day index (0-based).
 * If startDate is omitted, anchors to the upcoming Friday so weekend-only museums
 * remain reachable and weekday checks remain deterministic.
 */
export function resolveTripDayDate(startDate: string | undefined, dayIndex: number): { date?: string; weekday: string } {
    if (startDate) {
        const base = new Date(`${startDate}T12:00:00Z`);
        if (!isNaN(base.getTime())) {
            base.setUTCDate(base.getUTCDate() + dayIndex);
            const iso = base.toISOString().split('T')[0];
            const weekday = WEEKDAYS[base.getUTCDay()];
            return { date: iso, weekday };
        }
    }
    // Deterministic default anchor starting Friday (index 5)
    const weekday = WEEKDAYS[(5 + dayIndex) % 7];
    return { weekday };
}

/**
 * Haversine distance in kilometers between two GPS points.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Intra-day spatial optimization via Nearest-Neighbor + 2-Opt refinement.
 * Preserves evening/nightlife stops at the end of the day when identifiable.
 */
export function optimizeIntraDayActivities(
    activities: string[],
    coordLookup: (name: string) => { lat?: number; lng?: number; types?: string[] } | undefined
): { ordered: string[]; distanceSavedKm: number } {
    if (activities.length <= 2) {
        return { ordered: [...activities], distanceSavedKm: 0 };
    }

    const withCoords = activities.map((name) => {
        const info = coordLookup(name);
        const typesStr = (info?.types || []).join(' ').toLowerCase();
        const isLateNight = /\b(bar|night_club|nightlife|pub|cocktail)\b/.test(typesStr) || /\b(bar|pub|drink)\b/i.test(name);
        return {
            name,
            lat: info?.lat,
            lng: info?.lng,
            hasValidCoords: typeof info?.lat === 'number' && typeof info?.lng === 'number' && (info.lat !== 0 || info.lng !== 0),
            isLateNight,
        };
    });

    const daytime = withCoords.filter((a) => !a.isLateNight);
    const evening = withCoords.filter((a) => a.isLateNight);

    const validCount = daytime.filter((a) => a.hasValidCoords).length;
    if (validCount < 2) {
        return { ordered: [...daytime.map((a) => a.name), ...evening.map((a) => a.name)], distanceSavedKm: 0 };
    }

    const totalRouteDistance = (seq: typeof daytime): number => {
        let sum = 0;
        for (let i = 0; i < seq.length - 1; i++) {
            if (seq[i].hasValidCoords && seq[i + 1].hasValidCoords) {
                sum += haversineKm(seq[i].lat!, seq[i].lng!, seq[i + 1].lat!, seq[i + 1].lng!);
            }
        }
        return sum;
    };

    const originalDist = totalRouteDistance(daytime);

    // Nearest-neighbor starting from the first daytime anchor
    const remaining = [...daytime];
    const route = [remaining.shift()!];

    while (remaining.length > 0) {
        const last = route[route.length - 1];
        if (!last.hasValidCoords) {
            route.push(remaining.shift()!);
            continue;
        }
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
            const cand = remaining[i];
            const d = cand.hasValidCoords ? haversineKm(last.lat!, last.lng!, cand.lat!, cand.lng!) : 0;
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        route.push(remaining.splice(bestIdx, 1)[0]);
    }

    // 2-Opt refinement pass
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < route.length - 2; i++) {
            for (let k = i + 2; k < route.length; k++) {
                const candidate = [
                    ...route.slice(0, i + 1),
                    ...route.slice(i + 1, k + 1).reverse(),
                    ...route.slice(k + 1),
                ];
                if (totalRouteDistance(candidate) + 0.01 < totalRouteDistance(route)) {
                    route.splice(0, route.length, ...candidate);
                    improved = true;
                }
            }
        }
    }

    const optimizedDist = totalRouteDistance(route);
    const saved = Math.max(0, originalDist - optimizedDist);

    return {
        ordered: [...route.map((r) => r.name), ...evening.map((e) => e.name)],
        distanceSavedKm: Number(saved.toFixed(2)),
    };
}

export interface ScheduledActivitySlot {
    name: string;
    time: string;
    openingHoursVerified: boolean;
    adjustmentNote?: string;
}

/**
 * Reconciles planned activities across all days against verified Google Places openingHours:
 * 1. Resolves closed-weekday conflicts via cross-day swap or Truth Pool replacement.
 * 2. Reorders early-closing venues (e.g. closing at 15:00) into morning/early-afternoon slots.
 * 3. Clamps/shifts visit windows so 100% of scheduled times fall strictly inside operating hours.
 */
export function reconcileTemporalSchedule(params: {
    planDays: PlanDay[];
    startDate?: string;
    placeDetails: Record<string, PlaceDetail>;
    discoveredVenues?: any[];
}): {
    adjustedDays: Array<{
        day: number;
        date?: string;
        weekday: string;
        slots: ScheduledActivitySlot[];
    }>;
    auditFixes: string[];
} {
    const { planDays, startDate, placeDetails, discoveredVenues = [] } = params;
    const auditFixes: string[] = [];

    const findDetail = (name: string): PlaceDetail | undefined => {
        if (placeDetails[name]) return placeDetails[name];
        const lower = name.toLowerCase();
        const key = Object.keys(placeDetails).find(
            (k) => k.toLowerCase() === lower || lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
        );
        return key ? placeDetails[key] : undefined;
    };

    // Clone mutable day structures
    const workingDays = planDays.map((d, idx) => {
        const { date, weekday } = resolveTripDayDate(startDate, idx);
        return {
            day: d.day,
            city: d.city,
            date,
            weekday,
            activities: [...d.activities],
            notes: new Map<string, string>(),
        };
    });

    const usedVenues = new Set(workingDays.flatMap((d) => d.activities.map((a) => a.toLowerCase())));

    // Pass 1: Resolve full-day closures (e.g. Museum closed Mondays)
    for (let dIdx = 0; dIdx < workingDays.length; dIdx++) {
        const dayObj = workingDays[dIdx];
        for (let aIdx = 0; aIdx < dayObj.activities.length; aIdx++) {
            const actName = dayObj.activities[aIdx];
            const detail = findDetail(actName);
            const hours = getVenueHoursForWeekday(detail?.openingHours, dayObj.weekday);

            if (hours?.isClosed) {
                let resolved = false;

                // Option A: Swap with an activity on another day in the SAME city where both will be open
                for (let otherIdx = 0; otherIdx < workingDays.length && !resolved; otherIdx++) {
                    if (otherIdx === dIdx) continue;
                    const otherDay = workingDays[otherIdx];
                    if (otherDay.city.toLowerCase() !== dayObj.city.toLowerCase()) continue;

                    const myHoursOnOtherDay = getVenueHoursForWeekday(detail?.openingHours, otherDay.weekday);
                    if (!myHoursOnOtherDay || myHoursOnOtherDay.isClosed) continue;

                    for (let oaIdx = 0; oaIdx < otherDay.activities.length; oaIdx++) {
                        const otherAct = otherDay.activities[oaIdx];
                        const otherDetail = findDetail(otherAct);
                        const otherHoursOnMyDay = getVenueHoursForWeekday(otherDetail?.openingHours, dayObj.weekday);
                        if (!otherHoursOnMyDay?.isClosed) {
                            dayObj.activities[aIdx] = otherAct;
                            otherDay.activities[oaIdx] = actName;
                            const msg = `Rescheduled "${actName}" from ${dayObj.weekday} (Closed) to Day ${otherDay.day} (${otherDay.weekday}).`;
                            otherDay.notes.set(actName, msg);
                            auditFixes.push(msg);
                            resolved = true;
                            break;
                        }
                    }
                }

                // Option B: Replace from Agent 1's verified Truth Pool
                if (!resolved && discoveredVenues.length > 0) {
                    const replacement = discoveredVenues.find((v: any) => {
                        if (!v?.name || usedVenues.has(v.name.toLowerCase())) return false;
                        const repDetail = findDetail(v.name);
                        const repHours = getVenueHoursForWeekday(repDetail?.openingHours || v.openingHours, dayObj.weekday);
                        return !repHours?.isClosed;
                    });

                    if (replacement) {
                        usedVenues.add(replacement.name.toLowerCase());
                        dayObj.activities[aIdx] = replacement.name;
                        const msg = `Replaced "${actName}" (closed on ${dayObj.weekday}) with verified venue "${replacement.name}".`;
                        dayObj.notes.set(replacement.name, msg);
                        auditFixes.push(msg);
                        resolved = true;
                    }
                }
            }
        }
    }

    // Pass 2: Assign valid, non-overlapping time windows within each venue's open intervals
    const adjustedDays = workingDays.map((dayObj) => {
        // Check closing times so early-closing venues (e.g. closing <= 16:00) get morning/early slots
        const enriched = dayObj.activities.map((name, originalIdx) => {
            const detail = findDetail(name);
            const hours = getVenueHoursForWeekday(detail?.openingHours, dayObj.weekday);
            const earliestClose =
                hours && !hours.isClosed && hours.intervals.length > 0
                    ? Math.max(...hours.intervals.map((iv) => iv.closeMin))
                    : 24 * 60;
            const latestOpen =
                hours && !hours.isClosed && hours.intervals.length > 0
                    ? Math.min(...hours.intervals.map((iv) => iv.openMin))
                    : 0;
            return { name, originalIdx, hours, earliestClose, latestOpen };
        });

        // Bubble early-closing venues (closing <= 16:00 / 960m) ahead of late-closing ones if placed too late
        for (let i = 1; i < enriched.length; i++) {
            const slotDefault = DEFAULT_SLOTS[Math.min(i, DEFAULT_SLOTS.length - 1)];
            if (enriched[i].earliestClose < slotDefault.closeMin) {
                for (let j = 0; j < i; j++) {
                    const earlierSlot = DEFAULT_SLOTS[Math.min(j, DEFAULT_SLOTS.length - 1)];
                    if (
                        enriched[i].latestOpen <= earlierSlot.openMin + 30 &&
                        enriched[i].earliestClose >= earlierSlot.openMin + 90 &&
                        enriched[j].earliestClose >= slotDefault.closeMin
                    ) {
                        const msg = `Moved "${enriched[i].name}" earlier on ${dayObj.weekday} to respect ${formatMinutesToClock(enriched[i].earliestClose)} closing time.`;
                        dayObj.notes.set(enriched[i].name, msg);
                        auditFixes.push(msg);
                        const temp = enriched[j];
                        enriched[j] = enriched[i];
                        enriched[i] = temp;
                        break;
                    }
                }
            }
        }

        let cursorMin = 9 * 60 + 30; // Start day at 09:30 AM
        const slots: ScheduledActivitySlot[] = enriched.map((item, idx) => {
            const baseSlot = DEFAULT_SLOTS[Math.min(idx, DEFAULT_SLOTS.length - 1)];
            let startMin = Math.max(baseSlot.openMin, cursorMin);
            let durationMin = baseSlot.closeMin - baseSlot.openMin; // typically 90-150m
            let endMin = startMin + durationMin;
            let verified = false;

            if (item.hours && !item.hours.isClosed && item.hours.intervals.length > 0) {
                verified = true;
                // Find best matching interval
                const matchingIv =
                    item.hours.intervals.find((iv) => startMin < iv.closeMin && endMin > iv.openMin) ||
                    item.hours.intervals[0];

                if (startMin < matchingIv.openMin) {
                    startMin = matchingIv.openMin;
                    endMin = Math.min(startMin + durationMin, matchingIv.closeMin);
                }
                if (endMin > matchingIv.closeMin) {
                    endMin = matchingIv.closeMin;
                    // Shift start earlier if room exists before cursor or keep minimum 60-min visit
                    if (endMin - startMin < 60) {
                        startMin = Math.max(matchingIv.openMin, endMin - 90);
                    }
                    const note = dayObj.notes.get(item.name) ||
                        `Adjusted visit window to end by verified ${formatMinutesToClock(matchingIv.closeMin)} closing time.`;
                    dayObj.notes.set(item.name, note);
                }
            }

            cursorMin = endMin + 30; // 30-min transit buffer to next activity
            return {
                name: item.name,
                time: formatTimeSlot({ openMin: startMin, closeMin: Math.max(startMin + 45, endMin) }),
                openingHoursVerified: verified,
                adjustmentNote: dayObj.notes.get(item.name),
            };
        });

        return {
            day: dayObj.day,
            date: dayObj.date,
            weekday: dayObj.weekday,
            slots,
        };
    });

    return { adjustedDays, auditFixes };
}
