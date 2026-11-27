'use client';

/**
 * "How it works" — three steps joined by a flight path that draws itself
 * as you scroll, with a small plane flying along it.
 */
import { useRef } from 'react';
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';

const STEPS = [
    {
        n: '01',
        title: 'Tell us the trip',
        body: 'Destination, dates, budget and the way you like to travel. One sentence is enough.',
    },
    {
        n: '02',
        title: 'We check every place',
        body: 'Specialist agents pull real venues, opening hours, ratings and coordinates from live data before any AI writes a word.',
    },
    {
        n: '03',
        title: 'Get a plan that works',
        body: 'A day-by-day route on a map, in walking order, inside your budget — ready to save, share or export.',
    },
];

// Nodes sit above each step column (column starts ≈ 0%, 34.4%, 68.8% of the width).
const PATH = 'M 6 120 C 120 20, 250 20, 350 92 S 560 170, 694 74 S 900 10, 996 36';
const NODES: [number, number][] = [[6, 120], [350, 92], [694, 74]];

export function FlightPathSteps() {
    const sectionRef = useRef<HTMLElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const planeRef = useRef<SVGGElement>(null);

    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 80%', 'end 60%'] });
    const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.4 });
    const pathLength = useTransform(progress, [0, 1], [0, 1]);

    useMotionValueEvent(progress, 'change', v => {
        const path = pathRef.current;
        const plane = planeRef.current;
        if (!path || !plane) return;
        const len = path.getTotalLength();
        const d = Math.min(Math.max(v, 0), 1) * len;
        const p = path.getPointAtLength(d);
        const ahead = path.getPointAtLength(Math.min(d + 1, len));
        const angle = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI;
        plane.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${angle})`);
        plane.style.opacity = v > 0.01 ? '1' : '0';
    });

    return (
        <section ref={sectionRef} className="relative py-28 md:py-36 px-4 border-t border-white/[0.06]">
            <div className="container max-w-6xl mx-auto">
                <div className="max-w-2xl mb-16 md:mb-8">
                    <span className="eyebrow block mb-4">How it works</span>
                    <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl text-slate-100 leading-[1.02]">
                        From a sentence to a <em className="text-sunrise-300">real route</em> in under a minute.
                    </h2>
                </div>

                {/* Flight path (desktop) */}
                <div className="relative hidden md:block h-[200px] -mb-6" aria-hidden="true">
                    <svg viewBox="0 0 1000 200" className="absolute inset-0 w-full h-full overflow-visible" fill="none">
                        <path d={PATH} stroke="rgba(237,234,227,0.12)" strokeWidth="1.2" strokeDasharray="3 7" />
                        <motion.path
                            ref={pathRef}
                            d={PATH}
                            stroke="#f3b87f"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            style={{ pathLength }}
                        />
                        {NODES.map(([x, y]) => (
                            <circle
                                key={x}
                                cx={x}
                                cy={y}
                                r="5"
                                fill="#0b0c0f"
                                stroke="#f3b87f"
                                strokeWidth="1.5"
                            />
                        ))}
                        <g ref={planeRef} style={{ opacity: 0 }}>
                            {/* simple plane glyph pointing right */}
                            <path
                                d="M 12 0 L -6 -2 L -10 -9 L -13 -9 L -10 -2 L -14 -1.5 L -16 -5 L -18 -5 L -17 0 L -18 5 L -16 5 L -14 1.5 L -10 2 L -13 9 L -10 9 L -6 2 Z"
                                fill="#edeae3"
                            />
                        </g>
                    </svg>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
                    {STEPS.map((s, i) => (
                        <motion.div
                            key={s.n}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                            className="border-t border-white/[0.1] pt-6"
                        >
                            <span className="font-mono text-xs text-sunrise-300 tracking-widest">{s.n}</span>
                            <h3 className="font-heading text-3xl text-slate-100 mt-3 mb-3">{s.title}</h3>
                            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">{s.body}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
