/** Departures/arrivals board (server component). */
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { localClock, minutesBetween, type BoardFlight } from '@/lib/flight-status/types';

function boardStatus(f: BoardFlight, direction: 'departures' | 'arrivals'): { label: string; tone: string } {
    const delay = minutesBetween(f.scheduledUtc, f.revisedUtc);
    switch (f.status) {
        case 'cancelled': return { label: 'Cancelled', tone: 'text-rose-300' };
        case 'cancelled_uncertain': return { label: 'May be cancelled', tone: 'text-rose-300' };
        case 'diverted': return { label: 'Diverted', tone: 'text-rose-300' };
        case 'landed': return { label: `Landed ${localClock(f.revisedLocal) ?? ''}`.trim(), tone: 'text-slate-400' };
        case 'departed':
        case 'en_route': return { label: direction === 'departures' ? `Departed ${localClock(f.revisedLocal) ?? ''}`.trim() : 'In the air', tone: 'text-slate-400' };
        case 'approaching': return { label: 'Approaching', tone: 'text-emerald-300' };
        case 'boarding': return { label: 'Boarding', tone: 'text-emerald-300' };
        case 'gate_closed': return { label: 'Gate closed', tone: 'text-amber-300' };
        default:
            if (delay !== null && delay >= 15) return { label: `Delayed · ${localClock(f.revisedLocal) ?? `+${delay}m`}`, tone: 'text-amber-300' };
            return { label: f.revisedLocal ? `Expected ${localClock(f.revisedLocal)}` : 'Scheduled', tone: 'text-slate-300' };
    }
}

export function BoardTable({ flights, direction }: { flights: BoardFlight[]; direction: 'departures' | 'arrivals' }) {
    if (flights.length === 0) return <p className="text-xs text-slate-500">No {direction} in this window.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                        <th className="py-2 pr-3 font-normal">Time</th>
                        <th className="py-2 pr-3 font-normal">Flight</th>
                        <th className="py-2 pr-3 font-normal">{direction === 'departures' ? 'To' : 'From'}</th>
                        <th className="py-2 pr-3 font-normal">{direction === 'departures' ? 'Terminal · Gate' : 'Terminal · Belt'}</th>
                        <th className="py-2 font-normal">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                    {flights.map(f => {
                        const st = boardStatus(f, direction);
                        const where = [f.terminal && `T${f.terminal}`, direction === 'departures' ? f.gate : f.baggageBelt].filter(Boolean).join(' · ');
                        return (
                            <tr key={`${f.number}-${f.scheduledUtc}`} className="text-slate-200">
                                <td className="py-2 pr-3 font-mono">{localClock(f.scheduledLocal) ?? '—'}</td>
                                <td className="py-2 pr-3">
                                    <Link href={`/flights/${encodeURIComponent(f.number)}` as any} className="font-mono hover:text-sunrise-300">{f.number}</Link>
                                    {f.airline && <span className="block text-[10px] text-slate-500">{f.airline}</span>}
                                </td>
                                <td className="py-2 pr-3">{f.otherAirport.city ?? f.otherAirport.name}{f.otherAirport.iata && <span className="text-slate-500"> {f.otherAirport.iata}</span>}</td>
                                <td className="py-2 pr-3 text-slate-400">{where || '—'}</td>
                                <td className={cn('py-2', st.tone)}>{st.label}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
