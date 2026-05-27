'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Navigation, Maximize2, Layers, Route, MapPin } from 'lucide-react';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || '';

export interface MapPoint {
    id: number | null;
    lat: number;
    lng: number;
    title: string;
    description: string;
    day: number;
    type: 'activity' | 'restaurant' | 'experience';
    url?: string;
    time?: string;
}

interface Props {
    points: MapPoint[];
}

// Day palette — each day gets a distinct color for its markers + route segment
const DAY_COLORS = [
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#3b82f6', // blue
    '#a855f7', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#84cc16', // lime
];

function getDayColor(day: number) {
    return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}

function markerSvg(label: string, color: string, isRestaurant = false, isExperience = false): string {
    const icon = isRestaurant ? '🍴' : isExperience ? '✦' : label;
    const bg = isRestaurant ? '#f97316' : isExperience ? '#a855f7' : color;
    return `
        <div style="
            background: ${bg};
            width: 32px; height: 32px;
            border-radius: 50% 50% 50% 4px;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        " onmouseover="this.style.transform='rotate(-45deg) scale(1.15)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.2)';" 
          onmouseout="this.style.transform='rotate(-45deg) scale(1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';">
            <span style="
                transform: rotate(45deg);
                font-size: ${isRestaurant || isExperience ? '13px' : '10px'};
                font-weight: 800;
                color: white;
                line-height: 1;
                user-select: none;
            ">${icon}</span>
        </div>
    `;
}

declare global {
    interface Window {
        google: any;
        initGoogleMapsCallback: () => void;
    }
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: Array<() => void> = [];

function loadGoogleMaps(apiKey: string): Promise<void> {
    return new Promise((resolve) => {
        if (scriptLoaded && window.google && window.google.maps) { resolve(); return; }
        loadCallbacks.push(resolve);
        if (scriptLoading) return;
        scriptLoading = true;
        window.initGoogleMapsCallback = () => {
            scriptLoaded = true;
            scriptLoading = false;
            loadCallbacks.forEach(cb => cb());
            loadCallbacks.length = 0;
        };
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsCallback&libraries=geometry,marker`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    });
}

export default function RoadmapMap({ points }: Props) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const polylinesRef = useRef<any[]>([]);
    const infoWindowRef = useRef<any>(null);
    
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeDay, setActiveDay] = useState<number | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');

    const uniqueDays = useMemo(() => {
        return Array.from(new Set(points.filter(p => p.type === 'activity').map(p => p.day))).sort((a, b) => a - b);
    }, [points]);
    
    const activityCount = useMemo(() => points.filter(p => p.type === 'activity').length, [points]);

    // ── Initialize Google Map ──────────────────────────────────────────────────
    const initMap = useCallback(async () => {
        if (!mapContainer.current || !GOOGLE_MAPS_KEY) return;
        await loadGoogleMaps(GOOGLE_MAPS_KEY);
        
        const google = window.google;
        if (!google || !google.maps) return;

        // Prevent multiple initializations
        if (mapRef.current) return;

        const center = points.length > 0
            ? { lat: points[0].lat, lng: points[0].lng }
            : { lat: 35.6762, lng: 139.6503 }; // Tokyo fallback

        mapRef.current = new google.maps.Map(mapContainer.current, {
            center,
            zoom: 13,
            mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
            mapTypeId: 'roadmap', // Initial style
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
                { elementType: 'geometry', stylers: [{ color: '#f5f7fa' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
                { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8ff' }] },
                { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
                { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d4edda' }] },
                { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
            ],
        });

        infoWindowRef.current = new google.maps.InfoWindow();
        setIsLoaded(true);
    }, [points]);

    // ── Render markers + route lines ──────────────────────────────────────────
    const renderMarkers = useCallback(() => {
        const google = window.google;
        if (!mapRef.current || !google || !google.maps) return;

        // Clear old markers and polylines
        markersRef.current.forEach(m => {
            if (typeof m.setMap === 'function') {
                m.setMap(null);
            } else {
                m.map = null;
            }
        });
        polylinesRef.current.forEach(p => p && p.setMap && p.setMap(null));
        markersRef.current = [];
        polylinesRef.current = [];

        const visiblePoints = activeDay
            ? points.filter(p => p.day === activeDay)
            : points;

        const bounds = new google.maps.LatLngBounds();
        let activitySeq = 1;

        // Group activities by day for route lines
        const activitiesByDay: Record<number, typeof points> = {};
        points.filter(p => p.type === 'activity').forEach(p => {
            if (!activitiesByDay[p.day]) activitiesByDay[p.day] = [];
            activitiesByDay[p.day].push(p);
        });

        // Draw day route polylines
        const directionsService = new google.maps.DirectionsService();
        const daysToRender = activeDay ? [activeDay] : uniqueDays;
        
        daysToRender.forEach((day, index) => {
            const dayActivities = activitiesByDay[day] || [];
            if (dayActivities.length < 2) return;

            const origin = { lat: dayActivities[0].lat, lng: dayActivities[0].lng };
            const destination = { lat: dayActivities[dayActivities.length - 1].lat, lng: dayActivities[dayActivities.length - 1].lng };
            const waypoints = dayActivities.slice(1, -1).map(p => ({
                location: { lat: p.lat, lng: p.lng },
                stopover: true
            }));

            directionsService.route({
                origin,
                destination,
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING
            }, (response: any, status: string) => {
                if (status === 'OK') {
                    const directionsRenderer = new google.maps.DirectionsRenderer({
                        map: mapRef.current,
                        directions: response,
                        suppressMarkers: true,
                        preserveViewport: true,
                        polylineOptions: {
                            strokeColor: getDayColor(day),
                            strokeOpacity: 0.9,
                            strokeWeight: 5,
                        }
                    });
                    polylinesRef.current.push(directionsRenderer);
                } else {
                    const path = dayActivities.map(p => ({ lat: p.lat, lng: p.lng }));
                    const polyline = new google.maps.Polyline({
                        path,
                        geodesic: true,
                        strokeColor: getDayColor(day),
                        strokeOpacity: 0.9,
                        strokeWeight: 5,
                        map: mapRef.current,
                    });
                    polylinesRef.current.push(polyline);
                }
            });

            // If "All" view, connect end of this day to start of next day with a dashed line
            if (!activeDay && index < daysToRender.length - 1) {
                const nextDay = daysToRender[index + 1];
                const nextDayActivities = activitiesByDay[nextDay] || [];
                if (nextDayActivities.length > 0) {
                    const connectionPath = [
                        { lat: dayActivities[dayActivities.length - 1].lat, lng: dayActivities[dayActivities.length - 1].lng },
                        { lat: nextDayActivities[0].lat, lng: nextDayActivities[0].lng }
                    ];
                    const connectionLine = new google.maps.Polyline({
                        path: connectionPath,
                        geodesic: true,
                        strokeColor: '#94a3b8', // Cool slate for transitions
                        strokeOpacity: 0.6,
                        strokeWeight: 2,
                        icons: [{
                            icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
                            offset: '0',
                            repeat: '10px'
                        }],
                        map: mapRef.current,
                    });
                    polylinesRef.current.push(connectionLine);
                }
            }
        });

        // Place markers
        visiblePoints.forEach((point) => {
            const isActivity = point.type === 'activity';
            const isRestaurant = point.type === 'restaurant';
            const isExp = point.type === 'experience';
            const dayColor = getDayColor(point.day);
            const seqLabel = isActivity ? String(activitySeq++) : '';

            const el = document.createElement('div');
            el.innerHTML = markerSvg(seqLabel, dayColor, isRestaurant, isExp);
            el.style.cssText = 'position:absolute;';

            const marker = google.maps.marker?.AdvancedMarkerElement
                ? new google.maps.marker.AdvancedMarkerElement({
                    position: { lat: point.lat, lng: point.lng },
                    map: mapRef.current,
                    content: el,
                    title: point.title,
                })
                : new google.maps.Marker({
                    position: { lat: point.lat, lng: point.lng },
                    map: mapRef.current,
                    label: isActivity ? { text: seqLabel, color: 'white', fontWeight: 'bold', fontSize: '11px' } : undefined,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: isActivity ? 14 : 10,
                        fillColor: isRestaurant ? '#f97316' : isExp ? '#a855f7' : dayColor,
                        fillOpacity: 1,
                        strokeColor: 'white',
                        strokeWeight: 2.5,
                    },
                    title: point.title,
                    zIndex: isActivity ? 10 : 5,
                });

            const infoContent = `
                <div style="
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    padding: 6px 2px; max-width: 240px;
                ">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                        <span style="
                            background:${isRestaurant ? '#f97316' : isExp ? '#a855f7' : dayColor};
                            color:white; font-size:9px; font-weight:700;
                            padding:2px 8px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;
                        ">Day ${point.day}${isActivity ? ' · Stop ' + (activitySeq - 1) : isRestaurant ? ' · Dining' : ' · Experience'}</span>
                        ${point.time ? `<span style="font-size:10px;color:#9ca3af;">${point.time}</span>` : ''}
                    </div>
                    <h3 style="margin:0 0 6px;font-size:14px;font-weight:700;color:#111827;line-height:1.3;">${point.title}</h3>
                    <p style="margin:0 0 12px;font-size:12px;color:#6b7280;line-height:1.5;
                        display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">
                        ${point.description}
                    </p>
                    <a href="${point.url || `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`}"
                       target="_blank" rel="noreferrer"
                       style="
                           display:flex;align-items:center;justify-content:center;gap:6px;
                           padding:8px 12px; border-radius:8px; text-decoration:none;
                           background:${isRestaurant ? '#fff7ed' : isExp ? '#faf5ff' : '#eff6ff'};
                           color:${isRestaurant ? '#ea580c' : isExp ? '#7c3aed' : '#2563eb'};
                           font-size:12px;font-weight:600;border:1px solid ${isRestaurant ? '#fed7aa' : isExp ? '#e9d5ff' : '#bfdbfe'};
                       ">
                        🗺️ Navigate in Google Maps
                    </a>
                </div>`;

            const addClickListener = (target: any) => {
                google.maps.event.addListener(target, 'click', () => {
                    infoWindowRef.current.setContent(infoContent);
                    infoWindowRef.current.open(mapRef.current, marker);
                });
            };

            addClickListener(marker);
            markersRef.current.push(marker);
            bounds.extend({ lat: point.lat, lng: point.lng });
        });

        if (!bounds.isEmpty()) {
            mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
            // Don't over-zoom for single point
            const listener = google.maps.event.addListenerOnce(mapRef.current, 'bounds_changed', () => {
                if (mapRef.current.getZoom() > 16) mapRef.current.setZoom(16);
            });
        }
    }, [points, activeDay, uniqueDays]);

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        initMap();
    }, [initMap]);

    useEffect(() => {
        if (isLoaded) renderMarkers();
    }, [isLoaded, renderMarkers]);

    // Map style switch
    useEffect(() => {
        if (mapRef.current) mapRef.current.setMapTypeId(mapStyle);
    }, [mapStyle]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            markersRef.current.forEach(m => {
                if (m && typeof m.setMap === 'function') {
                    m.setMap(null);
                } else if (m) {
                    m.map = null;
                }
            });
            polylinesRef.current.forEach(p => p && p.setMap && p.setMap(null));
        };
    }, []);

    if (!GOOGLE_MAPS_KEY) {
        return (
            <div className="w-full h-96 flex flex-col items-center justify-center bg-muted/30 rounded-2xl border border-dashed border-border/60 gap-3">
                <MapPin className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm font-medium">Map not configured</p>
                <p className="text-muted-foreground/60 text-xs">Add NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY to .env.local</p>
            </div>
        );
    }

    if (!points || points.length === 0) {
        return (
            <div className="w-full h-96 flex flex-col items-center justify-center bg-muted/30 rounded-2xl border border-dashed border-border/60 gap-3">
                <Route className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm font-medium">No location data for this itinerary</p>
                <p className="text-muted-foreground/60 text-xs">Generate a new plan to see the roadmap</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-0 ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'rounded-2xl overflow-hidden border border-border/40 shadow-lg'}`}>
            {/* ── Top Control Bar ── */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-background/95 backdrop-blur-sm border-b border-border/30 gap-3 flex-wrap">
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Navigation className="w-3.5 h-3.5 text-primary" />
                        Trip Roadmap
                    </span>
                    <span>{activityCount} stops</span>
                    <span>{uniqueDays.length} days</span>
                </div>

                {/* Day Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => setActiveDay(null)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            activeDay === null
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                        All
                    </button>
                    {uniqueDays.map(day => (
                        <button
                            key={day}
                            onClick={() => setActiveDay(activeDay === day ? null : day)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                                activeDay === day
                                    ? 'text-white shadow-sm border-transparent'
                                    : 'bg-background text-muted-foreground border-border/40 hover:border-border'
                            }`}
                            style={activeDay === day ? { background: getDayColor(day), borderColor: getDayColor(day) } : {}}
                        >
                            Day {day}
                        </button>
                    ))}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1.5">
                    {/* Map style toggle */}
                    <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
                        {(['roadmap', 'satellite', 'terrain'] as const).map(style => (
                            <button
                                key={style}
                                onClick={() => setMapStyle(style)}
                                className={`px-2 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                                    mapStyle === style
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {style === 'roadmap' ? 'Map' : style === 'satellite' ? 'Sat' : 'Terrain'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsFullscreen(f => !f)}
                        className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
                        title="Toggle fullscreen"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── Map Canvas ── */}
            <div className={`relative ${isFullscreen ? 'flex-1' : 'h-[520px]'}`}>
                <div ref={mapContainer} className="absolute inset-0" />

                {/* Loading overlay */}
                {!isLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/40 backdrop-blur-sm gap-3 z-10">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground font-medium">Loading map...</p>
                    </div>
                )}

                {/* Day color legend overlay */}
                {isLoaded && (
                    <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl border border-border/40 p-3 shadow-lg max-h-52 overflow-y-auto">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Layers className="w-3 h-3" /> Route Legend
                        </p>
                        <div className="space-y-1.5">
                            {uniqueDays.map(day => {
                                const count = points.filter(p => p.type === 'activity' && p.day === day).length;
                                return (
                                    <button
                                        key={day}
                                        onClick={() => setActiveDay(activeDay === day ? null : day)}
                                        className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-lg transition-all ${
                                            activeDay === day ? 'bg-muted' : 'hover:bg-muted/50'
                                        }`}
                                    >
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: getDayColor(day) }} />
                                        <span className="text-xs font-medium text-foreground">Day {day}</span>
                                        <span className="text-[10px] text-muted-foreground ml-auto">{count} stops</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#f97316]" />
                                <span className="text-[10px] text-muted-foreground">Restaurants</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#a855f7]" />
                                <span className="text-[10px] text-muted-foreground">Experiences</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

