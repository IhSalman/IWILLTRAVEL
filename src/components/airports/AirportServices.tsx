'use client';

/** On-demand "what's at this airport" lists (Google Places), so page views by crawlers cost nothing. */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Star, MapPin } from 'lucide-react';

const TABS = [
    { id: 'lounge', label: 'Lounges' },
    { id: 'food', label: 'Food & drink' },
    { id: 'pharmacy', label: 'Pharmacy' },
    { id: 'money', label: 'Money & ATMs' },
    { id: 'hotel', label: 'Hotels nearby' },
] as const;

interface Place { name: string; address: string; rating: number | null; ratings: number; openNow: boolean | null; placeId: string | null }

export function AirportServices({ iata, airportName }: { iata: string; airportName: string }) {
    const [tab, setTab] = useState<string | null>(null);
    const [data, setData] = useState<Record<string, Place[]>>({});
    const [loading, setLoading] = useState(false);

    const open = async (id: string) => {
        setTab(id);
        if (data[id]) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/airports/${iata}/services?kind=${id}`);
            const json = await res.json();
            setData(d => ({ ...d, [id]: res.ok ? json.places ?? [] : [] }));
        } finally {
            setLoading(false);
        }
    };

    const list = tab ? data[tab] : undefined;
    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {TABS.map(t => (
                    <button key={t.id} type="button" onClick={() => open(t.id)}
                        className={cn('rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                            tab === t.id ? 'border-sunrise-300/50 bg-sunrise-300/10 text-sunrise-100' : 'border-white/[0.1] text-slate-300 hover:text-white')}>
                        {t.label}
                    </button>
                ))}
            </div>
            {tab && (
                <div className="mt-4">
                    {loading && !list ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking around {airportName}…</div>
                    ) : list && list.length > 0 ? (
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {list.map(p => (
                                <li key={p.placeId ?? p.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                                    <div className="text-sm text-slate-100">{p.name}</div>
                                    <div className="mt-0.5 flex items-start gap-1 text-[11px] text-slate-500"><MapPin className="mt-px h-3 w-3 shrink-0" /> {p.address}</div>
                                    <div className="mt-1 flex gap-3 text-[11px] text-slate-400">
                                        {p.rating ? <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-sunrise-300" /> {p.rating.toFixed(1)} ({p.ratings.toLocaleString()})</span> : null}
                                        {p.openNow !== null && <span className={p.openNow ? 'text-emerald-300' : 'text-slate-500'}>{p.openNow ? 'Open now' : 'Closed now'}</span>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-slate-500">We couldn&apos;t find verified listings for this airport.</p>
                    )}
                    <p className="mt-3 text-[10px] text-slate-600">Listings from Google. Check opening hours and airside/landside location before you go.</p>
                </div>
            )}
        </div>
    );
}
