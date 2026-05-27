'use client';

import dynamic from 'next/dynamic';
import { Route, MapPin, Clock, Star, ChevronRight } from 'lucide-react';
import type { MapPoint } from './RoadmapMap';

const RoadmapMap = dynamic(() => import('./RoadmapMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[580px] flex flex-col items-center justify-center bg-muted/20 rounded-2xl border border-border/30 gap-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Loading interactive map...</p>
        </div>
    ),
});

interface Props {
    itinerary: any;
}

export default function RoadmapTab({ itinerary }: Props) {
    const points: MapPoint[] = [];

    // Extract all geocoded points from the itinerary
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
                            title: act.title,
                            description: act.description || act.editorialSummary || '',
                            day: day.day,
                            type: 'activity',
                            time: act.time,
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

    return (
        <div className="space-y-5">
            {/* Map */}
            <RoadmapMap points={points} />

            {/* Stats + Legend row */}
            {points.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Stats Card */}
                    <div className="bg-card border border-border/40 rounded-2xl p-4 flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Route className="w-4 h-4 text-primary" />
                            Trip Overview
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Mapped stops</span>
                                <span className="font-semibold">{geocodedCount} / {totalActivities}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                    className="bg-primary h-1.5 rounded-full transition-all"
                                    style={{ width: `${geocodeRate}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Days covered</span>
                                <span className="font-semibold">{uniqueDays.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Restaurants</span>
                                <span className="font-semibold">{points.filter(p => p.type === 'restaurant').length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Day-by-Day Summary */}
                    <div className="md:col-span-2 bg-card border border-border/40 rounded-2xl p-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                            <MapPin className="w-4 h-4 text-primary" />
                            Day-by-Day Route
                        </h3>
                        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                            {uniqueDays.map(day => {
                                const dayActs = activityPoints.filter(p => p.day === day);
                                return (
                                    <div key={day} className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                                            {day}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap gap-1.5">
                                                {dayActs.map((act, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                                                    >
                                                        <span className="text-[9px] font-bold text-primary">#{act.id}</span>
                                                        <span className="truncate max-w-[120px]">{act.title}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-muted/30 border border-dashed border-border/50 rounded-2xl p-8 text-center">
                    <Route className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                        No coordinates found for this itinerary
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                        Try generating a new plan — the AI will geocode all locations automatically.
                    </p>
                </div>
            )}
        </div>
    );
}
