'use client';

import React from 'react';
import { Plane, Clock, ArrowRight, ExternalLink, Zap, Star, Shield, Info, TrendingDown } from 'lucide-react';
import type { Flight } from '@/app/api/agent-itinerary/types';

interface Props {
    flights: Flight[];
    origin?: string;
    destination?: string;
}

const TIER_CONFIG = {
    budget: { label: 'Budget', color: '#00FFB3', bg: 'rgba(0,255,179,0.08)', border: 'rgba(0,255,179,0.25)', icon: <TrendingDown className="w-4 h-4" /> },
    value: { label: 'Best Value', color: '#00D4FF', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.25)', icon: <Star className="w-4 h-4" /> },
    premium: { label: 'Premium', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)', icon: <Shield className="w-4 h-4" /> },
};

export default function FlightAnalysisTab({ flights, origin, destination }: Props) {
    if (!flights || flights.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <Plane className="h-10 w-10 text-white/20" />
                </div>
                <p className="text-white/60 font-semibold text-base mb-1">No flight data available</p>
                <p className="text-white/30 text-sm max-w-sm mb-8">
                    Enable <strong className="text-white/50">Flight Search</strong> in Step 8 and enter your departure city to get flight options.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                    {origin && destination ? (
                        <>
                            <a href={`https://www.google.com/travel/flights?q=Flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(destination)}`}
                                target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                                <ExternalLink className="h-4 w-4" /> Google Flights
                            </a>
                            <a href={`https://www.skyscanner.com`} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition-colors">
                                <ExternalLink className="h-4 w-4" /> Skyscanner
                            </a>
                        </>
                    ) : (
                        <a href="https://www.google.com/travel/flights" target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                            <ExternalLink className="h-4 w-4" /> Search Google Flights
                        </a>
                    )}
                </div>
            </div>
        );
    }

    const hasEstimates = flights.some(f => f.isEstimate);
    const cheapest = flights.reduce((a, b) => a.price < b.price ? a : b);

    return (
        <div className="space-y-6">
            {/* Estimate Banner */}
            {hasEstimates && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <Info className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-400 font-semibold text-sm">Price Estimates</p>
                        <p className="text-amber-400/70 text-xs mt-0.5 leading-relaxed">
                            Real-time API unavailable. Prices shown are estimates based on your route and travel dates. Click <strong>"Check Prices"</strong> on any option to see live prices on booking sites.
                        </p>
                    </div>
                </div>
            )}

            {/* Best Price Callout */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00FFB3]/20 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-[#00FFB3]" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-widest text-white/40 font-bold">Lowest Found</p>
                        <p className="text-2xl font-black text-white">${cheapest.price}<span className="text-sm font-normal text-white/40 ml-1">per person</span></p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-white/30 uppercase tracking-widest">Route</p>
                    <p className="text-sm font-bold text-white/70">{cheapest.from} → {cheapest.to}</p>
                    <p className="text-xs text-white/40">{cheapest.date}</p>
                </div>
            </div>

            {/* Flight Cards */}
            <div className="space-y-4">
                {flights.map((flight, idx) => {
                    const tier = (flight.tier || (idx === 0 ? 'budget' : idx === 1 ? 'value' : 'premium')) as keyof typeof TIER_CONFIG;
                    const cfg = TIER_CONFIG[tier] || TIER_CONFIG.value;
                    const links = flight.comparisonLinks;

                    return (
                        <div key={idx}
                            style={{ background: cfg.bg, borderColor: cfg.border }}
                            className="rounded-2xl border p-5 transition-all hover:scale-[1.01] duration-200">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                {/* Left: Airline + Route */}
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0"
                                        style={{ background: `${cfg.color}20`, color: cfg.color }}>
                                        {(flight.airline || 'FL').charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="font-bold text-white text-base truncate">{flight.airline || 'Unknown Airline'}</p>
                                            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                                style={{ background: `${cfg.color}20`, color: cfg.color }}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/50 flex items-center gap-2">
                                            <span className="font-mono">{flight.from}</span>
                                            <ArrowRight className="w-3 h-3" />
                                            <span className="font-mono">{flight.to}</span>
                                            {flight.cabin && <span className="text-[10px] uppercase tracking-wider text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">{flight.cabin}</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Middle: Flight Details */}
                                <div className="flex items-center gap-6 text-center">
                                    {flight.departureTime && (
                                        <div>
                                            <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Departs</p>
                                            <p className="font-mono font-bold text-white">{flight.departureTime}</p>
                                        </div>
                                    )}
                                    {flight.duration && (
                                        <div>
                                            <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Duration</p>
                                            <p className="font-mono text-white/80 text-sm flex items-center gap-1">
                                                <Clock className="w-3 h-3" />{flight.duration}
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Stops</p>
                                        <p className="font-bold text-sm" style={{ color: flight.stops === 0 ? '#00FFB3' : '#FFB300' }}>
                                            {flight.stops === 0 ? 'Direct ✦' : `${flight.stops} stop`}
                                        </p>
                                    </div>
                                </div>

                                {/* Right: Price + CTA */}
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-3xl font-black" style={{ color: cfg.color }}>${flight.price}</p>
                                        <p className="text-xs text-white/30">per person{flight.isEstimate ? ' (est.)' : ''}</p>
                                    </div>
                                    <a href={flight.bookingUrl || links?.googleFlights || 'https://www.google.com/travel/flights'} target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                                        style={{ background: cfg.color, color: '#000' }}>
                                        Check Prices <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>

                            {/* Comparison Links Row */}
                            {links && (
                                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2">
                                    <p className="text-xs text-white/30 mr-1">Also compare:</p>
                                    {links.googleFlights && (
                                        <a href={links.googleFlights} target="_blank" rel="noreferrer" className="text-xs text-white/40 hover:text-white/70 underline transition-colors">Google Flights</a>
                                    )}
                                    {links.skyscanner && (
                                        <a href={links.skyscanner} target="_blank" rel="noreferrer" className="text-xs text-white/40 hover:text-white/70 underline transition-colors">Skyscanner</a>
                                    )}
                                    {links.kayak && (
                                        <a href={links.kayak} target="_blank" rel="noreferrer" className="text-xs text-white/40 hover:text-white/70 underline transition-colors">Kayak</a>
                                    )}
                                    <span className="text-xs text-white/20">·</span>
                                    <p className="text-[10px] text-white/20">{flight.source} {flight.isEstimate ? '— price estimate' : '— live price'}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pro Tips */}
            <div className="p-4 rounded-2xl bg-white/3 border border-white/5">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#00FFB3]" /> Flight Tips
                </p>
                <ul className="space-y-1.5">
                    {[
                        'Book 6-8 weeks in advance for best prices',
                        'Tuesday & Wednesday departures are usually cheapest',
                        'Enable price alerts on Google Flights to track drops',
                        'Consider nearby airports for significant savings',
                    ].map((tip, i) => (
                        <li key={i} className="text-xs text-white/40 flex items-start gap-2">
                            <span className="text-[#00FFB3] flex-shrink-0 mt-0.5">›</span> {tip}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
