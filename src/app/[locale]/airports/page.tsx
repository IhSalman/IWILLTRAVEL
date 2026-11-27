/** /airports — index of major airports by country (links to each airport guide). */
import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { allAirports } from '@/lib/airports';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const title = 'Airport guides: live departures, arrivals, delays & services | iWillTravel';
    const description = 'Live flight boards, delays, weather, lounges and services for major airports around the world.';
    return { title, description, alternates: { canonical: `/${locale}/airports` }, openGraph: { title, description } };
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (iso: string) => { try { return regionNames.of(iso) ?? iso; } catch { return iso; } };

export default function AirportsIndex() {
    const byCountry = new Map<string, { iata: string; name: string; city: string }[]>();
    for (const a of allAirports()) {
        if (a.size !== 1) continue;
        const list = byCountry.get(a.country) ?? [];
        list.push({ iata: a.iata, name: a.name, city: a.city });
        byCountry.set(a.country, list);
    }
    const countries = Array.from(byCountry.entries())
        .map(([iso, list]) => ({ iso, name: countryName(iso), list: list.sort((x, y) => x.city.localeCompare(y.city)) }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
            <div className="eyebrow text-slate-500">Airport guides</div>
            <h1 className="mt-2 font-heading text-4xl text-slate-100 sm:text-5xl">Airports</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Live departures and arrivals, delays, weather, lounges and services. Looking for a specific flight? Use the{' '}
                <Link href={'/flights' as any} className="text-sunrise-300 hover:text-sunrise-200">live flight map</Link>.
            </p>
            <div className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3">
                {countries.map(c => (
                    <section key={c.iso} className="mb-6 break-inside-avoid">
                        <h2 className="mb-2 text-sm font-medium text-slate-200">{c.name}</h2>
                        <ul className="space-y-1">
                            {c.list.map(a => (
                                <li key={a.iata}>
                                    <Link href={`/airports/${a.iata}` as any} className="text-xs text-slate-400 hover:text-white">
                                        <span className="font-mono text-sunrise-300">{a.iata}</span> {a.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </main>
    );
}
