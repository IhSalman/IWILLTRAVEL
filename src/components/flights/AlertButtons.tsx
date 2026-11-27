'use client';

/**
 * Paid-alert entry points on the live map:
 *  - TrackFlightButton: email alerts for the selected flight (POST /api/flight-alerts)
 *  - AircraftAlertButton: "email me when an A380 is due here" for an airport (POST /api/aircraft-watches)
 * Both explain the next step when the visitor isn't signed in or isn't on the right plan.
 */
import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { Bell, Loader2, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AIRCRAFT_FAMILIES } from '@/lib/aircraft-types';

type Outcome = { kind: 'done' } | { kind: 'login' } | { kind: 'upgrade'; message: string } | null;

const chip = 'inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] px-3.5 py-2 text-xs text-slate-300 hover:text-slate-100';

function OutcomeNote({ outcome, doneText }: { outcome: Outcome; doneText: string }) {
    if (!outcome) return null;
    if (outcome.kind === 'done') {
        return (
            <p className="flex w-full items-center gap-1.5 text-xs text-emerald-300">
                <Check className="h-3.5 w-3.5" /> {doneText} <Link href={'/dashboard?tab=flights' as any} className="underline">Manage</Link>
            </p>
        );
    }
    if (outcome.kind === 'login') {
        return <p className="w-full text-xs text-slate-400"><Link href={'/login' as any} className="text-sunrise-300 underline">Sign in</Link> to get email alerts.</p>;
    }
    return <p className="w-full text-xs text-slate-400">{outcome.message} <Link href="/pricing" className="text-sunrise-300 underline">See plans</Link></p>;
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; json: any }> {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}

export function TrackFlightButton({ flightNumber }: { flightNumber: string }) {
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [busy, setBusy] = useState(false);
    const [outcome, setOutcome] = useState<Outcome>(null);

    const submit = async () => {
        setBusy(true);
        try {
            const r = await postJson('/api/flight-alerts', { flightNumber, date });
            if (r.ok) { setOutcome({ kind: 'done' }); setOpen(false); return; }
            if (r.status === 401) return setOutcome({ kind: 'login' });
            if (r.json?.upgradeRequired) return setOutcome({ kind: 'upgrade', message: r.json.error });
            toast.error(r.json?.error || 'Could not track this flight');
        } finally {
            setBusy(false);
        }
    };

    if (outcome?.kind === 'done') return <OutcomeNote outcome={outcome} doneText={`Alerts on for ${flightNumber}.`} />;

    return (
        <>
            {!open ? (
                <button type="button" onClick={() => setOpen(true)} className={chip}>
                    <Bell className="h-3.5 w-3.5" /> Get delay alerts
                </button>
            ) : (
                <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <span className="text-xs text-slate-300">Email me about {flightNumber} departing</span>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Departure date"
                        className="h-8 rounded-lg border border-white/[0.1] bg-transparent px-2 text-xs text-slate-100" />
                    <button type="button" onClick={submit} disabled={busy}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sunrise-300 px-3 text-xs font-medium text-[#0b0c0f] disabled:opacity-60">
                        {busy && <Loader2 className="h-3 w-3 animate-spin" />} Start alerts
                    </button>
                </div>
            )}
            <OutcomeNote outcome={outcome} doneText="" />
        </>
    );
}

const WATCHABLE = AIRCRAFT_FAMILIES.filter(f => f.rare || ['a350', '787', '777'].includes(f.id));

export function AircraftAlertButton({ airportIata }: { airportIata: string }) {
    const [open, setOpen] = useState(false);
    const [family, setFamily] = useState('a380');
    const [busy, setBusy] = useState(false);
    const [outcome, setOutcome] = useState<Outcome>(null);

    const submit = async () => {
        setBusy(true);
        try {
            const r = await postJson('/api/aircraft-watches', { family, airport: airportIata });
            if (r.ok) { setOutcome({ kind: 'done' }); setOpen(false); return; }
            if (r.status === 401) return setOutcome({ kind: 'login' });
            if (r.json?.upgradeRequired) return setOutcome({ kind: 'upgrade', message: r.json.error });
            toast.error(r.json?.error || 'Could not save this alert');
        } finally {
            setBusy(false);
        }
    };

    if (outcome?.kind === 'done') return <OutcomeNote outcome={outcome} doneText={`We'll email you when one is due at ${airportIata}.`} />;

    return (
        <>
            {!open ? (
                <button type="button" onClick={() => setOpen(true)} className={chip}>
                    <Sparkles className="h-3.5 w-3.5 text-sunrise-300" /> Aircraft alert
                </button>
            ) : (
                <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <span className="text-xs text-slate-300">Email me when</span>
                    <select value={family} onChange={e => setFamily(e.target.value)} aria-label="Aircraft model"
                        className="h-8 rounded-lg border border-white/[0.1] bg-[#111216] px-2 text-xs text-slate-100">
                        {WATCHABLE.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <span className="text-xs text-slate-300">is due at {airportIata}</span>
                    <button type="button" onClick={submit} disabled={busy}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sunrise-300 px-3 text-xs font-medium text-[#0b0c0f] disabled:opacity-60">
                        {busy && <Loader2 className="h-3 w-3 animate-spin" />} Save
                    </button>
                </div>
            )}
            <OutcomeNote outcome={outcome} doneText="" />
        </>
    );
}
