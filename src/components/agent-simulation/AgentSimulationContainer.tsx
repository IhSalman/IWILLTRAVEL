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

    // Hardcode specific positions and details for each agent desk on the map
    const DESK_LAYOUTS = [
        { key: 'Agent 1: Planning', label: 'PLANNING DEPT', className: 'top-[20%] left-[20%]', orientation: 'bottom' as const, colorHash: 0 },
        { key: 'Agent 2: Research', label: 'RESEARCH', className: 'top-[45%] left-[15%]', orientation: 'right' as const, colorHash: 1 },
        { key: 'Agent 3: Experience', label: 'LOCAL EXP', className: 'top-[65%] left-[15%]', orientation: 'right' as const, colorHash: 2 },
        
        { key: 'Agent 4: Flight Analysis', label: 'FLIGHT OP', className: 'bottom-[25%] left-[45%]', orientation: 'top' as const, colorHash: 3 },
        { key: 'Agent 5: Budget', label: 'FINANCE', className: 'bottom-[25%] left-[65%]', orientation: 'top' as const, colorHash: 4 },
        { key: 'Agent 6: Route', label: 'LOGISTICS', className: 'bottom-[10%] left-[45%]', orientation: 'bottom' as const, colorHash: 5 },
        { key: 'Agent 8: Sustainability', label: 'ESG COMPLIANCE', className: 'bottom-[10%] left-[65%]', orientation: 'bottom' as const, colorHash: 3 },
        
        { key: 'Agent 9: Composer', label: 'SYNTHESIS (BOSS)', className: 'top-[25%] right-[20%]', orientation: 'bottom' as const, colorHash: 6 },
    ];

    const STAGE_TO_AGENTS: Record<string, string[]> = {
        planning: ['Agent 1: Planning'],
        researching: ['Agent 2: Research', 'Agent 3: Experience'],
        optimizing: ['Agent 4: Flight Analysis', 'Agent 5: Budget', 'Agent 6: Route', 'Agent 8: Sustainability'],
        composing: ['Agent 9: Composer']
    };

    return (
        <div className="w-full my-8 relative">
            <OfficeFloorplan>
                {DESK_LAYOUTS.map((desk) => {
                    const logState = agentStates.get(desk.key);
                    
                    // Determine if the agent is actively working
                    const isStageActive = loadingStage && STAGE_TO_AGENTS[loadingStage]?.includes(desk.key);
                    const isRunning = isStageActive && !logState;
                    const isActive = isRunning || logState?.status === 'error';

                    // Derive the exact union string for EmployeeAvatar
                    const avatarStatus = isRunning ? 'running' : (logState ? logState.status : 'idle');

                    // Create an artificial logState for the Workstation if it's currently running
                    const displayLogState = logState || (isRunning ? {
                        agent: desk.key,
                        status: 'running' as any,
                        durationMs: 0,
                        timestamp: ''
                    } : undefined);

                    // The agent is visible if it has logs, is currently active, or the whole process is done.
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

            {/* Status HUD (Pinned to bottom center over the floorplan) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full z-30"
            >
                <div className="flex items-center gap-3 text-xs font-mono tracking-widest text-[#00D4FF]">
                    {!isComplete ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
                            ORCHESTRATING DATA FLOW
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                            <span className="text-emerald-400 font-bold">SYNTHESIS COMPLETE</span>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
