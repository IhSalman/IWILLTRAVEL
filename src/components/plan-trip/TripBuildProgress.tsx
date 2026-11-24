'use client';

/**
 * TripBuildProgress — minimal "flight in progress" loader for the 8-agent pipeline.
 * A plane flies along a route as agents finish; each step checks off in plain language.
 * Uses the same log/stage data as the previous agent-office simulation.
 */
import { useEffect, useMemo, useRef } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent } from 'framer-motion';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import type { AgentLog } from '@/app/api/agent-itinerary/types';

const STEPS = [
    { key: 'Agent 1: Discovery', label: 'Finding real places', note: 'Live map data' },
    { key: 'Agent 2: Planning', label: 'Sketching your days', note: 'Day-by-day outline' },
    { key: 'Agent 3: Research', label: 'Checking hours & ratings', note: 'Flights and stays too' },
    { key: 'Agent 4: Logic Checker', label: 'Checking the budget', note: 'Times and costs add up' },
    { key: 'Agent 5: Experience', label: 'Adding local favourites', note: 'Food and hidden spots' },
    { key: 'Agent 6: Logistics', label: 'Ordering the route', note: 'Fewer back-and-forths' },
    { key: 'Agent 7: Sustainability', label: 'Estimating footprint', note: 'CO₂ per day' },
    { key: 'Agent 8: Composer', label: 'Writing your plan', note: 'Almost there' },
];

const STAGE_TO_AGENTS: Record<string, string[]> = {
    planning: ['Agent 1: Discovery', 'Agent 2: Planning'],
    researching: ['Agent 3: Research', 'Agent 4: Logic Checker'],
    enriching: ['Agent 5: Experience'],
    optimizing: ['Agent 6: Logistics', 'Agent 7: Sustainability'],
    composing: ['Agent 8: Composer'],
};

const ROUTE = 'M 20 70 C 140 -10, 300 -10, 420 40 S 640 110, 780 30';
const PLANE =
    'M 12 0 L -6 -2 L -10 -9 L -13 -9 L -10 -2 L -14 -1.5 L -16 -5 L -18 -5 L -17 0 L -18 5 L -16 5 L -14 1.5 L -10 2 L -13 9 L -10 9 L -6 2 Z';

type Status = 'idle' | 'running' | 'success' | 'error';

interface Props {
    logs: AgentLog[];
    isComplete: boolean;
    loadingStage: string | null;
    destination?: string;
}

export function TripBuildProgress({ logs, isComplete, loadingStage, destination }: Props) {
    const statuses = useMemo(() => {
        const latest = new Map<string, Status>();
        for (const log of logs) {
            const prev = latest.get(log.agent);
            const next = log.status as Status;
            // never downgrade a finished agent back to running
            if (prev === 'success' || prev === 'error') continue;
            latest.set(log.agent, next);
        }
        const active = loadingStage ? STAGE_TO_AGENTS[loadingStage] ?? [] : [];
        return STEPS.map(s => {
            const st = latest.get(s.key);
            if (isComplete) return 'success' as Status;
            if (st) return st;
            return active.includes(s.key) ? ('running' as Status) : ('idle' as Status);
        });
    }, [logs, loadingStage, isComplete]);

    const done = statuses.filter(s => s === 'success').length;
    const progress = isComplete ? 1 : Math.max(0.04, done / STEPS.length);

    // Fly the plane along the measured route as progress changes.
    const measureRef = useRef<SVGPathElement>(null);
    const planeRef = useRef<SVGGElement>(null);
    const travelled = useMotionValue(0);

    useEffect(() => {
        const controls = animate(travelled, progress, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
        return () => controls.stop();
    }, [progress, travelled]);

    useMotionValueEvent(travelled, 'change', v => {
        const path = measureRef.current;
        const plane = planeRef.current;
        if (!path || !plane) return;
        const len = path.getTotalLength();
        const d = Math.min(Math.max(v, 0), 1) * len;
        const p = path.getPointAtLength(d);
        const ahead = path.getPointAtLength(Math.min(d + 1, len));
        const angle = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI;
        plane.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${angle})`);
    });

    return (
        <div className="w-full rounded-[28px] border border-white/[0.08] bg-card/60 p-6 sm:p-10">
            {/* Route + plane */}
            <div className="relative" aria-hidden="true">
                <svg viewBox="0 0 800 110" className="w-full h-auto overflow-visible" fill="none">
                    <path d={ROUTE} stroke="rgba(237,234,227,0.12)" strokeWidth="1.2" strokeDasharray="3 7" />
                    <motion.path
                        d={ROUTE}
                        stroke="#f3b87f"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: progress }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <circle cx="20" cy="70" r="4" fill="#f3b87f" />
                    <circle cx="780" cy="30" r="4" fill="#0b0c0f" stroke="#f3b87f" strokeWidth="1.5" />
                    <path ref={measureRef} d={ROUTE} stroke="none" />
                    <g ref={planeRef}>
                        <path d={PLANE} fill="#edeae3" />
                    </g>
                </svg>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>Your request</span>
                    <span>{destination || 'Your trip'}</span>
                </div>
            </div>

            {/* Steps */}
            <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                {STEPS.map((step, i) => {
                    const status = statuses[i];
                    return (
                        <li
                            key={step.key}
                            className="flex items-center gap-3 py-2.5 border-b border-white/[0.05]"
                        >
                            <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                    status === 'success'
                                        ? 'border-sunrise-300 bg-sunrise-300 text-background'
                                        : status === 'running'
                                            ? 'border-sunrise-300/60 text-sunrise-300'
                                            : status === 'error'
                                                ? 'border-rose-400/60 text-rose-300'
                                                : 'border-white/[0.12] text-slate-600'
                                }`}
                            >
                                {status === 'success' ? (
                                    <Check className="h-3.5 w-3.5" />
                                ) : status === 'running' ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : status === 'error' ? (
                                    <AlertCircle className="h-3.5 w-3.5" />
                                ) : (
                                    <span className="text-[10px]">{i + 1}</span>
                                )}
                            </span>
                            <span className="min-w-0">
                                <span
                                    className={`block text-sm transition-colors ${
                                        status === 'idle' ? 'text-slate-500' : 'text-slate-100'
                                    }`}
                                >
                                    {step.label}
                                </span>
                                <span className="block text-xs text-slate-600">{step.note}</span>
                            </span>
                        </li>
                    );
                })}
            </ol>

            <p className="mt-6 text-center text-xs text-slate-500 tabular-nums">
                {isComplete ? 'Done — opening your plan' : `${done} of ${STEPS.length} steps done · usually under a minute`}
            </p>
        </div>
    );
}
