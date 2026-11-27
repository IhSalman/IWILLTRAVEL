'use client';

import React from 'react';
import { Hotel, Star, MapPin, ExternalLink, Wifi, Coffee, Dumbbell, Waves, Info, TrendingDown, SparklesIcon } from 'lucide-react';
import type { Hotel as HotelType } from '@/app/api/agent-itinerary/types';

interface Props {
    hotels: HotelType[];
    destination?: string;
    checkIn?: string;
    checkOut?: string;
}

const TIER_CONFIG = {
    budget: { label: 'Budget', color: '#80ad88', bg: 'rgba(0,255,179,0.06)', border: 'rgba(0,255,179,0.2)', stars: 2 },
    'mid-range': { label: 'Best Value', color: '#f3b87f', bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.2)', stars: 3 },
    luxury: { label: 'Luxury', color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.2)', stars: 5 },
};

const TAG_CONFIG = {
    cheapest: { label: '🏷️ Cheapest', color: '#80ad88' },
    'best-value': { label: '⭐ Best Value', color: '#f3b87f' },
    'best-rated': { label: '🏆 Top Rated', color: '#ee9d57' },
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
    'WiFi': <Wifi className="w-3 h-3" />,
    'Breakfast': <Coffee className="w-3 h-3" />,
    'Breakfast included': <Coffee className="w-3 h-3" />,
    'Breakfast available': <Coffee className="w-3 h-3" />,
    'Gym': <Dumbbell className="w-3 h-3" />,
    'Pool': <Waves className="w-3 h-3" />,
    'Spa': <SparklesIcon className="w-3 h-3" />,
};

export default function HotelAnalysisTab({ hotels, destination, checkIn, checkOut }: Props) {
    if (!hotels || hotels.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <Hotel className="h-10 w-10 text-white/20" />
                </div>
                <p className="text-white/60 font-semibold text-base mb-1">No hotel data available</p>
                <p className="text-white/30 text-sm max-w-sm mb-8">
                    Enable <strong className="text-white/50">Hotel Search</strong> in Step 8 to get curated accommodation options for your trip.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <a href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination || 'your destination')}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 transition-colors">
                        <ExternalLink className="h-4 w-4" /> Search Booking.com
                    </a>
                    <a href="https://www.airbnb.com" target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors">
                        <ExternalLink className="h-4 w-4" /> Search Airbnb
                    </a>
                </div>
            </div>
        );
    }

    const hasEstimates = hotels.some(h => h.isEstimate);
    const avgPrice = hotels.reduce((sum, h) => sum + h.price, 0) / hotels.length;
    const cheapest = hotels.reduce((a, b) => a.price < b.price ? a : b);

    return (
        <div className="space-y-6">
            {/* Estimate Banner */}
            {hasEstimates && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <Info className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-400 font-semibold text-sm">Price Estimates</p>
                        <p className="text-amber-400/70 text-xs mt-0.5 leading-relaxed">
                            These are price estimates for your travel dates. Click <strong>"Book Now"</strong> on any option to see live availability and confirmed rates on booking platforms.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Options</p>
                    <p className="text-2xl font-black text-white">{hotels.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">From</p>
                    <p className="text-2xl font-black text-[#80ad88]">${cheapest.price}<span className="text-sm font-normal text-white/40">/night</span></p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Avg/Night</p>
                    <p className="text-2xl font-black text-white">${avgPrice.toFixed(0)}</p>
                </div>
            </div>

            {/* Hotel Cards */}
            <div className="space-y-4">
                {hotels.map((hotel, idx) => {
                    const tier = (hotel.tier || (idx === 0 ? 'budget' : idx === 1 ? 'mid-range' : 'luxury')) as keyof typeof TIER_CONFIG;
                    const cfg = TIER_CONFIG[tier] || TIER_CONFIG['mid-range'];
                    const tagCfg = hotel.tag && (hotel.tag in TAG_CONFIG) ? TAG_CONFIG[hotel.tag as keyof typeof TAG_CONFIG] : null;
                    const links = hotel.comparisonLinks;
                    const stars = hotel.stars || cfg.stars;

                    return (
                        <div key={idx}
                            style={{ background: cfg.bg, borderColor: cfg.border }}
                            className="rounded-2xl border overflow-hidden transition-all hover:scale-[1.005] duration-200">
                            <div className="flex flex-col sm:flex-row">
                                {/* Image Placeholder */}
                                {hotel.imageUrl ? (
                                    <div className="w-full sm:w-48 h-36 sm:h-auto flex-shrink-0">
                                        <img src={hotel.imageUrl} alt={hotel.name} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-full sm:w-36 h-28 sm:h-auto flex-shrink-0 flex items-center justify-center"
                                        style={{ background: `${cfg.color}10` }}>
                                        <Hotel className="w-10 h-10" style={{ color: `${cfg.color}40` }} />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col justify-between gap-3 min-w-0">
                                    <div>
                                        {/* Header Row */}
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className="font-bold text-white text-base leading-tight truncate">{hotel.name}</h3>
                                                    {tagCfg && (
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                                            style={{ background: `${tagCfg.color}20`, color: tagCfg.color }}>
                                                            {tagCfg.label}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Stars */}
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star key={i} className={`w-3 h-3 ${i < stars ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`} />
                                                    ))}
                                                    {hotel.rating && (
                                                        <span className="text-xs text-white/40 ml-1">{hotel.rating.toFixed(1)} / 10</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Price */}
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-2xl font-black" style={{ color: cfg.color }}>${hotel.price}</p>
                                                <p className="text-xs text-white/30">per night{hotel.isEstimate ? ' (est.)' : ''}</p>
                                            </div>
                                        </div>

                                        {/* Location + Room */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 mb-3">
                                            {hotel.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {hotel.location}
                                                </span>
                                            )}
                                            {hotel.roomType && (
                                                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{hotel.roomType}</span>
                                            )}
                                            {hotel.source && (
                                                <span className="px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}10`, color: cfg.color }}>
                                                    via {hotel.source}
                                                </span>
                                            )}
                                        </div>

                                        {/* Amenities */}
                                        {hotel.amenities && hotel.amenities.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {hotel.amenities.slice(0, 6).map((a, i) => (
                                                    <span key={i} className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                                                        {AMENITY_ICONS[a] || null} {a}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* CTAs */}
                                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
                                        <a href={hotel.bookingUrl || links?.bookingCom || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.city)}`}
                                            target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                                            style={{ background: cfg.color, color: '#000' }}>
                                            Book Now <ExternalLink className="w-3 h-3" />
                                        </a>
                                        {links && (
                                            <>
                                                {links.agoda && hotel.source !== 'Airbnb' && (
                                                    <a href={links.agoda} target="_blank" rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 transition-all">
                                                        Agoda
                                                    </a>
                                                )}
                                                {links.hotelscom && (
                                                    <a href={links.hotelscom} target="_blank" rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 transition-all">
                                                        Hotels.com
                                                    </a>
                                                )}
                                                <a href={links.tripadvisor || `https://www.tripadvisor.com/Search?q=${encodeURIComponent(hotel.city)}+hotels`}
                                                    target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 transition-all">
                                                    TripAdvisor
                                                </a>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Booking Tips */}
            <div className="p-4 rounded-2xl bg-white/3 border border-white/5">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Hotel className="w-3.5 h-3.5 text-[#ee9d57]" /> Booking Tips
                </p>
                <ul className="space-y-1.5">
                    {[
                        'Book refundable rates — you can often find better deals as the date approaches',
                        'Compare on 3+ sites: Booking.com, Agoda, and Hotels.com often have different prices',
                        'Check if the hotel\'s direct website offers a price match guarantee',
                        'Look for stays with free breakfast — it often saves more than you think',
                    ].map((tip, i) => (
                        <li key={i} className="text-xs text-white/40 flex items-start gap-2">
                            <span className="text-[#ee9d57] flex-shrink-0 mt-0.5">›</span> {tip}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
