/**
 * Slow, endless ticker of destinations — a quiet "departures board" travel motif.
 */
const PLACES = [
    'Lisbon', 'Kyoto', 'Reykjavík', 'Marrakech', 'Tokyo', 'Cape Town',
    'Bali', 'Paris', 'Kuopio', 'Rio de Janeiro', 'Istanbul', 'Sydney',
];

export function DestinationTicker() {
    const row = [...PLACES, ...PLACES];
    return (
        <div className="relative overflow-hidden border-y border-white/[0.06] py-6 mask-fade-x" aria-hidden="true">
            <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap">
                {row.map((p, i) => (
                    <span key={`${p}-${i}`} className="flex items-center gap-10">
                        <span className="font-heading italic text-2xl sm:text-3xl text-slate-300/70">{p}</span>
                        <svg width="16" height="16" viewBox="-18 -10 32 20" className="text-sunrise-300/70" fill="currentColor">
                            <path d="M 12 0 L -6 -2 L -10 -9 L -13 -9 L -10 -2 L -14 -1.5 L -16 -5 L -18 -5 L -17 0 L -18 5 L -16 5 L -14 1.5 L -10 2 L -13 9 L -10 9 L -6 2 Z" />
                        </svg>
                    </span>
                ))}
            </div>
        </div>
    );
}
