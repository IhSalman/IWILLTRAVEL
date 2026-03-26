'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Compass } from 'lucide-react';

const RoadmapMap = dynamic(() => import('./RoadmapMap'), { 
    ssr: false, 
    loading: () => (
        <div className="w-full h-[500px] flex items-center justify-center bg-muted/20 animate-pulse rounded-2xl border border-border/50">
            <p className="text-muted-foreground font-medium flex items-center gap-2">
                <Compass className="w-5 h-5 animate-spin text-primary"/> Loading Interactive Map...
            </p>
        </div>
    ) 
});

interface Props {
    itinerary: any;
}

export default function RoadmapTab({ itinerary }: Props) {
    const points: any[] = [];
    
    // Extract points with lat/lng
    if (itinerary?.days) {
        let globalSequence = 1;
        itinerary.days.forEach((day: any) => {
            // Activities
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
                        });
                    }
                });
            }

            // Restaurants
            if (day.dayResources?.whereToEat) {
                day.dayResources.whereToEat.forEach((rest: any) => {
                    if (rest.lat && rest.lng) {
                        points.push({
                            id: null,
                            lat: rest.lat,
                            lng: rest.lng,
                            title: rest.label,
                            description: `Recommended Restaurant for Day ${day.day}`,
                            day: day.day,
                            type: 'restaurant',
                            url: rest.url
                        });
                    }
                });
            }

            // Other Experiences
            if (day.dayResources?.experiences) {
                day.dayResources.experiences.forEach((exp: any) => {
                    if (exp.lat && exp.lng) {
                        points.push({
                            id: null,
                            lat: exp.lat,
                            lng: exp.lng,
                            title: exp.label,
                            description: `Extra Experience for Day ${day.day}`,
                            day: day.day,
                            type: 'experience',
                            url: exp.url
                        });
                    }
                });
            }
        });
    }

    return (
        <div className="space-y-5">
            <Card className="border-border/40 overflow-hidden shadow-sm">
                <div className="p-1">
                    <RoadmapMap points={points} />
                </div>
            </Card>

            {points.length > 0 ? (
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-5">
                        <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                            <Compass className="w-4 h-4" /> Travel Route
                        </h3>
                        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                            This map displays your planned route from start to finish. Follow the numbered markers (1, 2, 3...) to see the chronological path you'll take. 
                        </p>
                        <ul className="text-sm text-foreground/70 space-y-1">
                            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-primary inline-block"></span> Numbered markers: Main itinerary activities</li>
                            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-orange-500 inline-block text-white text-[10px] text-center font-bold">🍴</span> Orange markers: Suggested local restaurants</li>
                            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-purple-500 inline-block text-white text-[10px] text-center font-bold">✨</span> Purple markers: Extra local experiences</li>
                        </ul>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-border/40 bg-muted/30">
                    <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground">Coordinates were not found for the activities in this itinerary to generate an interactive roadmap. Try generating a new plan!</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
