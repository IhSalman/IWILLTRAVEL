'use client';

/**
 * Dashboard → My flights: track flights for email alerts (delays, gates, cancellations,
 * aircraft swaps), choose which alerts to get, and manage aircraft-model alerts.
 * Backed by /api/flight-alerts and /api/aircraft-watches.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Loader2, Plane, Plus, Trash2, Bell, Sparkles, ArrowRight, Lock, Radar } from 'lucide-react';
import { toast } from 'sonner';
import { AIRCRAFT_FAMILIES } from '@/lib/aircraft-types';
import { statusLabel, localClock, departureDelay, type FlightSnapshot } from '@/lib/flight-status/types';
import type { AlertKind, AlertPrefs } from '@/lib/flight-status/diff';

interface TrackedFlight {
    id: string;
    itinerary_id: string | null;
    flight_number: string;
    flight_date: string;
    dep_iata: string | null;
    arr_iata: string | null;
    status: string;
    snapshot: FlightSnapshot | null;
    active: boolean;
    last_checked_at: string | null;
}
interface FlightEventRow { id: string; kind: string; message: string; created_at: string }
interface Watch { id: string; label: string; mode: 'scheduled' | 'live'; airport_iata: string | null }
interface AlertsResponse {
    flights: TrackedFlight[];
    events: FlightEventRow[];
    prefs: AlertPrefs;
    plan: { name: string; hasFlightAlerts: boolean; maxTrackedFlights: number };
    enabled: boolean;
}

const PREF_LABELS: [AlertKind, string][] = [
    ['delay', 'Delays'], ['cancelled', 'Cancellations'], ['gate', 'Gate changes'], ['terminal', 'Terminal changes'],
    ['aircraft_swap', 'Aircraft swaps'], ['checkin_reminder', 'Check-in reminder'], ['day_of_travel', 'Day-of-travel summary'],
    ['departed', 'Take-off'], ['landed', 'Landing'], ['belt', 'Baggage belt'], ['diverted', 'Diversions'],
];

const WATCHABLE = AIRCRAFT_FAMILIES.filter(f => f.rare || ['a350', '787', '777', 'a330'].includes(f.id));

function StatusPill({ s, status }: { s: FlightSnapshot | null; status: string }) {
    const label = status === 'not_found' ? 'Not found' : statusLabel(s);
    const tone = /cancel|divert|not found/i.test(label) ? 'bg-rose-500/15 text-rose-300'
        : /delay/i.test(label) ? 'bg-amber-500/15 text-amber-300'
        : /landed/i.test(label) ? 'bg-slate-500/20 text-slate-300'
        : 'bg-emerald-500/15 text-emerald-300';
    return <span className={cn('rounded-full px-2.5 py-1 text-[11px]', tone)}>{label}</span>;
}

export function MyFlightsTab({ itineraries }: { itineraries: { id: string; title: string }[] }) {
    const [data, setData] = useState<AlertsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    // Prefilled from links such as /dashboard?tab=flights&flight=BA123 (flight pages, live map).
    const [flightNumber, setFlightNumber] = useState(() =>
        typeof window === 'undefined' ? '' : (new URLSearchParams(window.location.search).get('flight') ?? '').slice(0, 10));
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [tripId, setTripId] = useState('');
    const [adding, setAdding] = useState(false);
    const [watches, setWatches] = useState<Watch[]>([]);
    const [watchFamily, setWatchFamily] = useState('a380');
    const [watchAirport, setWatchAirport] = useState('');
    const [addingWatch, setAddingWatch] = useState(false);

    const load = useCallback(async () => {
        try {
            const [res, w] = await Promise.all([fetch('/api/flight-alerts'), fetch('/api/aircraft-watches')]);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Could not load your flights');
            setData(json);
            setLoadError(null);
            if (w.ok) setWatches((await w.json()).watches ?? []);
        } catch (e) {
            setLoadError(e instanceof Error ? e.message : 'Could not load your flights');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const addFlight = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        try {
            const res = await fetch('/api/flight-alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flightNumber, date, ...(tripId ? { itineraryId: tripId } : {}) }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Could not track this flight');
            toast.success(`Tracking ${json.flight?.flight_number ?? flightNumber}. We'll email you about any changes.`);
            setFlightNumber('');
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not track this flight');
        } finally {
            setAdding(false);
        }
    };

    const removeFlight = async (id: string) => {
        const res = await fetch(`/api/flight-alerts/${id}`, { method: 'DELETE' });
        if (res.ok) setData(d => d ? { ...d, flights: d.flights.filter(f => f.id !== id) } : d);
        else toast.error('Could not remove this flight');
    };

    const togglePref = async (kind: AlertKind) => {
        if (!data) return;
        const kinds = { ...data.prefs.kinds, [kind]: !data.prefs.kinds[kind] };
        setData({ ...data, prefs: { ...data.prefs, kinds } });
        const res = await fetch('/api/flight-alerts/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kinds }) });
        if (!res.ok) toast.error('Could not save your alert settings');
    };

    const setMinDelay = async (minDelayMinutes: number) => {
        if (!data) return;
        setData({ ...data, prefs: { ...data.prefs, minDelayMinutes } });
        await fetch('/api/flight-alerts/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minDelayMinutes }) });
    };

    const addWatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingWatch(true);
        try {
            const res = await fetch('/api/aircraft-watches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ family: watchFamily, airport: watchAirport.trim().toUpperCase() }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Could not save this alert');
            setWatches(w => [json.watch, ...w]);
            setWatchAirport('');
            toast.success(`Saved: ${json.watch.label}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not save this alert');
        } finally {
            setAddingWatch(false);
        }
    };

    const removeWatch = async (id: string) => {
        const res = await fetch(`/api/aircraft-watches/${id}`, { method: 'DELETE' });
        if (res.ok) setWatches(w => w.filter(x => x.id !== id));
    };

    if (loading) return <div className="flex items-center gap-2 py-20 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading your flights…</div>;
    if (loadError || !data) return <div className="apple-glass-card rounded-2xl p-6 text-sm text-slate-400">{loadError}</div>;

    const locked = !data.plan.hasFlightAlerts;
    const isPro = data.plan.name === 'pro' || data.plan.name === 'enterprise';
    const activeCount = data.flights.filter(f => f.active).length;
    const field = 'h-10 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunrise-300/50 focus:outline-none';

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-heading text-4xl sm:text-5xl text-slate-100">My flights</h1>
                <p className="mt-1 text-xs text-slate-300/80">Track a flight and we&apos;ll email you about delays, gate changes, cancellations and aircraft swaps.</p>
            </div>

            {locked ? (
                <div className="apple-glass-card rounded-3xl p-6 sm:p-8">
                    <Lock className="mb-3 h-6 w-6 text-sunrise-300" />
                    <h2 className="font-heading text-3xl text-slate-100">Flight alerts are a paid feature</h2>
                    <p className="mt-2 max-w-xl text-sm text-slate-400">
                        Starter tracks up to 5 flights at a time. Pro tracks unlimited flights and adds aircraft alerts, like an email when an A380 is due at your airport.
                    </p>
                    <Link href="/pricing" className="btn-apple-primary mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold">
                        See plans <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            ) : !data.enabled ? (
                <div className="apple-glass-card rounded-2xl p-6 text-sm text-slate-400">Flight alerts are being switched on. Check back soon.</div>
            ) : (
                <form onSubmit={addFlight} className="apple-glass-card flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-end">
                    <label className="flex flex-1 flex-col gap-1.5 text-xs text-slate-400">
                        Flight number
                        <input value={flightNumber} onChange={e => setFlightNumber(e.target.value)} placeholder="e.g. BA123" required maxLength={10} className={field} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs text-slate-400">
                        Departure date
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={field} />
                    </label>
                    {itineraries.length > 0 && (
                        <label className="flex flex-col gap-1.5 text-xs text-slate-400">
                            Link to trip (optional)
                            <select value={tripId} onChange={e => setTripId(e.target.value)} className={cn(field, 'max-w-[220px]')}>
                                <option value="">No trip</option>
                                {itineraries.slice(0, 30).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </label>
                    )}
                    <button type="submit" disabled={adding} className="btn-apple-primary inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-xs font-semibold disabled:opacity-60">
                        {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Track flight
                    </button>
                </form>
            )}

            {!locked && data.plan.maxTrackedFlights > 0 && (
                <p className="-mt-5 text-[11px] text-slate-500">{activeCount} of {data.plan.maxTrackedFlights} flights tracked on your plan.</p>
            )}

            {data.flights.length > 0 && (
                <div className="grid gap-3">
                    {data.flights.map(f => {
                        const s = f.snapshot;
                        const delay = s ? departureDelay(s) : null;
                        return (
                            <div key={f.id} className="apple-glass-card flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                    <Plane className="h-5 w-5 shrink-0 text-sunrise-300" />
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-heading text-2xl text-slate-100">{f.flight_number}</span>
                                            <StatusPill s={s} status={f.status} />
                                        </div>
                                        <div className="mt-0.5 truncate text-xs text-slate-400">
                                            {s?.airline?.name ? `${s.airline.name} · ` : ''}
                                            {f.dep_iata ?? '—'} → {f.arr_iata ?? '—'} · {new Date(`${f.flight_date}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {s?.departure.scheduledLocal && ` · departs ${localClock(s.departure.revisedLocal) ?? localClock(s.departure.scheduledLocal)}`}
                                            {delay !== null && delay >= 15 && <span className="text-amber-300"> (+{delay} min)</span>}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-slate-500">
                                            {[s?.departure.terminal && `Terminal ${s.departure.terminal}`, s?.departure.gate && `Gate ${s.departure.gate}`, s?.aircraft?.model].filter(Boolean).join(' · ')}
                                            {!f.active && ' · No longer tracked'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={`/flights?flight=${encodeURIComponent(f.flight_number)}` as any} className="rounded-full border border-white/[0.1] px-3.5 py-2 text-xs text-slate-300 hover:text-white">Live map</Link>
                                    <button type="button" onClick={() => removeFlight(f.id)} aria-label={`Stop tracking ${f.flight_number}`} className="rounded-full p-2 text-slate-500 hover:bg-white/[0.05] hover:text-rose-300">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!locked && (
                <div className="apple-glass-card rounded-2xl p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm text-slate-200"><Bell className="h-4 w-4 text-sunrise-300" /> Email me about</div>
                    <div className="flex flex-wrap gap-2">
                        {PREF_LABELS.map(([kind, label]) => (
                            <button key={kind} type="button" onClick={() => togglePref(kind)}
                                className={cn('rounded-full border px-3 py-1.5 text-xs transition-colors',
                                    data.prefs.kinds[kind] ? 'border-sunrise-300/40 bg-sunrise-300/10 text-sunrise-100' : 'border-white/[0.08] text-slate-500 hover:text-slate-300')}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <label className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                        Only delays of at least
                        <select value={data.prefs.minDelayMinutes} onChange={e => setMinDelay(Number(e.target.value))} className={cn(field, 'h-8 py-0')}>
                            {[15, 30, 45, 60, 120].map(m => <option key={m} value={m}>{m} min</option>)}
                        </select>
                    </label>
                </div>
            )}

            {data.events.length > 0 && (
                <div>
                    <h2 className="mb-3 font-heading text-2xl text-slate-100">Recent alerts</h2>
                    <div className="space-y-2">
                        {data.events.map(e => (
                            <div key={e.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-slate-300">
                                <span className="text-slate-500">{new Date(e.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · </span>{e.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="apple-glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 text-sm text-slate-200"><Sparkles className="h-4 w-4 text-sunrise-300" /> Aircraft alerts {!isPro && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-400">Pro</span>}</div>
                <p className="mt-1 text-xs text-slate-400">Get an email when a plane you love, like an A380 or a 747, is due at an airport.</p>
                {isPro ? (
                    <>
                        <form onSubmit={addWatch} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                            <label className="flex flex-col gap-1.5 text-xs text-slate-400">
                                Aircraft
                                <select value={watchFamily} onChange={e => setWatchFamily(e.target.value)} className={field}>
                                    {WATCHABLE.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1.5 text-xs text-slate-400">
                                Airport code
                                <input value={watchAirport} onChange={e => setWatchAirport(e.target.value)} placeholder="e.g. LHR" required maxLength={3} className={cn(field, 'w-28 uppercase')} />
                            </label>
                            <button type="submit" disabled={addingWatch} className="btn-apple-primary inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-xs font-semibold disabled:opacity-60">
                                {addingWatch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />} Add alert
                            </button>
                        </form>
                        {watches.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {watches.map(w => (
                                    <div key={w.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-2.5 text-xs text-slate-300">
                                        <span>{w.label} <span className="text-slate-500">· {w.mode === 'scheduled' ? 'from airport schedules' : 'live sightings'}</span></span>
                                        <button type="button" onClick={() => removeWatch(w.id)} aria-label={`Remove ${w.label}`} className="text-slate-500 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <Link href="/pricing" className="mt-4 inline-flex items-center gap-1.5 text-xs text-sunrise-300 hover:text-sunrise-200">Upgrade to Pro <ArrowRight className="h-3.5 w-3.5" /></Link>
                )}
            </div>
        </div>
    );
}
