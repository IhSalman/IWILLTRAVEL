/**
 * /airports/LHR — airport guide: live departures & arrivals (when the flight data feed is on),
 * weather, US delay programmes, live traffic, services and links into trip planning.
 * Rendered on demand and refreshed every 10 minutes (ISR).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { ArrowRight, PlaneLanding, PlaneTakeoff, Radio, Thermometer, Wind, AlertTriangle } from 'lucide-react';
import { airportsForCity, getAirport } from '@/lib/airports';
import { getAircraftNear, getAirportWeather } from '@/lib/flights';
import { getFaaDelaysFor } from '@/lib/faa';
import { fetchAirportBoard, flightStatusEnabled } from '@/lib/flight-status/provider';
import { BoardTable } from '@/components/airports/BoardTable';
import { AirportServices } from '@/components/airports/AirportServices';
import { breadcrumbJsonLd, jsonLdScript, absoluteUrl } from '@/lib/seo';

export const revalidate = 600;

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (iso: string) => { try { return regionNames.of(iso) ?? iso; } catch { return iso; } };
const shortCity = (city: string) => city.replace(/\s*\(.*\)\s*/g, '').split(',')[0].trim() || city;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; iata: string }> }): Promise<Metadata> {
    const { locale, iata } = await params;
    const ap = getAirport(iata);
    if (!ap || ap.iata !== iata.toUpperCase()) return {};
    const title = `${ap.name} (${ap.iata}): live departures, arrivals, delays & weather`;
    const description = `Live flight board, delays, weather, lounges and services at ${ap.name}${ap.city ? `, ${shortCity(ap.city)}` : ''}. Track planes around ${ap.iata} in real time.`;
    return {
        title,
        description,
        alternates: { canonical: `/${locale}/airports/${ap.iata}` },
        openGraph: { title, description, url: `/${locale}/airports/${ap.iata}` },
    };
}

export default async function AirportPage({ params }: { params: Promise<{ locale: string; iata: string }> }) {
    const { locale, iata } = await params;
    const ap = getAirport(iata);
    if (!ap || ap.iata !== iata.toUpperCase()) notFound();

    const city = shortCity(ap.city || ap.name);
    const country = countryName(ap.country);
    const [weather, traffic, faa, board] = await Promise.all([
        ap.icao.length === 4 ? getAirportWeather(ap.icao).catch(() => null) : Promise.resolve(null),
        getAircraftNear(ap.lat, ap.lon, 30).catch(() => null),
        ap.country === 'US' ? getFaaDelaysFor(ap.iata).catch(() => []) : Promise.resolve([]),
        flightStatusEnabled() ? fetchAirportBoard(ap.iata, -60, 720).catch(() => null) : Promise.resolve(null),
    ]);

    const now = Date.now();
    const upcoming = <T extends { scheduledUtc: string | null }>(list: T[]) =>
        list.filter(f => !f.scheduledUtc || Date.parse(f.scheduledUtc) > now - 45 * 60_000).slice(0, 25);
    // Same city name AND same country (London UK ≠ London, Ontario).
    const sameCity = airportsForCity(ap.city).filter(a => a.iata !== ap.iata && a.country === ap.country).slice(0, 4);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Airport',
        name: ap.name,
        iataCode: ap.iata,
        icaoCode: ap.icao || undefined,
        url: absoluteUrl(`/${locale}/airports/${ap.iata}`),
        geo: { '@type': 'GeoCoordinates', latitude: ap.lat, longitude: ap.lon },
        address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: ap.country },
    };
    const crumbs = breadcrumbJsonLd([
        { name: 'Airports', path: `/${locale}/airports` },
        { name: `${ap.name} (${ap.iata})`, path: `/${locale}/airports/${ap.iata}` },
    ]);

    const card = 'apple-glass-card rounded-3xl p-5 sm:p-6';
    return (
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(crumbs) }} />

            <nav className="mb-4 text-xs text-slate-500">
                <Link href={'/airports' as any} className="hover:text-slate-300">Airports</Link> <span>/</span> <span className="text-slate-400">{ap.iata}</span>
            </nav>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="eyebrow text-slate-500">{ap.size === 1 ? 'Major airport' : 'Airport'} · {city}, {country}</div>
                    <h1 className="mt-2 font-heading text-4xl leading-[1.05] text-slate-100 sm:text-5xl">{ap.name}</h1>
                    <div className="mt-3 flex gap-2 font-mono text-xs">
                        <span className="rounded-md bg-sunrise-300/10 px-2 py-0.5 text-sunrise-200">IATA {ap.iata}</span>
                        {ap.icao && <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-slate-300">ICAO {ap.icao}</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href={`/flights?airport=${ap.iata}` as any} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] px-4 py-2.5 text-xs text-slate-200 hover:text-white">
                        <Radio className="h-3.5 w-3.5" /> Live map
                    </Link>
                    <Link href={`/plan-trip?destination=${encodeURIComponent(`${city}, ${country}`)}` as any} className="btn-apple-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold">
                        Plan a trip to {city} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>

            {faa.length > 0 && (
                <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-4 text-sm text-amber-200">
                    <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> FAA reports delays at {ap.iata}</div>
                    <ul className="mt-2 space-y-1 text-xs text-amber-100/80">
                        {faa.map((d, i) => <li key={i}>{d.detail}{d.reason ? ` — ${d.reason}` : ''}</li>)}
                    </ul>
                </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className={card}>
                    <div className="eyebrow !text-[10px] text-slate-500">Weather now</div>
                    {weather ? (
                        <div className="mt-3 space-y-2 text-sm text-slate-200">
                            <div className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-slate-500" /> {weather.tempC ?? '—'}°C</div>
                            <div className="flex items-center gap-2"><Wind className="h-4 w-4 text-slate-500" /> {weather.windKt === 0 ? 'Calm' : `${weather.windKt ?? '—'} kt${weather.gustKt ? `, gusts ${weather.gustKt}` : ''}`}</div>
                            <p className="break-words font-mono text-[10px] text-slate-500">{weather.raw}</p>
                        </div>
                    ) : <p className="mt-3 text-xs text-slate-500">No current weather report.</p>}
                </div>
                <div className={card}>
                    <div className="eyebrow !text-[10px] text-slate-500">Live traffic</div>
                    {traffic ? (
                        <div className="mt-3">
                            <div className="font-heading text-4xl text-slate-100">{traffic.length}</div>
                            <p className="text-xs text-slate-400">aircraft within 30 nm right now · {traffic.filter(a => a.ground).length} on the ground</p>
                        </div>
                    ) : <p className="mt-3 text-xs text-slate-500">Live traffic is unavailable right now.</p>}
                </div>
                <div className={card}>
                    <div className="eyebrow !text-[10px] text-slate-500">Get alerts</div>
                    <p className="mt-3 text-xs text-slate-400">Flying from {ap.iata}? Track your flight and we&apos;ll email you about delays, gate changes and cancellations.</p>
                    <Link href={'/dashboard?tab=flights' as any} className="mt-3 inline-flex items-center gap-1.5 text-xs text-sunrise-300 hover:text-sunrise-200">Track a flight <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
            </div>

            {board ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <section className={card}>
                        <h2 className="mb-3 flex items-center gap-2 font-heading text-2xl text-slate-100"><PlaneTakeoff className="h-5 w-5 text-sunrise-300" /> Departures</h2>
                        <BoardTable flights={upcoming(board.departures)} direction="departures" />
                    </section>
                    <section className={card}>
                        <h2 className="mb-3 flex items-center gap-2 font-heading text-2xl text-slate-100"><PlaneLanding className="h-5 w-5 text-emerald-300" /> Arrivals</h2>
                        <BoardTable flights={upcoming(board.arrivals)} direction="arrivals" />
                    </section>
                    <p className="text-[10px] text-slate-600 lg:col-span-2">Times are local. Updated {new Date(board.fetchedAt).toUTCString().slice(17, 22)} UTC; always check with your airline.</p>
                </div>
            ) : null}

            <section className={`${card} mt-6`}>
                <h2 className="mb-1 font-heading text-2xl text-slate-100">At the airport</h2>
                <p className="mb-4 text-xs text-slate-400">Lounges, food, pharmacies, money and hotels at {ap.name}.</p>
                <AirportServices iata={ap.iata} airportName={ap.name} />
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
                <div className={card}>
                    <h2 className="mb-2 font-heading text-2xl text-slate-100">Travelling to {country}?</h2>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <Link href={'/visa-hub' as any} className="rounded-full border border-white/[0.1] px-3.5 py-2 text-slate-300 hover:text-white">Check entry rules</Link>
                        <Link href={'/translate' as any} className="rounded-full border border-white/[0.1] px-3.5 py-2 text-slate-300 hover:text-white">Translate phrases</Link>
                        <Link href={'/compensation' as any} className="rounded-full border border-white/[0.1] px-3.5 py-2 text-slate-300 hover:text-white">Delayed? Check compensation</Link>
                    </div>
                </div>
                {sameCity.length > 0 && (
                    <div className={card}>
                        <h2 className="mb-2 font-heading text-2xl text-slate-100">Other airports in {city}</h2>
                        <ul className="space-y-1 text-sm">
                            {sameCity.map(a => (
                                <li key={a.iata}><Link href={`/airports/${a.iata}` as any} className="text-slate-300 hover:text-white"><span className="font-mono text-sunrise-300">{a.iata}</span> {a.name}</Link></li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </main>
    );
}
