'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Route, MapPin, Clock, Star, ExternalLink, Navigation, Footprints, Sparkles } from 'lucide-react';
import type { MapPoint } from './RoadmapMap';

const RoadmapMap = dynamic(() => import('./RoadmapMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[540px] flex flex-col items-center justify-center bg-[#0b0c0f] rounded-2xl border border-white/10 gap-4">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-300 text-sm font-medium">Loading interactive route map...</p>
        </div>
    ),
});

interface Props {
    itinerary: any;
    initialFocusedPoint?: { lat: number; lng: number; title?: string; day?: number } | null;
}

export default function RoadmapTab({ itinerary, initialFocusedPoint = null }: Props) {
    const [selectedDay, setSelectedDay] = useState<number | null>(initialFocusedPoint?.day ?? null);
    const [focusedPoint, setFocusedPoint] = useState<{ lat: number; lng: number; title?: string; day?: number } | null>(
        initialFocusedPoint
    );

    const points: MapPoint[] = [];

    if (itinerary?.days) {
        let globalSequence = 1;
        itinerary.days.forEach((day: any) => {
            if (day.activities) {
                day.activities.forEach((act: any) => {
                    if (act.lat && act.lng) {
                        points.push({
                            id: globalSequence++,
                            lat: act.lat,
                            lng: act.lng,
                            title: act.title || act.name || 'Stop',
                            description: act.description || act.editorialSummary || '',
                            day: day.day,
                            type: 'activity',
                            time: act.time,
                            transitToNextMinutes: act.transitToNextMinutes,
                            transitToNextMode: act.transitToNextMode,
                            transitToNextKm: act.transitToNextKm,
                            rating: act.rating,
                        });
                    }
                });
            }
            if (day.dayResources?.whereToEat) {
                day.dayResources.whereToEat.forEach((rest: any) => {
                    if (rest.lat && rest.lng) {
                        points.push({
                            id: null,
                            lat: rest.lat,
                            lng: rest.lng,
                            title: rest.label,
                            description: `Recommended restaurant for Day ${day.day}`,
                            day: day.day,
                            type: 'restaurant',
                            url: rest.url,
                            rating: rest.rating,
                        });
                    }
                });
            }
            if (day.dayResources?.experiences) {
                day.dayResources.experiences.forEach((exp: any) => {
                    if (exp.lat && exp.lng) {
                        points.push({
                            id: null,
                            lat: exp.lat,
                            lng: exp.lng,
                            title: exp.label,
                            description: `Local experience for Day ${day.day}`,
                            day: day.day,
                            type: 'experience',
                            url: exp.url,
                        });
                    }
                });
            }
        });
    }

    const activityPoints = points.filter(p => p.type === 'activity');
    const uniqueDays = Array.from(new Set(activityPoints.map(p => p.day))).sort((a, b) => a - b);
    const geocodedCount = activityPoints.length;
    const totalActivities = itinerary?.days?.reduce((sum: number, d: any) => sum + (d.activities?.length || 0), 0) || 0;
    const geocodeRate = totalActivities > 0 ? Math.round((geocodedCount / totalActivities) * 100) : 0;

    const totalTransitMinutes = activityPoints.reduce((acc, p) => acc + (p.transitToNextMinutes || 0), 0);
    const totalTransitKm = activityPoints.reduce((acc, p) => acc + (p.transitToNextKm || 0), 0);
    const savedKm = itinerary?.blackboardState?.spatialDistanceSavedKm || 0;

    const buildGoogleMapsDayUrl = (dayActs: MapPoint[]) => {
        if (dayActs.length === 0) return 'https://www.google.com/maps';
        if (dayActs.length === 1) {
            return `https://www.google.com/maps/search/?api=1&query=${dayActs[0].lat},${dayActs[0].lng}`;
        }
        const origin = `${dayActs[0].lat},${dayActs[0].lng}`;
        const dest = `${dayActs[dayActs.length - 1].lat},${dayActs[dayActs.length - 1].lng}`;
        const waypoints = dayActs
            .slice(1, -1)
            .map(p => `${p.lat},${p.lng}`)
            .join('|');
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=walking`;
    };

    return (
        <div className="space-y-5">
            {/* Interactive Google Map */}
            <RoadmapMap
                points={points}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                focusedPoint={focusedPoint}
            />

            {points.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Spatial Telemetry Card */}
                    <div className="apple-glass-card rounded-2xl p-5 flex flex-col justify-between gap-4">
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Route className="w-4 h-4 text-sky-300" />
                                Spatial Route Telemetry
                            </h3>
                            <p className="text-xs text-slate-300/80 leading-relaxed">
                                Click any stop on the right to pan & zoom the map directly to its pin, or launch turn-by-turn navigation for a full day.
                            </p>

                            <div className="space-y-2.5 pt-1">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">GPS-Verified Stops</span>
                                    <span className="font-mono font-semibold text-white">{geocodedCount} / {totalActivities} ({geocodeRate}%)</span>
                                </div>
                                <div className="w-full bg-white/[0.08] rounded-full h-1.5">
                                    <div
                                        className="bg-gradient-to-r from-sky-400 to-emerald-400 h-1.5 rounded-full transition-all"
                                        style={{ width: `${geocodeRate}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center text-xs pt-1">
                                    <span className="text-slate-400">Intra-Day Transit Distance</span>
                                    <span className="font-mono font-semibold text-white">
                                        {totalTransitKm > 0 ? `${totalTransitKm.toFixed(1)} km` : 'Geo-clustered'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Est. Total Walking/Transit</span>
                                    <span className="font-mono font-semibold text-white">
                                        {totalTransitMinutes > 0 ? `${totalTransitMinutes} mins` : '< 25 mins/day'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">2-Opt Distance Saved</span>
                                    <span className="font-mono font-semibold text-emerald-300">
                                        {savedKm > 0 ? `-${savedKm} km zig-zagging` : 'Optimal sequence'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Mapped Dining Spots</span>
                                    <span className="font-mono font-semibold text-amber-300">
                                        {points.filter(p => p.type === 'restaurant').length} restaurants
                                    </span>
                                </div>
                            </div>
                        </div>

                        {selectedDay !== null && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDay(null);
                                    setFocusedPoint(null);
                                }}
                                className="w-full py-2 rounded-xl btn-apple-glass text-xs font-semibold text-sky-300 hover:text-white"
                            >
                                Reset Filter · Show All {uniqueDays.length} Days
                            </button>
                        )}
                    </div>

                    {/* Interactive Day-by-Day Step-by-Step Route Inspector */}
                    <div className="lg:col-span-2 apple-glass-card rounded-2xl p-5">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-sky-300" />
                                Interactive Day-by-Day Route Inspector
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400">
                                Tap any stop to focus on map
                            </span>
                        </div>

                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                            {uniqueDays.map(dayNum => {
                                const dayActs = activityPoints.filter(p => p.day === dayNum);
                                const dayObj = itinerary?.days?.find((d: any) => d.day === dayNum);
                                const isSelected = selectedDay === dayNum;
                                return (
                                    <div
                                        key={dayNum}
                                        className={`p-3.5 rounded-xl border transition-all ${
                                            isSelected
                                                ? 'bg-sky-500/10 border-sky-400/40'
                                                : 'bg-[#0b0c0f]/60 border-white/[0.08] hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDay(isSelected ? null : dayNum)}
                                                className="flex items-center gap-2 text-left"
                                            >
                                                <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-bold flex items-center justify-center">
                                                    {dayNum}
                                                </span>
                                                <div>
                                                    <span className="text-xs font-bold text-white block">
                                                        Day {dayNum}: {dayObj?.neighborhood || dayObj?.areaFocus || dayObj?.theme}
                                                    </span>
                                                    {dayObj?.weekday && (
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {dayObj.weekday}{dayObj.date ? ` · ${dayObj.date}` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            <a
                                                href={buildGoogleMapsDayUrl(dayActs)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-[11px] font-semibold text-sky-300 transition-colors"
                                            >
                                                <span>Open Day Route</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {dayActs.map((act, idx) => (
                                                <div key={idx} className="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedDay(dayNum);
                                                            setFocusedPoint({
                                                                lat: act.lat,
                                                                lng: act.lng,
                                                                title: act.title,
                                                                day: dayNum,
                                                            });
                                                        }}
                                                        className="inline-flex items-center gap-1.5 text-xs bg-white/[0.06] hover:bg-sky-500/20 border border-white/[0.08] hover:border-sky-400/40 px-2.5 py-1 rounded-full text-slate-200 hover:text-white transition-all"
                                                    >
                                                        <span className="text-[10px] font-mono font-bold text-sky-300">#{act.id}</span>
                                                        <span className="truncate max-w-[150px]">{act.title}</span>
                                                        {act.rating ? (
                                                            <span className="text-[10px] text-amber-300">★{act.rating}</span>
                                                        ) : null}
                                                    </button>
                                                    {idx < dayActs.length - 1 && (
                                                        <span className="text-[10px] font-mono text-slate-400 px-1 flex items-center gap-0.5">
                                                            {act.transitToNextMinutes
                                                                ? `→ ${act.transitToNextMinutes}m`
                                                                : '→'}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="apple-glass-card rounded-2xl p-8 text-center">
                    <Route className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-300 mb-1">
                        No coordinates found for this itinerary
                    </p>
                    <p className="text-xs text-slate-400">
                        Try regenerating the plan — the 8-Agent pipeline geocodes all verified venues automatically.
                    </p>
                </div>
            )}
        </div>
    );
}
