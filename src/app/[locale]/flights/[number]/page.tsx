/**
 * /flights/BA123 — flight page for "BA123 flight status" searches.
 * Uses free data only (usual route from adsbdb, live position from adsb.lol), so crawler
 * traffic never spends paid flight-status credits. Live alerts are offered via tracking.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { ArrowRight, Bell, Plane, Radio, Scale } from 'lucide-react';
import { callsignsForFlightNumber, parseFlightNumber, airlineName } from '@/lib/airlines';
import { getFlightDetails, searchAircraft } from '@/lib/flights';
import { normalizeFlightNumber } from '@/lib/flight-status/types';
import { familyForCode } from '@/lib/aircraft-types';
import { distanceNm } from '@/components/flights/geo';
import { checkRoute } from '@/lib/route-check';
import { jsonLdScript } from '@/lib/seo';

export const revalidate = 300;

async function load(raw: string) {
    const parsed = parseFlightNumber(raw);
    if (!parsed) return null;
    const number = normalizeFlightNumber(raw);
    const callsigns = await callsignsForFlightNumber(number);
    const callsign = callsigns[0] ?? null;
    const [details, live] = await Promise.all([
        callsign ? getFlightDetails(callsign, null).catch(() => null) : Promise.resolve(null),
        searchAircraft(number).catch(() => []),
    ]);
    const airborne = live.find(a => !a.ground) ?? live[0] ?? null;
    const route = details?.route ?? null;
    const check = route && airborne ? checkRoute({ origin: route.origin, destination: route.destination, aircraft: airborne }) : null;
    return { number, callsign, route, airborne, check, airline: route?.airline?.name ?? airlineName(parsed.airline) };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; number: string }> }): Promise<Metadata> {
    const { locale, number } = await params;
    const data = await load(decodeURIComponent(number));
    if (!data) return {};
    const r = data.route;
    const title = `${data.number} flight status${r ? `: ${r.origin.iata ?? r.origin.icao} to ${r.destination.iata ?? r.destination.icao}` : ''}${data.airline ? ` (${data.airline})` : ''}`;
    const description = `Live position, route and delay alerts for ${data.airline ? `${data.airline} ` : ''}flight ${data.number}${r ? ` from ${r.origin.city ?? r.origin.name} to ${r.destination.city ?? r.destination.name}` : ''}.`;
    return { title, description, alternates: { canonical: `/${locale}/flights/${data.number}` }, openGraph: { title, description } };
}

export default async function FlightNumberPage({ params }: { params: Promise<{ locale: string; number: string }> }) {
    const { number } = await params;
    const data = await load(decodeURIComponent(number));
    if (!data) notFound();
    const { route, airborne, check } = data;
    const distanceKm = route ? Math.round(distanceNm(route.origin.lat, route.origin.lon, route.destination.lat, route.destination.lon) * 1.852) : null;
    const family = familyForCode(airborne?.type);

    const jsonLd = route ? {
        '@context': 'https://schema.org',
        '@type': 'Flight',
        flightNumber: data.number,
        provider: data.airline ? { '@type': 'Airline', name: data.airline, iataCode: route.airline?.iata ?? undefined } : undefined,
        departureAirport: { '@type': 'Airport', name: route.origin.name, iataCode: route.origin.iata ?? undefined },
        arrivalAirport: { '@type': 'Airport', name: route.destination.name, iataCode: route.destination.iata ?? undefined },
    } : null;

    const card = 'apple-glass-card rounded-3xl p-5 sm:p-6';
    return (
        <main className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6">
            {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />}
            <div className="eyebrow text-slate-500">{data.airline ?? 'Flight'}{data.callsign && data.callsign !== data.number ? ` · callsign ${data.callsign}` : ''}</div>
            <h1 className="mt-2 font-heading text-5xl text-slate-100">{data.number}</h1>

            {route ? (
                <section className={`${card} mt-6`}>
                    <div className="flex items-start justify-between gap-4">
                        <Link href={route.origin.iata ? (`/airports/${route.origin.iata}` as any) : ('/airports' as any)} className="min-w-0 hover:opacity-80">
                            <div className="font-heading text-4xl text-slate-100">{route.origin.iata ?? route.origin.icao}</div>
                            <div className="truncate text-sm text-slate-400">{route.origin.city ?? route.origin.name}</div>
                        </Link>
                        <div className="mt-3 flex flex-1 items-center gap-2 text-slate-500">
                            <span className="h-px flex-1 bg-white/[0.1]" /><Plane className="h-4 w-4 text-sunrise-300" /><span className="h-px flex-1 bg-white/[0.1]" />
                        </div>
                        <Link href={route.destination.iata ? (`/airports/${route.destination.iata}` as any) : ('/airports' as any)} className="min-w-0 text-right hover:opacity-80">
                            <div className="font-heading text-4xl text-slate-100">{route.destination.iata ?? route.destination.icao}</div>
                            <div className="truncate text-sm text-slate-400">{route.destination.city ?? route.destination.name}</div>
                        </Link>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                        Usual route for this flight{distanceKm ? ` · ${distanceKm.toLocaleString('en')} km` : ''}. Schedules can change on the day{check?.confidence === 'unverified' ? '; today the aircraft flying this number is not on this route' : ''}.
                    </p>
                </section>
            ) : (
                <p className="mt-6 text-sm text-slate-400">We don&apos;t have a published route for {data.number}.</p>
            )}

            <section className={`${card} mt-4`}>
                <div className="eyebrow !text-[10px] text-slate-500">Right now</div>
                {airborne ? (
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-200">
                            {airborne.ground ? 'On the ground' : `In the air at ${airborne.alt?.toLocaleString('en') ?? '—'} ft, ${Math.round((airborne.speed ?? 0) * 1.852)} km/h`}
                            {family || airborne.type ? ` · ${family?.name ?? airborne.type}` : ''}{airborne.reg ? ` (${airborne.reg})` : ''}
                        </p>
                        <Link href={`/flights?flight=${encodeURIComponent(data.number)}` as any} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] px-4 py-2 text-xs text-slate-200 hover:text-white">
                            <Radio className="h-3.5 w-3.5" /> Follow on the live map
                        </Link>
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-slate-400">{data.number} isn&apos;t in the air right now. Track it to get an email when it&apos;s delayed, changes gate or is cancelled.</p>
                )}
            </section>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Link href={`/dashboard?tab=flights&flight=${encodeURIComponent(data.number)}` as any} className={`${card} group block`}>
                    <Bell className="h-5 w-5 text-sunrise-300" />
                    <h2 className="mt-2 font-heading text-2xl text-slate-100">Get delay alerts</h2>
                    <p className="mt-1 text-xs text-slate-400">Emails for delays, gate and terminal changes, cancellations and aircraft swaps.</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs text-sunrise-300">Track {data.number} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                </Link>
                <Link href={`/compensation?from=${route?.origin.iata ?? ''}&to=${route?.destination.iata ?? ''}&airline=${route?.airline?.iata ?? ''}` as any} className={`${card} group block`}>
                    <Scale className="h-5 w-5 text-sunrise-300" />
                    <h2 className="mt-2 font-heading text-2xl text-slate-100">Delayed or cancelled?</h2>
                    <p className="mt-1 text-xs text-slate-400">Check if you can claim up to €600 under EU261 or UK261.</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs text-sunrise-300">Check compensation <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                </Link>
            </div>
        </main>
    );
}
