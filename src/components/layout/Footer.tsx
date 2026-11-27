import { Link } from '@/i18n/routing';
import { Wordmark } from './Navbar';

const COLUMNS = [
    {
        title: 'Plan',
        links: [
            { href: '/plan-trip', label: 'Trip planner' },
            { href: '/discover', label: 'Destinations' },
            { href: '/blogs', label: 'Travel guides' },
            { href: '/pricing', label: 'Pricing' },
        ],
    },
    {
        title: 'Tools',
        links: [
            { href: '/flights', label: 'Live flights' },
            { href: '/visa-hub', label: 'Visa hub' },
            { href: '/translate', label: 'Translate' },
            { href: '/travel-research', label: 'Place research' },
            { href: '/community', label: 'Community' },
        ],
    },
    {
        title: 'Company',
        links: [
            { href: '/privacy', label: 'Privacy' },
            { href: '/terms', label: 'Terms' },
        ],
    },
];

export function Footer() {
    return (
        <footer className="w-full border-t border-white/[0.07] bg-background text-slate-400">
            <div className="container max-w-7xl mx-auto px-4 pt-20 pb-10">
                <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 mb-20">
                    <div className="col-span-2 md:col-span-1 max-w-sm">
                        <Link href="/" aria-label="iWillTravel home">
                            <Wordmark />
                        </Link>
                        <p className="mt-5 text-sm leading-relaxed text-slate-500">
                            Day-by-day trip plans built from live map data. Real places, real opening hours,
                            routed so you spend your time there — not in between.
                        </p>
                        <a
                            href="mailto:hello@iwilltravel.app"
                            className="mt-5 inline-block text-sm text-slate-300 hover:text-sunrise-300 transition-colors"
                        >
                            hello@iwilltravel.app
                        </a>
                    </div>

                    {COLUMNS.map(col => (
                        <div key={col.title}>
                            <h3 className="eyebrow mb-5">{col.title}</h3>
                            <ul className="space-y-3 text-sm">
                                {col.links.map(l => (
                                    <li key={l.href}>
                                        <Link href={l.href as any} className="text-slate-400 hover:text-slate-100 transition-colors">
                                            {l.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* oversized wordmark — quiet signature */}
                <div className="overflow-hidden border-t border-white/[0.06] pt-10">
                    <p className="font-heading text-[18vw] md:text-[12rem] leading-[0.8] tracking-tight text-white/[0.04] select-none" aria-hidden="true">
                        iWill<em>Travel</em>
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3 text-xs text-slate-600">
                        <p>© {new Date().getFullYear()} iWillTravel</p>
                        <p>Made for curious travellers.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
