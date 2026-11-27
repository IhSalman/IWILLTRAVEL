/**
 * /compensation — free EU261/UK261 delay & cancellation compensation checker.
 * A plain GET form computed on the server (works without JavaScript).
 */
import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { Scale, ArrowRight } from 'lucide-react';
import { getAirport } from '@/lib/airports';
import { airlineEuUkCountry, airlineName } from '@/lib/airlines';
import { checkCompensation } from '@/lib/eu261';
import { distanceNm } from '@/components/flights/geo';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const title = 'Flight delay compensation checker (EU261 & UK261) | iWillTravel';
    const description = 'Was your flight delayed 3+ hours or cancelled? Check in seconds if you can claim up to €600 / £520 under EU261 or UK261. Free, no sign-up.';
    return { title, description, alternates: { canonical: `/${locale}/compensation` }, openGraph: { title, description } };
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function CompensationPage({ searchParams }: { searchParams: Promise<SP> }) {
    const sp = await searchParams;
    const from = one(sp.from).trim().toUpperCase().slice(0, 4);
    const to = one(sp.to).trim().toUpperCase().slice(0, 4);
    const airline = one(sp.airline).trim().toUpperCase().slice(0, 3);
    const hours = Number(one(sp.hours) || '0');
    const cancelled = one(sp.cancelled) === '1';
    const submitted = !!(from && to);

    const dep = from ? getAirport(from) : null;
    const arr = to ? getAirport(to) : null;
    let error: string | null = null;
    let result: ReturnType<typeof checkCompensation> | null = null;
    if (submitted) {
        if (!dep || !arr) error = 'Enter the 3-letter airport codes from your booking (e.g. LHR, JFK).';
        else {
            result = checkCompensation({
                depCountry: dep.country,
                arrCountry: arr.country,
                carrierCountry: airlineEuUkCountry(airline),
                distanceKm: distanceNm(dep.lat, dep.lon, arr.lat, arr.lon) * 1.852,
                arrivalDelayMinutes: cancelled ? null : Math.max(0, Math.round((Number.isFinite(hours) ? hours : 0) * 60)),
                cancelled,
            });
        }
    }

    const field = 'h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunrise-300/50 focus:outline-none';
    return (
        <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
            <div className="eyebrow text-slate-500">Free tool</div>
            <h1 className="mt-2 font-heading text-4xl leading-[1.05] text-slate-100 sm:text-5xl">Delayed or cancelled? Check your compensation</h1>
            <p className="mt-3 text-sm text-slate-400">
                Under EU261 and UK261, a flight that reaches its destination 3+ hours late, or is cancelled at short notice, can earn you up to €600 (£520) per passenger, on top of a refund or rebooking.
            </p>

            <form method="get" className="apple-glass-card mt-8 grid gap-4 rounded-3xl p-5 sm:grid-cols-2 sm:p-6">
                <label className="text-xs text-slate-400">From (airport code)
                    <input name="from" defaultValue={from} placeholder="e.g. LHR" maxLength={4} required className={cn(field, 'mt-1.5 uppercase')} />
                </label>
                <label className="text-xs text-slate-400">To (airport code)
                    <input name="to" defaultValue={to} placeholder="e.g. JFK" maxLength={4} required className={cn(field, 'mt-1.5 uppercase')} />
                </label>
                <label className="text-xs text-slate-400">Airline code (from your flight number)
                    <input name="airline" defaultValue={airline} placeholder="e.g. BA" maxLength={3} className={cn(field, 'mt-1.5 uppercase')} />
                </label>
                <label className="text-xs text-slate-400">How late did you arrive? (hours)
                    <input name="hours" type="number" step="0.25" min="0" max="72" defaultValue={sp.hours ? hours : ''} placeholder="e.g. 3.5" className={cn(field, 'mt-1.5')} />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 sm:col-span-2">
                    <input type="checkbox" name="cancelled" value="1" defaultChecked={cancelled} className="h-4 w-4 accent-[#f3b87f]" />
                    My flight was cancelled (with less than 14 days&apos; notice)
                </label>
                <button type="submit" className="btn-apple-primary inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-xs font-semibold sm:col-span-2">
                    <Scale className="h-4 w-4" /> Check my flight
                </button>
            </form>

            {error && <p className="mt-6 text-sm text-rose-300">{error}</p>}
            {result && dep && arr && (
                <section className={cn('mt-6 rounded-3xl border p-6',
                    result.eligible === 'yes' ? 'border-emerald-500/30 bg-emerald-950/20' : result.eligible === 'maybe' ? 'border-amber-500/30 bg-amber-950/20' : 'border-white/[0.08] bg-white/[0.02]')}>
                    <div className="eyebrow text-slate-400">{dep.iata} → {arr.iata}{airline && airlineName(airline) ? ` · ${airlineName(airline)}` : ''}</div>
                    <h2 className="mt-2 font-heading text-3xl text-slate-100">
                        {result.eligible === 'yes' ? `You're likely owed ${result.amount}` : result.eligible === 'maybe' ? `You may be owed up to ${result.amount}` : 'No compensation under EU261/UK261'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">{result.reason}</p>
                    {result.eligible !== 'no' && (
                        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-slate-400">
                            <li>Claim directly on the airline&apos;s website; you don&apos;t need a paid claims company.</li>
                            <li>Include your booking reference, flight number, date and how late you arrived.</li>
                            <li>Keep receipts: meals and hotels during long delays are also refundable.</li>
                            <li>If the airline refuses, escalate to the national enforcement body or an ADR scheme.</li>
                        </ol>
                    )}
                    <p className="mt-4 text-[11px] text-slate-500">A quick estimate, not legal advice. Amounts are per passenger and can be halved if the airline rerouted you and you arrived only slightly late.</p>
                </section>
            )}

            <div className="apple-glass-card mt-8 flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-300">Get told the moment your next flight is delayed, with a compensation check when you land.</p>
                <Link href={'/dashboard?tab=flights' as any} className="inline-flex shrink-0 items-center gap-1.5 text-xs text-sunrise-300 hover:text-sunrise-200">Track a flight <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
        </main>
    );
}
