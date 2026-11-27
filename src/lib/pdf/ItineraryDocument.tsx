/**
 * Itinerary PDF — a printable travel document (A4).
 *
 *  Cover · At a glance · one section per day (each starts on a new page; stop
 *  cards never split across pages) · Good to know · Flights & stays.
 *  Every place, address and connection is a clickable Google Maps link.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Document, Font, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ItineraryPdfModel, PdfDay, PdfStop } from './types';

// ── Fonts ─────────────────────────────────────────────────────────────────────

let fontsReady = false;
export function registerPdfFonts(siteUrl: string) {
    if (fontsReady) return;
    const src = (file: string) => {
        const local = path.join(process.cwd(), 'public', 'fonts', file);
        return fs.existsSync(local) ? local : `${siteUrl}/fonts/${file}`;
    };
    Font.register({
        family: 'Inter',
        fonts: [
            { src: src('Inter_400Regular.ttf'), fontWeight: 400 },
            { src: src('Inter_400Regular_Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
            { src: src('Inter_500Medium.ttf'), fontWeight: 500 },
            { src: src('Inter_600SemiBold.ttf'), fontWeight: 600 },
        ],
    });
    Font.register({
        family: 'Serif',
        fonts: [
            { src: src('InstrumentSerif_400Regular.ttf'), fontWeight: 400 },
            { src: src('InstrumentSerif_400Regular_Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
        ],
    });
    // Never hyphenate place names or words.
    Font.registerHyphenationCallback((word) => [word]);
    fontsReady = true;
}

// ── Design tokens (print: warm paper, ink, one sunrise accent) ────────────────

const C = {
    paper: '#FFFFFF',
    ink: '#16171B',
    body: '#3A3936',
    muted: '#7A766F',
    line: '#E7E3DB',
    soft: '#F6F3EE',
    accent: '#D9772C',
    accentSoft: '#FBEEDF',
    link: '#B35F1F',
    sage: '#4C7655',
    clay: '#BC4838',
};

const s = StyleSheet.create({
    page: { backgroundColor: C.paper, fontFamily: 'Inter', fontSize: 9.5, color: C.body, paddingTop: 44, paddingBottom: 56, paddingHorizontal: 44, lineHeight: 1.45 },
    footer: { position: 'absolute', bottom: 22, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.muted, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 7 },
    eyebrow: { fontSize: 7.5, letterSpacing: 1.6, textTransform: 'uppercase', color: C.accent, fontWeight: 600, marginBottom: 6 },
    h1: { fontFamily: 'Serif', fontSize: 34, color: C.ink, lineHeight: 1.05 },
    h2: { fontFamily: 'Serif', fontSize: 24, color: C.ink, lineHeight: 1.1, marginBottom: 6 },
    h3: { fontFamily: 'Serif', fontSize: 16, color: C.ink, marginBottom: 6 },
    p: { fontSize: 9.5, color: C.body, lineHeight: 1.55 },
    small: { fontSize: 8, color: C.muted },
    link: { color: C.link, textDecoration: 'none' },
    section: { marginTop: 20 },
    rule: { borderBottomWidth: 0.5, borderBottomColor: C.line, marginVertical: 14 },
    bulletRow: { flexDirection: 'row', marginBottom: 4 },
    bulletDot: { width: 10, color: C.accent, fontWeight: 600 },
    bulletText: { flex: 1, fontSize: 9.5, color: C.body, lineHeight: 1.5 },
    chip: { fontSize: 7.5, color: C.body, backgroundColor: C.soft, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, marginRight: 4 },
});

// ── Small building blocks ─────────────────────────────────────────────────────

function Footer({ title }: { title: string }) {
    return (
        <View style={s.footer} fixed>
            <Text>iWillTravel · {title.length > 70 ? `${title.slice(0, 67)}…` : title}</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
    );
}

function Bullets({ items }: { items: string[] }) {
    return (
        <View>
            {items.map((t, i) => (
                <View key={i} style={s.bulletRow} wrap={false}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{t}</Text>
                </View>
            ))}
        </View>
    );
}

function Fact({ label, value }: { label: string; value?: string | number }) {
    if (value === undefined || value === '') return null;
    return (
        <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
            <Text style={{ fontFamily: 'Serif', fontSize: 17, color: C.ink, marginTop: 2 }}>{String(value)}</Text>
        </View>
    );
}

function InfoLine({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={{ flexDirection: 'row', marginTop: 3 }}>
            <Text style={{ width: 62, fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, paddingTop: 1 }}>{label}</Text>
            <Text style={{ flex: 1, fontSize: 8.5, color: C.body }}>{children}</Text>
        </View>
    );
}

const stars = (r?: number, n?: number) => (r ? `${r.toFixed(1)} / 5${n ? ` · ${n.toLocaleString('en-GB')} reviews` : ''}` : '');

// ── Cover ─────────────────────────────────────────────────────────────────────

function Cover({ m }: { m: ItineraryPdfModel }) {
    return (
        <Page size="A4" style={{ backgroundColor: C.paper, fontFamily: 'Inter' }}>
            {m.cover ? (
                <Image src={m.cover} style={{ width: '100%', height: 470, objectFit: 'cover' }} />
            ) : (
                <View style={{ height: 470, backgroundColor: C.ink, justifyContent: 'flex-end', padding: 44 }}>
                    <Text style={{ fontFamily: 'Serif', fontStyle: 'italic', fontSize: 64, color: '#EDEAE3' }}>{m.destination.split(',')[0]}</Text>
                </View>
            )}
            <View style={{ paddingHorizontal: 44, paddingTop: 34 }}>
                <Text style={s.eyebrow}>Travel itinerary</Text>
                <Text style={s.h1}>{m.title}</Text>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
                    {[m.destination, m.dateRange].filter(Boolean).join('  ·  ')}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 28, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: C.line }}>
                    <Fact label="Days" value={m.days.length} />
                    <Fact label="Stops" value={m.totalStops} />
                    <Fact label="Travellers" value={m.travellers} />
                    <Fact label="Pace" value={m.pace} />
                </View>
            </View>
            <View style={{ position: 'absolute', bottom: 30, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: C.muted }}>
                <Text>
                    <Text style={{ fontFamily: 'Serif', fontSize: 13, color: C.ink }}>iWill</Text>
                    <Text style={{ fontFamily: 'Serif', fontStyle: 'italic', fontSize: 13, color: C.muted }}>Travel</Text>
                    {'   '}Every place checked against live map data
                </Text>
                {m.tripUrl ? (
                    <Link src={m.tripUrl} style={s.link}>
                        Open this trip online →
                    </Link>
                ) : (
                    <Text>Generated {m.generatedAt}</Text>
                )}
            </View>
        </Page>
    );
}

// ── At a glance ───────────────────────────────────────────────────────────────

function Overview({ m }: { m: ItineraryPdfModel }) {
    return (
        <Page size="A4" style={s.page}>
            <Text style={s.eyebrow}>At a glance</Text>
            <Text style={s.h2}>Your trip to {m.destination.split(',')[0]}</Text>
            {m.overview && <Text style={[s.p, { marginTop: 4 }]}>{m.overview}</Text>}

            <View style={{ flexDirection: 'row', marginTop: 18, padding: 14, backgroundColor: C.soft, borderRadius: 6 }}>
                <Fact label="Dates" value={m.dateRange} />
                <Fact label="Budget" value={m.budgetLevel} />
                <Fact label="Getting around" value={m.transport} />
            </View>

            {m.whyThisPlan.length > 0 && (
                <View style={s.section} minPresenceAhead={60}>
                    <Text style={s.h3}>Why this plan works</Text>
                    <Bullets items={m.whyThisPlan} />
                </View>
            )}

            <View style={s.section} minPresenceAhead={80}>
                <Text style={s.h3}>Day by day</Text>
                {m.days.map((d) => (
                    <View key={d.anchor} wrap={false} style={{ flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
                        <Link src={`#${d.anchor}`} style={{ width: 52, textDecoration: 'none' }}>
                            <Text style={{ fontFamily: 'Serif', fontSize: 14, color: C.accent }}>Day {d.day}</Text>
                        </Link>
                        <View style={{ flex: 1 }}>
                            <Link src={`#${d.anchor}`} style={{ textDecoration: 'none' }}>
                                <Text style={{ fontSize: 10, color: C.ink, fontWeight: 500 }}>{d.title}</Text>
                            </Link>
                            <Text style={s.small}>
                                {[d.dateLabel, d.area, `${d.stops.length} stops`].filter(Boolean).join('  ·  ')}
                                {'   '}
                                <Link src={`#${d.anchor}`} style={s.link}>
                                    Go to day →
                                </Link>
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            {m.weather.length > 0 && (
                <View style={s.section} wrap={false}>
                    <Text style={s.h3}>Weather outlook</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {m.weather.map((w) => (
                            <View key={w.date} style={{ width: '25%', paddingRight: 8, marginBottom: 8 }}>
                                <Text style={{ fontSize: 8, color: C.muted }}>{w.date}</Text>
                                <Text style={{ fontSize: 9, color: C.ink }}>{w.label}</Text>
                            </View>
                        ))}
                    </View>
                    <Text style={s.small}>Forecast at the time of planning — check again 48 hours before you go.</Text>
                </View>
            )}

            {(m.budgetEstimate || m.bestTime || m.esg?.grade) && (
                <View style={[s.section, { flexDirection: 'row' }]} wrap={false}>
                    {m.budgetEstimate && (
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={s.h3}>Budget estimate</Text>
                            <Text style={s.p}>{m.budgetEstimate}</Text>
                        </View>
                    )}
                    {m.bestTime && (
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={s.h3}>Best time to visit</Text>
                            <Text style={s.p}>{m.bestTime}</Text>
                        </View>
                    )}
                    {m.esg?.grade && (
                        <View style={{ flex: 0.7 }}>
                            <Text style={s.h3}>Footprint</Text>
                            <Text style={s.p}>
                                Grade {m.esg.grade}
                                {m.esg.co2Kg ? ` · about ${Math.round(m.esg.co2Kg)} kg CO₂` : ''}
                            </Text>
                        </View>
                    )}
                </View>
            )}
            <Footer title={m.title} />
        </Page>
    );
}

// ── Day pages ─────────────────────────────────────────────────────────────────

function StopCard({ stop, city }: { stop: PdfStop; city: string }) {
    const hasPhoto = !!stop.photo;
    return (
        <View wrap={false} style={{ flexDirection: 'row', marginTop: 12 }}>
            {/* number rail */}
            <View style={{ width: 26, alignItems: 'center' }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 8.5, fontWeight: 600 }}>{stop.index}</Text>
                </View>
            </View>

            <View style={{ flex: 1, borderWidth: 0.5, borderColor: C.line, borderRadius: 6, padding: 11 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 8, color: C.accent, fontWeight: 600 }}>{stop.time || ''}</Text>
                    <Text style={{ fontSize: 7.5, color: stop.verified ? C.sage : C.muted }}>
                        {stop.verified ? 'Verified on Google Maps' : 'Not verified — confirm before visiting'}
                    </Text>
                </View>

                <Link src={stop.mapsUrl} style={{ textDecoration: 'none' }}>
                    <Text style={{ fontFamily: 'Serif', fontSize: 15, color: C.ink, lineHeight: 1.15 }}>{stop.title}</Text>
                </Link>
                {(stop.category || stop.rating) && (
                    <Text style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>
                        {[stop.category, stars(stop.rating, stop.totalRatings)].filter(Boolean).join('  ·  ')}
                    </Text>
                )}

                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    {hasPhoto && (
                        <Link src={stop.mapsUrl} style={{ marginRight: 10 }}>
                            <Image src={stop.photo!} style={{ width: 132, height: 96, borderRadius: 4, objectFit: 'cover' }} />
                        </Link>
                    )}
                    <View style={{ flex: 1 }}>
                        {stop.description && <Text style={[s.p, { fontSize: 9 }]}>{stop.description}</Text>}
                    </View>
                </View>

                <View style={{ marginTop: 6 }}>
                    {stop.address && (
                        <InfoLine label="Address">
                            <Link src={stop.mapsUrl} style={s.link}>
                                {stop.address}
                            </Link>
                        </InfoLine>
                    )}
                    {!stop.address && (
                        <InfoLine label="Location">
                            <Link src={stop.mapsUrl} style={s.link}>
                                Find on Google Maps ({city})
                            </Link>
                        </InfoLine>
                    )}
                    {stop.hoursToday && (
                        <InfoLine label="Hours">
                            <Text style={stop.closedToday ? { color: C.clay, fontWeight: 600 } : undefined}>{stop.hoursToday}</Text>
                        </InfoLine>
                    )}
                    {(stop.duration || stop.cost) && (
                        <InfoLine label="Plan for">{[stop.duration, stop.cost].filter(Boolean).join('  ·  ')}</InfoLine>
                    )}
                    {stop.mealNearby && <InfoLine label="Eat nearby">{stop.mealNearby}</InfoLine>}
                    {stop.accessibility && <InfoLine label="Access">{stop.accessibility}</InfoLine>}
                </View>

                {stop.tip && (
                    <View style={{ marginTop: 8, padding: 7, backgroundColor: C.accentSoft, borderRadius: 4 }}>
                        <Text style={{ fontSize: 8.5, color: C.body }}>
                            <Text style={{ fontWeight: 600, color: C.accent }}>Tip  </Text>
                            {stop.tip}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

function Connector({ stop }: { stop: PdfStop }) {
    const t = stop.transitNext;
    if (!t) return null;
    const mode = String(t.mode || 'WALK').toUpperCase();
    const verb = mode === 'DRIVE' ? 'drive' : mode === 'TRANSIT' ? 'by transit' : mode === 'BICYCLE' ? 'cycle' : 'walk';
    const label = [t.minutes ? `${t.minutes} min ${verb}` : `Next stop`, t.km ? `${t.km} km` : ''].filter(Boolean).join(' · ');
    return (
        <View style={{ flexDirection: 'row', marginTop: 6, marginLeft: 12 }} wrap={false}>
            <View style={{ width: 14, borderLeftWidth: 1, borderLeftColor: C.line, borderStyle: 'dashed', height: 14 }} />
            <Text style={{ fontSize: 8, color: C.muted }}>
                ↓ {label}
                {t.url ? (
                    <>
                        {'   '}
                        <Link src={t.url} style={s.link}>
                            Directions
                        </Link>
                    </>
                ) : null}
            </Text>
        </View>
    );
}

function DaySection({ d, m }: { d: PdfDay; m: ItineraryPdfModel }) {
    const city = m.destination.split(',')[0];
    return (
        <Page size="A4" style={s.page}>
            <View id={d.anchor}>
                <Text style={s.eyebrow}>
                    Day {d.day}
                    {d.dateLabel ? `  ·  ${d.dateLabel}` : ''}
                </Text>
            </View>
            <Text style={s.h2}>{d.title}</Text>
            {d.area && <Text style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{d.area}</Text>}
            {d.summary && <Text style={s.p}>{d.summary}</Text>}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                <Text style={s.chip}>{d.stops.length} stops</Text>
                {d.totalTransitMinutes > 0 && <Text style={s.chip}>{d.totalTransitMinutes} min between stops</Text>}
                {d.totalKm > 0 && <Text style={s.chip}>{d.totalKm} km</Text>}
                {d.routeUrl && (
                    <Link src={d.routeUrl} style={[s.link, { fontSize: 8.5, marginLeft: 4 }]}>
                        Open today's route in Google Maps →
                    </Link>
                )}
            </View>

            {d.map && (
                <View wrap={false} style={{ marginTop: 12 }}>
                    {d.routeUrl ? (
                        <Link src={d.routeUrl}>
                            <Image src={d.map} style={{ width: '100%', height: 220, borderRadius: 6, objectFit: 'cover' }} />
                        </Link>
                    ) : (
                        <Image src={d.map} style={{ width: '100%', height: 220, borderRadius: 6, objectFit: 'cover' }} />
                    )}
                    <Text style={[s.small, { marginTop: 3 }]}>Numbers on the map match the stops below.</Text>
                </View>
            )}

            <View style={{ marginTop: 6 }}>
                {d.stops.map((stop, i) => (
                    // The "↓ 12 min walk · Directions" line travels WITH the next card,
                    // so it can never be stranded at the top or bottom of a page.
                    <View key={stop.index} wrap={false}>
                        {i > 0 && <Connector stop={d.stops[i - 1]} />}
                        <StopCard stop={stop} city={city} />
                    </View>
                ))}
            </View>

            {(d.eat.length > 0 || d.more.length > 0) && (
                <View style={[s.section, { flexDirection: 'row' }]} wrap={false}>
                    {d.eat.length > 0 && (
                        <View style={{ flex: 1, paddingRight: 14 }}>
                            <Text style={s.h3}>Where to eat nearby</Text>
                            {d.eat.map((l, i) => (
                                <Text key={i} style={{ fontSize: 9, marginBottom: 3 }}>
                                    <Link src={l.url} style={s.link}>
                                        {l.label}
                                    </Link>
                                    {l.note ? <Text style={{ color: C.muted }}>{`  ${l.note}`}</Text> : null}
                                </Text>
                            ))}
                        </View>
                    )}
                    {d.more.length > 0 && (
                        <View style={{ flex: 1 }}>
                            <Text style={s.h3}>If you have extra time</Text>
                            {d.more.map((l, i) => (
                                <Text key={i} style={{ fontSize: 9, marginBottom: 3 }}>
                                    <Link src={l.url} style={s.link}>
                                        {l.label}
                                    </Link>
                                </Text>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {d.transportTip && (
                <View style={{ marginTop: 14 }} wrap={false}>
                    <Text style={s.small}>Getting around: {d.transportTip}</Text>
                </View>
            )}
            <Footer title={m.title} />
        </Page>
    );
}

// ── Good to know ──────────────────────────────────────────────────────────────

function GoodToKnow({ m }: { m: ItineraryPdfModel }) {
    const blocks: { title: string; items: string[] }[] = [
        { title: 'Travel tips', items: m.travelTips },
        { title: 'Local customs', items: m.localCustoms },
        { title: 'Staying safe', items: m.safetyAdvice },
        { title: 'Saving money', items: m.budgetTips },
    ].filter((b) => b.items.length > 0);

    const checklist = [
        'Passport valid for your whole stay (many countries require 6 months).',
        'Visa or entry authorisation checked for your nationality.',
        'Travel insurance that covers your activities.',
        'Bank card that works abroad, plus a little local cash.',
        'Offline maps and this PDF saved on your phone.',
    ];

    return (
        <Page size="A4" style={s.page}>
            <Text style={s.eyebrow}>Good to know</Text>
            <Text style={s.h2}>Before and during your trip</Text>

            {(m.crowds || m.physical) && (
                <View style={{ flexDirection: 'row', marginTop: 10, padding: 12, backgroundColor: C.soft, borderRadius: 6 }} wrap={false}>
                    {m.crowds && (
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={{ fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Crowds</Text>
                            <Text style={[s.p, { marginTop: 2 }]}>{m.crowds}</Text>
                        </View>
                    )}
                    {m.physical && (
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Effort</Text>
                            <Text style={[s.p, { marginTop: 2 }]}>{m.physical}</Text>
                        </View>
                    )}
                </View>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {blocks.map((b) => (
                    <View key={b.title} style={{ width: '50%', paddingRight: 14, marginTop: 14 }} wrap={false}>
                        <Text style={s.h3}>{b.title}</Text>
                        <Bullets items={b.items} />
                    </View>
                ))}
            </View>

            <View style={[s.section, { padding: 14, borderWidth: 0.5, borderColor: C.line, borderRadius: 6 }]} wrap={false}>
                <Text style={s.h3}>Before you go</Text>
                {checklist.map((c, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 5 }}>
                        <View style={{ width: 9, height: 9, borderWidth: 0.8, borderColor: C.muted, borderRadius: 2, marginRight: 8, marginTop: 1.5 }} />
                        <Text style={{ flex: 1, fontSize: 9 }}>{c}</Text>
                    </View>
                ))}
                <Text style={[s.small, { marginTop: 4 }]}>
                    Check entry rules for your passport:{' '}
                    <Link src={`${m.siteUrl}/visa-hub`} style={s.link}>
                        {m.siteUrl.replace(/^https?:\/\//, '')}/visa-hub
                    </Link>
                </Text>
            </View>

            <View style={[s.section]} wrap={false}>
                <Text style={s.small}>
                    Opening hours, ratings and prices come from live data
                    {m.verifiedAt ? ` checked on ${m.verifiedAt}` : ''}. They can change — tap any place name in this document
                    to confirm on Google Maps before you go. Generated {m.generatedAt}.
                </Text>
            </View>
            <Footer title={m.title} />
        </Page>
    );
}

// ── Flights & stays ───────────────────────────────────────────────────────────

function Bookings({ m }: { m: ItineraryPdfModel }) {
    if (!m.flights.length && !m.hotels.length) return null;
    const row = { flexDirection: 'row' as const, paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: C.line };
    return (
        <Page size="A4" style={s.page}>
            <Text style={s.eyebrow}>Flights & stays</Text>
            <Text style={s.h2}>Getting there and where to sleep</Text>
            <Text style={s.small}>Prices marked “estimate” are typical ranges, not live fares. Tap a link to see current prices.</Text>

            {m.flights.length > 0 && (
                <View style={s.section}>
                    <Text style={s.h3}>Flights</Text>
                    {m.flights.map((f, i) => (
                        <View key={i} style={row} wrap={false}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 9.5, color: C.ink, fontWeight: 500 }}>{f.route}</Text>
                                <Text style={s.small}>
                                    {[f.airline, f.date, f.duration, f.stops != null ? (f.stops === 0 ? 'Direct' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`) : '']
                                        .filter(Boolean)
                                        .join('  ·  ')}
                                </Text>
                            </View>
                            <View style={{ width: 120, alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 10, color: C.ink }}>
                                    {f.price}
                                    {f.isEstimate ? <Text style={s.small}> estimate</Text> : null}
                                </Text>
                                {f.url && (
                                    <Link src={f.url} style={[s.link, { fontSize: 8 }]}>
                                        Compare prices →
                                    </Link>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {m.hotels.length > 0 && (
                <View style={s.section}>
                    <Text style={s.h3}>Places to stay</Text>
                    {m.hotels.map((h, i) => (
                        <View key={i} style={row} wrap={false}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 9.5, color: C.ink, fontWeight: 500 }}>{h.name}</Text>
                                <Text style={s.small}>{[h.stars ? `${h.stars}-star` : '', h.roomType, h.source].filter(Boolean).join('  ·  ')}</Text>
                            </View>
                            <View style={{ width: 140, alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 10, color: C.ink }}>
                                    {h.price}
                                    {h.isEstimate ? <Text style={s.small}> estimate</Text> : null}
                                </Text>
                                {h.url && (
                                    <Link src={h.url} style={[s.link, { fontSize: 8 }]}>
                                        See availability →
                                    </Link>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}
            <Footer title={m.title} />
        </Page>
    );
}

// ── Document ──────────────────────────────────────────────────────────────────

export function ItineraryDocument({ model }: { model: ItineraryPdfModel }) {
    return (
        <Document
            title={model.title}
            author="iWillTravel"
            subject={`Travel itinerary — ${model.destination}`}
            keywords={`${model.destination}, itinerary, travel plan`}
            creator="iWillTravel"
            producer="iWillTravel"
            language="en"
        >
            <Cover m={model} />
            <Overview m={model} />
            {model.days.map((d) => (
                <DaySection key={d.anchor} d={d} m={model} />
            ))}
            <GoodToKnow m={model} />
            <Bookings m={model} />
        </Document>
    );
}
