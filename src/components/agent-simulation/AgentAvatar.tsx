'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentLog } from '@/app/api/agent-itinerary/types';

interface AgentAvatarProps {
    agentName: string;
    status: AgentLog['status'] | 'idle';
    message?: string;
    className?: string;
}

export function AgentAvatar({ agentName, status, message, className }: AgentAvatarProps) {
    const getStatusColor = () => {
        switch (status) {
            case 'success': return 'ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
            case 'error': return 'ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]';
            case 'idle': return 'ring-white/20 shadow-none';
            default: return 'ring-[#00D4FF] shadow-[0_0_30px_rgba(0,212,255,0.6)]'; // running
        }
    };

    const getBgColor = () => {
        switch (status) {
            case 'success': return 'bg-emerald-500/20';
            case 'error': return 'bg-rose-500/20';
            case 'idle': return 'bg-white/5';
            default: return 'bg-[#00D4FF]/20';
        }
    };

    return (
        <motion.div 
            className={cn("relative flex flex-col items-center z-20", className)}
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        >
            {/* Status Icon Indicator (Top Right) */}
            <div className="absolute -top-2 -right-2 z-30">
                <AnimatePresence mode="wait">
                    {status === 'success' && (
                        <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 bg-black rounded-full" />
                        </motion.div>
                    )}
                    {status === 'error' && (
                        <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <AlertCircle className="w-5 h-5 text-rose-400 bg-black rounded-full" />
                        </motion.div>
                    )}
                    {status !== 'idle' && status !== 'success' && status !== 'error' && (
                        <motion.div key="running" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Loader2 className="w-5 h-5 text-[#00D4FF] animate-spin bg-black rounded-full p-[1px]" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Avatar Orb */}
            <motion.div 
                className={cn(
                    "w-12 h-12 rounded-full border-2 ring-2 ring-offset-2 ring-offset-black backdrop-blur-md flex items-center justify-center transition-all duration-300",
                    getStatusColor(),
                    getBgColor(),
                    status === 'error' ? "animate-[shake_0.5s_ease-in-out_infinite]" : ""
                )}
                animate={status !== 'idle' && status !== 'success' && status !== 'error' ? { 
                    y: [0, -5, 0] 
                } : {}}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
                <Bot className={cn(
                    "w-6 h-6",
                    status === 'idle' ? "text-white/50" : "text-white"
                )} />
            </motion.div>

            {/* Agent Label */}
            <div className="mt-3 text-center w-max">
                <span className="text-[10px] uppercase font-mono tracking-widest text-white/70 font-bold bg-black/60 px-2 py-1 rounded-md border border-white/10 backdrop-blur-sm">
                    {agentName.replace(/^Agent \d+:\s*/, '').replace(' Agent', '')}
                </span>
            </div>

            {/* Message Bubble (Optional) */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] text-[10px] px-3 py-1.5 rounded-full backdrop-blur-md"
                    >
                        {message}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
