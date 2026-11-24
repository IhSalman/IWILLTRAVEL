'use client';

import React from 'react';
import type { AgentLog } from '@/app/api/agent-itinerary/types';
import { OfficeFloorplan } from './OfficeFloorplan';
import { Workstation } from './Workstation';
import { motion } from 'framer-motion';

interface AgentSimulationContainerProps {
    logs: AgentLog[];
    isComplete: boolean;
    loadingStage: string | null;
}

export function AgentSimulationContainer({ logs, isComplete, loadingStage }: AgentSimulationContainerProps) {
    // Filter to get the latest status for each unique agent
    const agentStates = React.useMemo(() => {
        const latestLogs = new Map<string, AgentLog>();
        logs.forEach(log => {
            const existing = latestLogs.get(log.agent);
            if (!existing || log.status === 'success' || log.status === 'error') {
                latestLogs.set(log.agent, log);
            } else if (existing.status !== 'success' && existing.status !== 'error') {
                latestLogs.set(log.agent, log);
            }
        });
        return latestLogs;
    }, [logs]);

    // Exact 8-agent keys emitted by src/lib/agents/pipeline.ts
    const DESK_LAYOUTS = [
        { key: 'Agent 1: Discovery', label: 'PLACES DISCOVERY', className: 'top-[18%] left-[18%]', orientation: 'bottom' as const, colorHash: 0 },
        { key: 'Agent 2: Planning', label: 'DAY ARCHITECT', className: 'top-[44%] left-[15%]', orientation: 'right' as const, colorHash: 1 },
        { key: 'Agent 3: Research', label: 'FLIGHTS & STAYS', className: 'top-[68%] left-[15%]', orientation: 'right' as const, colorHash: 2 },

        { key: 'Agent 4: Logic Checker', label: 'LOGIC & BUDGET', className: 'bottom-[26%] left-[44%]', orientation: 'top' as const, colorHash: 3 },
        { key: 'Agent 5: Experience', label: 'LOCAL INSIDER', className: 'bottom-[26%] left-[65%]', orientation: 'top' as const, colorHash: 4 },
        { key: 'Agent 6: Logistics', label: 'ROUTE PHYSICS', className: 'bottom-[10%] left-[44%]', orientation: 'bottom' as const, colorHash: 5 },
        { key: 'Agent 7: Sustainability', label: 'ESG & CARBON', className: 'bottom-[10%] left-[65%]', orientation: 'bottom' as const, colorHash: 3 },

        { key: 'Agent 8: Composer', label: 'COMPOSER', className: 'top-[24%] right-[18%]', orientation: 'bottom' as const, colorHash: 6 },
    ];

    const STAGE_TO_AGENTS: Record<string, string[]> = {
        planning: ['Agent 1: Discovery', 'Agent 2: Planning'],
        researching: ['Agent 3: Research', 'Agent 4: Logic Checker'],
        enriching: ['Agent 5: Experience'],
        optimizing: ['Agent 6: Logistics', 'Agent 7: Sustainability'],
        composing: ['Agent 8: Composer'],
    };

    const completedCount = Array.from(agentStates.values()).filter(l => l.status === 'success').length;

    return (
        <div className="w-full my-6 relative">
            <OfficeFloorplan>
                {DESK_LAYOUTS.map((desk) => {
                    const logState = agentStates.get(desk.key);

                    const isStageActive = loadingStage && STAGE_TO_AGENTS[loadingStage]?.includes(desk.key);
                    const isRunning = Boolean(isStageActive && !logState) || (logState?.status as string) === 'running';
                    const isActive = Boolean(isRunning || logState?.status === 'error');

                    const avatarStatus = isRunning ? 'running' : (logState ? logState.status : 'idle');

                    const displayLogState = logState || (isRunning ? {
                        agent: desk.key,
                        status: 'running' as any,
                        durationMs: 0,
                        timestamp: ''
                    } : undefined);

                    const isVisible = !!logState || !!isStageActive || isComplete;

                    return (
                        <Workstation
                            key={desk.key}
                            agentName={desk.key}
                            logState={displayLogState}
                            status={avatarStatus as 'idle' | 'running' | 'success' | 'error'}
                            isActive={isActive}
                            isVisible={isVisible}
                            colorHash={desk.colorHash}
                            orientation={desk.orientation}
                            className={`absolute ${desk.className}`}
                            label={desk.label}
                        />
                    );
                })}
            </OfficeFloorplan>

            {/* Apple Liquid Glass Live Telemetry Pill */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 apple-liquid-glass px-5 py-2 rounded-full z-30"
            >
                <div className="flex items-center gap-3 text-xs font-mono tracking-wider text-sky-300 tabular-nums">
                    {!isComplete ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                            <span>8-AGENT PIPELINE ACTIVE · {completedCount}/8 VERIFIED</span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#80ad88]" />
                            <span className="text-emerald-300 font-semibold">8/8 AGENTS COMPLETE</span>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
