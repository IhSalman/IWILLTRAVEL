'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Point {
    id: number | null;
    lat: number;
    lng: number;
    title: string;
    description: string;
    day: number;
    type: 'activity' | 'restaurant' | 'experience';
    url?: string;
}

interface Props {
    points: Point[];
}

function MapUpdater({ points }: { points: Point[] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, points]);
    return null;
}

export default function RoadmapMap({ points }: Props) {
    if (!points || points.length === 0) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-muted/30 rounded-2xl border border-border/50">
                <p className="text-muted-foreground font-medium">No coordinate data available to display the map.</p>
            </div>
        );
    }

    const defaultCenter: [number, number] = [points[0].lat, points[0].lng];
    
    // Only connect the main activities with the dashed line, ordered by sequence
    const sequencePoints = points.filter(p => p.type === 'activity').sort((a, b) => (a.id || 0) - (b.id || 0));
    const polylinePositions: [number, number][] = sequencePoints.map(p => [p.lat, p.lng]);

    // Custom Icon Generators
    const createNumberedIcon = (num: number) => {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-weight: 900; font-size: 14px; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);">${num}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });
    };

    const restaurantIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background-color: #f97316; color: white; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🍴</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
    });

    const experienceIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background-color: #a855f7; color: white; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">✨</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
    });

    return (
        <MapContainer center={defaultCenter} zoom={12} className="w-full h-[500px] z-0 relative rounded-xl">
            {/* Using Voyager tiles for a cleaner, premium look instead of default OSM */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {points.map((point, idx) => {
                let icon;
                let zIndex = 0;
                
                if (point.type === 'restaurant') {
                    icon = restaurantIcon;
                    zIndex = 500;
                }
                else if (point.type === 'experience') {
                    icon = experienceIcon;
                    zIndex = 400;
                }
                else {
                    icon = createNumberedIcon(point.id as number);
                    zIndex = 1000; // activities always on top
                }

                const googleMapsUrl = point.url || `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;

                return (
                    <Marker key={idx} position={[point.lat, point.lng]} icon={icon} zIndexOffset={zIndex}>
                        <Popup>
                            <div className="p-1 max-w-[220px]">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Day {point.day}</p>
                                    {point.type !== 'activity' && (
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">{point.type}</span>
                                    )}
                                </div>
                                <h3 className="font-bold text-sm mb-1.5 leading-tight">{point.title}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">{point.description}</p>
                                
                                <a 
                                    href={googleMapsUrl}
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2.5 py-2 rounded-md transition-colors w-full justify-center"
                                >
                                    <Navigation className="w-3 h-3" />
                                    Navigate in Maps
                                </a>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
            <Polyline 
                positions={polylinePositions} 
                pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '8, 8' }} 
            />
            <MapUpdater points={points} />
        </MapContainer>
    );
}
