'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentLog } from '@/app/api/agent-itinerary/types';

interface LiveAgentTerminalProps {
    logs: AgentLog[];
    isComplete: boolean;
}

export function LiveAgentTerminal({ logs, isComplete }: LiveAgentTerminalProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [logs]);

    const getStatusIcon = (status: AgentLog['status']) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
            case 'error': return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
            default: return <Info className="w-3.5 h-3.5 text-sky-500" />;
        }
    };

    const getStatusColor = (status: AgentLog['status']) => {
        switch (status) {
            case 'success': return 'text-emerald-400';
            case 'error': return 'text-rose-400';
            default: return 'text-sky-400';
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto my-8">
            <div className="relative group">
                {/* Terminal Window Frame */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-blue-500/20 to-emerald-500/30 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative bg-black/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            </div>
                            <div className="ml-3 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                <Terminal className="w-3.5 h-3.5" />
                                <span>agent_workbench_v1.sh</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isComplete && (
                                <div className="flex items-center gap-2 text-[10px] font-mono text-primary animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>ORCHESTRATING...</span>
                                </div>
                            )}
                            {isComplete && (
                                <span className="text-[10px] font-mono text-emerald-400 font-bold">COMPLETED</span>
                            )}
                        </div>
                    </div>

                    {/* Terminal Content */}
                    <div
                        ref={scrollRef}
                        className="h-[400px] overflow-y-auto p-6 font-mono text-sm scrollbar-hide relative"
                    >
                        {/* CRT Scanline Effect Overlay */}
                        <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

                        <div className="space-y-3">
                            <div className="text-sky-400 mb-4">
                                <span className="text-white font-bold">System:</span> Initializing iWillTravel Agent Pipeline...
                                <br />
                                <span className="text-muted-foreground opacity-60 text-xs">Connecting to agent orchestration layer...</span>
                            </div>

                            <AnimatePresence mode="popLayout">
                                {logs.map((log, idx) => (
                                    <motion.div
                                        key={`${log.agent}-${idx}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex items-start gap-3 group/line"
                                    >
                                        <span className="text-muted-foreground/40 text-[10px] pt-1 shrink-0 w-20">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/90 font-bold">[{log.agent}]</span>
                                                {getStatusIcon(log.status)}
                                                <span className={cn("text-xs font-bold uppercase tracking-tighter", getStatusColor(log.status))}>
                                                    {log.status}
                                                </span>
                                                <span className="text-muted-foreground/60 text-[10px]">
                                                    ({log.durationMs}ms)
                                                </span>
                                            </div>
                                            {log.details && (
                                                <div className="text-muted-foreground/80 text-xs pl-5 border-l border-white/10 ml-1 py-1">
                                                    {log.details}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {!isComplete && (
                                <div className="flex items-center gap-2 text-primary/60 text-xs animate-pulse">
                                    <span className="w-2 h-4 bg-primary animate-bounce" />
                                    <span>Awaiting agent response...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
