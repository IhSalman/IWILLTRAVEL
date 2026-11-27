'use client';

import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import {
    Plane, PlaneLanding, PlaneTakeoff, Crosshair, Loader2, Radio,
    Wind, Thermometer, Eye, Gauge, ArrowRight, AlertTriangle, ShieldCheck, ShieldQuestion, Info,
} from 'lucide-react';
import { distanceNm } from './geo';
import type { RouteCheck } from '@/lib/route-check';
import { familyForCode } from '@/lib/aircraft-types';
import type { Aircraft, Airport, AirportLive, FlightDetails } from './types';

// ── Formatting helpers ───────────────────────────────────────────────────────

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;
export const countryName = (iso: string) => {
    try { return regionNames?.of(iso) ?? iso; } catch { return iso; }
};

/** "Paris (Roissy-en-France, Val-d'Oise)" → "Paris" */
export const shortCity = (city: string) => city.replace(/\s*\(.*\)\s*/g, '').split(',')[0].trim() || city;

export const fmt = (n: number | null | undefined, unit = '', digits = 0) =>
    n === null || n === undefined ? '—' : `${n.toLocaleString('en', { maximumFractionDigits: digits })}${unit}`;

/** Label shown for an aircraft everywhere: ticket number first, then callsign, registration, hex. */
export const aircraftLabel = (ac: Pick<Aircraft, 'flightNo' | 'callsign' | 'reg' | 'hex'>) =>
    ac.flightNo ?? ac.callsign ?? ac.reg ?? ac.hex;

/** METAR visibility is in statute miles ("6+" / "10+" mean unlimited). */
function formatVisibility(v: string | number | null): string {
    if (v === null || v === undefined || v === '') return '—';
    const plus = typeof v === 'string' && v.endsWith('+');
    const miles = typeof v === 'number' ? v : parseFloat(v);
    if (!Number.isFinite(miles)) return String(v);
    const km = miles * 1.609;
    return `${km >= 10 ? Math.round(km) : km.toFixed(1)}${plus ? '+' : ''} km`;
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <div className="eyebrow !text-[10px] text-slate-500">{label}</div>
            <div className="mt-0.5 text-sm text-slate-100">{value}</div>
        </div>
    );
}

const CONFIDENCE_UI: Record<RouteCheck['confidence'], { label: string; cls: string; icon: ReactNode }> = {
    confirmed: { label: 'Route confirmed', cls: 'bg-emerald-500/15 text-emerald-300', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    likely: { label: 'Route likely', cls: 'bg-sky-500/15 text-sky-300', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    unverified: { label: 'Route not confirmed', cls: 'bg-amber-500/15 text-amber-300', icon: <ShieldQuestion className="h-3.5 w-3.5" /> },
};

// ── Flight panel ─────────────────────────────────────────────────────────────

export function FlightPanel({ live, details, loading, follow, onFollow, routeCheck, lastSeenS, actions }: {
    live: Aircraft | null;
    details: FlightDetails | null;
    loading: boolean;
    follow: boolean;
    onFollow: () => void;
    routeCheck: RouteCheck | null;
    /** Seconds since the last position report, or null when unknown. */
    lastSeenS: number | null;
    /** Extra buttons (e.g. "Track this flight"). */
    actions?: ReactNode;
}) {
    const route = details?.route ?? null;
    const aircraft = details?.aircraft ?? null;
    const trusted = routeCheck?.confidence !== 'unverified';

    let progress: number | null = null;
    if (route && live && trusted) {
        const total = distanceNm(route.origin.lat, route.origin.lon, route.destination.lat, route.destination.lon);
        const left = distanceNm(live.lat, live.lon, route.destination.lat, route.destination.lon);
        if (total > 0) progress = Math.min(1, Math.max(0, 1 - left / total));
    }
    const remainingNm = route && live && trusted ? distanceNm(live.lat, live.lon, route.destination.lat, route.destination.lon) : null;
    const etaMin = remainingNm !== null && live?.speed && live.speed > 80 && !live.ground ? Math.round((remainingNm / live.speed) * 60) : null;

    const vs = live?.vrate ?? null;
    const phase = !live ? null : live.ground ? 'On the ground' : vs !== null && vs > 300 ? 'Climbing' : vs !== null && vs < -300 ? 'Descending' : 'Cruising';
    const family = familyForCode(aircraft?.icaoType ?? live?.type);
    const title = route?.flightNumber ?? live?.flightNo ?? live?.callsign ?? live?.reg ?? live?.hex ?? '—';
    const stale = lastSeenS !== null && lastSeenS > 30;

    return (
        <div>
            {aircraft?.photo && (
                <div className="relative h-40 w-full overflow-hidden sm:rounded-t-3xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={aircraft.photo} alt={`${aircraft.type ?? 'Aircraft'} ${aircraft.registration ?? ''}`} className="h-full w-full object-cover" referrerPolicy="no-referrer"
                        onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                    <span className="absolute bottom-1.5 right-2 text-[10px] text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,.8)]">
                        {aircraft.photoSource === 'planespotters' && aircraft.photoLink ? (
                            <a href={aircraft.photoLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                © {aircraft.photographer ?? 'Photographer'} · Planespotters.net
                            </a>
                        ) : 'Photo: airport-data.com'}
                    </span>
                </div>
            )}
            <div className="space-y-4 p-5">
                <div>
                    <div className="eyebrow text-slate-500">{route?.airline?.name ?? (live?.military ? 'Military' : 'Flight')}</div>
                    <h2 className="mt-1 font-heading text-3xl text-slate-100">{title}</h2>
                    {live?.callsign && live.callsign !== title && <div className="text-xs text-slate-500">Callsign {live.callsign}</div>}
                    {live?.emergency && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs text-rose-300">
                            <AlertTriangle className="h-3.5 w-3.5" /> Emergency: {live.emergency}
                        </div>
                    )}
                </div>

                {loading && !route && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up route…</div>}

                {route ? (
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className={cn('flex items-start justify-between gap-3', !trusted && 'opacity-60')}>
                            <div className="min-w-0">
                                <div className="font-heading text-2xl text-slate-100">{route.origin.iata ?? route.origin.icao}</div>
                                <div className="truncate text-xs text-slate-400">{route.origin.city ?? route.origin.name}</div>
                            </div>
                            <Plane className="mt-2 h-4 w-4 shrink-0 text-sunrise-300" />
                            <div className="min-w-0 text-right">
                                <div className="font-heading text-2xl text-slate-100">{route.destination.iata ?? route.destination.icao}</div>
                                <div className="truncate text-xs text-slate-400">{route.destination.city ?? route.destination.name}</div>
                            </div>
                        </div>
                        {progress !== null && (
                            <div className="mt-3">
                                <div className="h-1 rounded-full bg-white/[0.08]">
                                    <div className="h-1 rounded-full bg-sunrise-300" style={{ width: `${progress * 100}%` }} />
                                </div>
                                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                                    <span>{Math.round(progress * 100)}% flown</span>
                                    <span>{remainingNm !== null ? `${fmt(Math.round(remainingNm * 1.852))} km to go` : ''}{etaMin !== null ? ` · ~${Math.floor(etaMin / 60)}h ${etaMin % 60}m` : ''}</span>
                                </div>
                            </div>
                        )}
                        {routeCheck && (
                            <div className="mt-3 flex items-start gap-2">
                                <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', CONFIDENCE_UI[routeCheck.confidence].cls)}>
                                    {CONFIDENCE_UI[routeCheck.confidence].icon} {CONFIDENCE_UI[routeCheck.confidence].label}
                                </span>
                                <span className="pt-0.5 text-[11px] leading-snug text-slate-500">{routeCheck.reason}.</span>
                            </div>
                        )}
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                            {trusted
                                ? 'Route is the airline’s usual schedule for this flight, checked against the live position.'
                                : 'This is the usual schedule for this callsign, but the aircraft’s position doesn’t match it today, so it isn’t drawn on the map.'}
                        </p>
                    </div>
                ) : !loading && (
                    <p className="text-xs text-slate-500">No published route for this callsign (private, cargo or charter flights often have none).</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <Stat label="Altitude" value={live?.ground ? 'Ground' : fmt(live?.alt, ' ft')} />
                    <Stat label="Speed" value={live?.speed != null ? `${fmt(live.speed, ' kt')} · ${fmt(Math.round(live.speed * 1.852), ' km/h')}` : '—'} />
                    <Stat label="Heading" value={fmt(live?.track, '°')} />
                    <Stat label="Phase" value={phase ? `${phase}${vs && Math.abs(vs) > 300 ? ` ${vs > 0 ? '+' : ''}${fmt(vs)} fpm` : ''}` : '—'} />
                    <Stat label="Aircraft" value={aircraft?.type ?? family?.name ?? live?.type ?? '—'} />
                    <Stat label="Registration" value={aircraft?.registration ?? live?.reg ?? '—'} />
                    <Stat label="Squawk" value={live?.squawk ?? '—'} />
                    <Stat label="Mode S" value={live?.hex ?? '—'} />
                </div>
                {aircraft?.owner && <p className="text-xs text-slate-500">Registered to {aircraft.owner}{aircraft.ownerCountry ? ` · ${aircraft.ownerCountry}` : ''}</p>}
                {(live?.mlat || stale) && (
                    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
                        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                        <span>
                            {live?.mlat && 'Position estimated by ground stations (this aircraft doesn’t broadcast GPS). '}
                            {stale && lastSeenS !== null && `Last position ${lastSeenS}s ago.`}
                        </span>
                    </p>
                )}
                {!live && <p className="text-xs text-amber-300/80">This aircraft is no longer reporting a position.</p>}

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={onFollow}
                        className={cn('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs transition-colors',
                            follow ? 'border-sunrise-300/50 bg-sunrise-300/10 text-sunrise-200' : 'border-white/[0.1] text-slate-300 hover:text-slate-100')}>
                        <Crosshair className="h-3.5 w-3.5" /> {follow ? 'Following' : 'Follow flight'}
                    </button>
                    {actions}
                    {route?.destination.city && trusted && (
                        <Link href={`/plan-trip?destination=${encodeURIComponent(`${route.destination.city}${route.destination.country ? `, ${route.destination.country}` : ''}`)}` as any}
                            className="inline-flex items-center gap-1.5 rounded-full bg-sunrise-300 px-3.5 py-2 text-xs font-medium text-[#0b0c0f] hover:bg-sunrise-200">
                            Plan a trip to {route.destination.city} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Airport panel ────────────────────────────────────────────────────────────

function TrafficList({ title, icon, list, onFlight }: { title: string; icon: ReactNode; list: Aircraft[]; onFlight: (ac: Aircraft) => void }) {
    return (
        <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">{icon} {title} <span className="text-slate-600">({list.length})</span></div>
            {list.length === 0 ? (
                <p className="text-xs text-slate-600">None right now</p>
            ) : (
                <div className="space-y-1">
                    {list.map(ac => (
                        <button key={ac.hex} type="button" onClick={() => onFlight(ac)}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/[0.05]">
                            <span className="font-mono text-slate-200">{aircraftLabel(ac)}</span>
                            <span className="text-slate-500">{ac.type ?? ''} · {fmt(ac.alt, ' ft')}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const CATEGORY_STYLE: Record<string, string> = {
    VFR: 'bg-emerald-500/15 text-emerald-300',
    MVFR: 'bg-sky-500/15 text-sky-300',
    IFR: 'bg-rose-500/15 text-rose-300',
    LIFR: 'bg-fuchsia-500/15 text-fuchsia-300',
};
const CATEGORY_LABEL: Record<string, string> = {
    VFR: 'Good visibility', MVFR: 'Moderate visibility', IFR: 'Low visibility', LIFR: 'Very low visibility',
};

export function AirportPanel({ airport, live, loading, onFlight, onZoom, actions }: {
    airport: Airport; live: AirportLive | null; loading: boolean; onFlight: (ac: Aircraft) => void; onZoom: () => void; actions?: ReactNode;
}) {
    const w = live?.weather;
    const t = live?.traffic;
    return (
        <div className="space-y-4 p-5">
            <div className="pr-8">
                <div className="eyebrow text-slate-500">{airport.size === 1 ? 'Major airport' : 'Airport'}</div>
                <h2 className="mt-1 font-heading text-2xl leading-tight text-slate-100">{airport.name}</h2>
                <div className="mt-1 text-sm text-slate-400">
                    {airport.city}{airport.city ? ', ' : ''}{countryName(airport.country)}
                </div>
                <div className="mt-2 flex gap-2 font-mono text-xs">
                    <span className="rounded-md bg-sunrise-300/10 px-2 py-0.5 text-sunrise-200">IATA {airport.iata}</span>
                    {airport.icao && <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-slate-300">ICAO {airport.icao}</span>}
                </div>
            </div>

            {loading && !live && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading live conditions…</div>}

            {w && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                        <span className="eyebrow !text-[10px] text-slate-500">Weather now</span>
                        {w.category && (
                            <span className={cn('rounded-full px-2 py-0.5 text-[11px]', CATEGORY_STYLE[w.category] ?? 'bg-white/[0.05] text-slate-300')}>
                                {CATEGORY_LABEL[w.category] ?? w.category}
                            </span>
                        )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-200">
                        <div className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-slate-500" /> {fmt(w.tempC, '°C')}</div>
                        <div className="flex items-center gap-2"><Wind className="h-4 w-4 text-slate-500" />
                            {w.windKt === 0 ? 'Calm' : `${typeof w.windDir === 'number' ? `${w.windDir}° ` : w.windDir === 'VRB' ? 'Variable ' : ''}${fmt(w.windKt, ' kt')}${w.gustKt ? ` G${w.gustKt}` : ''}`}
                        </div>
                        <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" /> {formatVisibility(w.visibility)}</div>
                        <div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-slate-500" /> {fmt(w.pressureHpa, ' hPa')}</div>
                    </div>
                    {w.raw && <p className="mt-3 break-words font-mono text-[10px] leading-relaxed text-slate-500">{w.raw}</p>}
                </div>
            )}

            {t && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="eyebrow !text-[10px] text-slate-500">Live traffic</span>
                        <span className="text-[11px] text-slate-500">{t.onGround} on ground · {t.total} within 30 nm</span>
                    </div>
                    <div className="space-y-4">
                        <TrafficList title="Arriving" icon={<PlaneLanding className="h-3.5 w-3.5 text-emerald-300" />} list={t.arriving} onFlight={onFlight} />
                        <TrafficList title="Departing" icon={<PlaneTakeoff className="h-3.5 w-3.5 text-sunrise-300" />} list={t.departing} onFlight={onFlight} />
                    </div>
                </div>
            )}
            {live && !t && <p className="text-xs text-slate-500">Live traffic for this airport is unavailable right now.</p>}

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onZoom}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] px-3.5 py-2 text-xs text-slate-300 hover:text-slate-100">
                    <Radio className="h-3.5 w-3.5" /> Watch this airport
                </button>
                {actions}
                {airport.city && (
                    <Link href={`/plan-trip?destination=${encodeURIComponent(`${shortCity(airport.city)}, ${countryName(airport.country)}`)}` as any}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sunrise-300 px-3.5 py-2 text-xs font-medium text-[#0b0c0f] hover:bg-sunrise-200">
                        Plan a trip to {shortCity(airport.city)} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                )}
            </div>
        </div>
    );
}
