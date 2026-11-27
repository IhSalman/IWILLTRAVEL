/**
 * Server-rendered itinerary guide (content v2). Plain HTML for crawlers:
 * real headings, links and images; no client JS needed.
 */
import {
    ArrowRight,
    ArrowUpRight,
    Banknote,
    CalendarCheck,
    Clock,
    Handshake,
    MapPin,
    PiggyBank,
    PlaneLanding,
    ShieldCheck,
    Star,
    Sun,
    TramFront,
    type LucideIcon,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { ItineraryGuideContent } from '@/lib/guides/types';

function formatVerified(iso: string) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

const TIP_ICONS: Record<string, LucideIcon> = {
    'Arriving from the airport': PlaneLanding,
    'Getting around': TramFront,
    'Money and tipping': Banknote,
    'Staying safe': ShieldCheck,
    'Book ahead': CalendarCheck,
    'Local etiquette': Handshake,
    'When to go': Sun,
    'Save money': PiggyBank,
};

export function GuideArticle({ guide }: { guide: ItineraryGuideContent }) {
    const planUrl = `/plan-trip?destination=${encodeURIComponent(guide.destination)}&days=${guide.days}`;
    return (
        <div className="space-y-16">
            {/* Intro */}
            <section className="space-y-5">
                {guide.intro.split(/\n{2,}/).map((p, i) => (
                    <p key={i} className="text-base sm:text-lg leading-relaxed text-slate-300">
                        {p}
                    </p>
                ))}
                {guide.whoItsFor && <p className="text-sm text-slate-400 border-l-2 border-sunrise-300/60 pl-4">{guide.whoItsFor}</p>}
            </section>

            {/* Quick facts */}
            <section aria-label="Trip at a glance" className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06]">
                {[
                    ['Length', `${guide.days} days`],
                    ['Stops', `${guide.stats.stops} verified places`],
                    ['Getting around', guide.quickFacts.gettingAround],
                    ['Budget', guide.quickFacts.budget],
                ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                        <div key={k} className="bg-background p-4">
                            <p className="text-[11px] uppercase tracking-wider text-slate-500">{k}</p>
                            <p className="mt-1 text-sm text-slate-100">{v}</p>
                        </div>
                    ))}
            </section>

            {/* Know before you go — practical tips people search for */}
            {guide.beforeYouGo && guide.beforeYouGo.length > 0 && (
                <section id="travel-tips" className="scroll-mt-24 space-y-6">
                    <div className="space-y-2">
                        <p className="eyebrow">Know before you go</p>
                        <h2 className="font-heading text-4xl text-slate-100">{guide.city} travel tips</h2>
                    </div>
                    <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-2">
                        {guide.beforeYouGo.map((t) => {
                            const Icon = TIP_ICONS[t.topic] ?? MapPin;
                            return (
                                <div key={t.topic} className="bg-background p-5 sm:p-6 space-y-2">
                                    <h3 className="flex items-center gap-2.5 text-sm font-medium text-slate-100">
                                        <Icon className="h-4 w-4 text-sunrise-300" aria-hidden />
                                        {t.topic}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-slate-400">{t.tip}</p>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-slate-500">General advice — fares, rules and opening times change, so check official sources before you travel.</p>
                </section>
            )}

            {/* Day by day */}
            <section className="space-y-14">
                <h2 className="font-heading text-4xl text-slate-100">Day-by-day itinerary</h2>
                {guide.plan.map((day) => (
                    <article key={day.day} id={`day-${day.day}`} className="scroll-mt-24 space-y-6">
                        <header className="space-y-2">
                            <p className="eyebrow">Day {day.day}{day.area ? ` · ${day.area}` : ''}</p>
                            <h3 className="font-heading text-3xl sm:text-[2.1rem] leading-tight text-slate-100">{day.title}</h3>
                            {day.summary && <p className="text-slate-400 leading-relaxed">{day.summary}</p>}
                            {day.routeUrl && (
                                <a href={day.routeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-sunrise-300 hover:underline underline-offset-4">
                                    Open Day {day.day} route in Google Maps <ArrowUpRight className="h-3.5 w-3.5" />
                                </a>
                            )}
                        </header>

                        <ol className="space-y-5">
                            {day.stops.map((s, i) => (
                                <li key={`${day.day}-${i}`} className="grid gap-5 rounded-2xl border border-white/[0.08] p-4 sm:grid-cols-[220px_1fr] sm:p-5">
                                    {s.photoUrl ? (
                                        <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl bg-white/[0.03]">
                                            <img
                                                src={s.photoUrl.replace(/&w=\d+/, '&w=800')}
                                                alt={`${s.name}, ${guide.city}`}
                                                width={800}
                                                height={600}
                                                loading="lazy"
                                                decoding="async"
                                                className="aspect-[4/3] h-full w-full object-cover"
                                            />
                                        </a>
                                    ) : (
                                        <div className="hidden sm:block rounded-xl bg-white/[0.03]" />
                                    )}
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                            <span className="font-mono text-sunrise-300">{String(i + 1).padStart(2, '0')}</span>
                                            {s.time && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {s.time}
                                                </span>
                                            )}
                                            {s.category && <span>{s.category}</span>}
                                            {s.rating ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <Star className="h-3 w-3 fill-sunrise-300 text-sunrise-300" /> {s.rating.toFixed(1)}
                                                    {s.totalRatings ? ` (${s.totalRatings.toLocaleString('en-GB')})` : ''}
                                                </span>
                                            ) : null}
                                        </div>
                                        <h4 className="text-lg font-medium text-slate-100">
                                            <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-sunrise-300 transition-colors">
                                                {s.name}
                                            </a>
                                        </h4>
                                        {s.description && <p className="text-sm leading-relaxed text-slate-400">{s.description}</p>}
                                        {s.address && (
                                            <p className="flex items-start gap-1.5 text-sm">
                                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                                                <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-slate-300 underline decoration-white/20 underline-offset-4 hover:text-sunrise-300">
                                                    {s.address}
                                                </a>
                                            </p>
                                        )}
                                        {s.hours && s.hours.length > 0 && (
                                            <details className="text-sm text-slate-400">
                                                <summary className="cursor-pointer text-slate-300 hover:text-slate-100">Opening hours</summary>
                                                <ul className="mt-2 space-y-0.5 text-xs">
                                                    {s.hours.map((h) => (
                                                        <li key={h}>{h.replace(/[  ]/g, ' ')}</li>
                                                    ))}
                                                </ul>
                                            </details>
                                        )}
                                        {s.tip && (
                                            <p className="rounded-lg bg-sunrise-300/[0.08] px-3 py-2 text-sm text-slate-300">
                                                <span className="font-medium text-sunrise-300">Tip: </span>
                                                {s.tip}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>

                        {day.eat.length > 0 && (
                            <p className="text-sm text-slate-400">
                                <span className="text-slate-200">Where to eat nearby: </span>
                                {day.eat.map((e, i) => (
                                    <span key={e.url}>
                                        {i > 0 && ', '}
                                        <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-4 hover:text-sunrise-300">
                                            {e.label}
                                        </a>
                                    </span>
                                ))}
                            </p>
                        )}
                    </article>
                ))}
            </section>

            {/* CTA */}
            <section className="rounded-3xl border border-white/[0.08] p-8 sm:p-10 text-center">
                <h2 className="font-heading text-3xl sm:text-4xl text-slate-100">
                    Make this <em className="text-sunrise-300">your</em> {guide.city} trip
                </h2>
                <p className="mx-auto mt-3 max-w-md text-slate-400">
                    Change the dates, pace or interests and get a fresh day-by-day plan with verified places in under a minute.
                </p>
                <Link href={planUrl as any} className="btn-apple-primary mt-6 inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm">
                    Customise this itinerary <ArrowRight className="h-4 w-4" />
                </Link>
            </section>

            {/* Tips */}
            {guide.tips.length > 0 && (
                <section className="space-y-4">
                    <h2 className="font-heading text-3xl text-slate-100">Tips for this itinerary</h2>
                    <ul className="space-y-3">
                        {guide.tips.map((t, i) => (
                            <li key={i} className="flex gap-3 text-slate-300">
                                <span className="font-mono text-xs text-sunrise-300 mt-1">{String(i + 1).padStart(2, '0')}</span>
                                <span className="leading-relaxed">{t}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* FAQ */}
            {guide.faq.length > 0 && (
                <section className="space-y-4">
                    <h2 className="font-heading text-3xl text-slate-100">Frequently asked questions</h2>
                    <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
                        {guide.faq.map((f) => (
                            <details key={f.q} className="group py-4">
                                <summary className="cursor-pointer list-none text-slate-100 flex justify-between gap-4">
                                    <h3 className="text-base font-medium">{f.q}</h3>
                                    <span className="text-slate-500 group-open:rotate-45 transition-transform">+</span>
                                </summary>
                                <p className="mt-2 text-slate-400 leading-relaxed">{f.a}</p>
                            </details>
                        ))}
                    </div>
                </section>
            )}

            <p className="text-xs text-slate-500">
                Every place in this guide was checked against live Google Maps data
                {guide.verifiedAt ? ` on ${formatVerified(guide.verifiedAt)}` : ''}. Opening hours can change — tap a place to confirm before you go.
            </p>
        </div>
    );
}
