'use client';

import React from 'react';
import { EmployeeAvatar } from './EmployeeAvatar';
import { SpeechBubble } from './SpeechBubble';
import type { AgentLog } from '@/app/api/agent-itinerary/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkstationProps {
    agentName: string;
    logState?: AgentLog;
    status: 'idle' | 'running' | 'success' | 'error';
    isActive: boolean;
    isVisible: boolean;
    colorHash: number;
    orientation?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    label: string;
}

export function Workstation({ agentName, logState, status, isActive, isVisible, colorHash, orientation = 'bottom', className, label }: WorkstationProps) {
    let msg = undefined;
    if (status === 'success') msg = 'Done!';
    else if (status === 'error') msg = 'Error!';
    else if (logState?.details && status !== 'idle') {
         msg = logState.details.length > 20 ? logState.details.substring(0, 20) + '...' : logState.details;
    } else if (status === 'running') {
        msg = 'Working...';
    }

    // Adjust employee position based on desk orientation
    const getEmployeePosition = () => {
        switch (orientation) {
            case 'top': return '-top-8 translate-x-3 rotate-180';
            case 'bottom': return '-bottom-8 translate-x-3';
            case 'left': return '-left-8 top-2 rotate-90';
            case 'right': return '-right-8 top-2 -rotate-90';
            default: return '-bottom-8 translate-x-3';
        }
    };

    return (
        <div className={cn("relative z-10", className)}>
            {/* Department Label on floor */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-widest text-neutral-400 uppercase whitespace-nowrap bg-[#1e1e1e] px-1.5 py-0.5 rounded opacity-70">
                {label}
            </div>

            {/* The Desk (Top-down view) */}
            <div className={cn(
                "w-20 h-10 bg-[#8c6b4a] rounded shadow-md border border-[#5c432a] relative transition-colors duration-500",
                isActive ? "border-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.4)]" : ""
            )}>
                {/* Wood texture lines */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,transparent_2px,#000_2px)] bg-[length:10px_10px]" />
                
                {/* The Monitor */}
                <div className={cn(
                    "absolute w-8 h-2 bg-[#2d2d2d] border border-[#1a1a1a] rounded-[1px] transition-all duration-300",
                    orientation === 'bottom' ? "top-1 left-6" :
                    orientation === 'top' ? "bottom-1 left-6" :
                    orientation === 'left' ? "top-4 right-1 w-2 h-8" :
                    "top-4 left-1 w-2 h-8"
                )}>
                    {/* Screen glow when active */}
                    {isActive && (
                        <motion.div 
                            className="absolute inset-x-0 -bottom-3 h-4 bg-[#00D4FF] opacity-30 blur-sm mix-blend-screen"
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        />
                    )}
                </div>
                
                {/* Keyboard */}
                <div className={cn(
                    "absolute w-6 h-1.5 bg-neutral-300 rounded-[1px]",
                    orientation === 'bottom' ? "bottom-1.5 left-7" :
                    orientation === 'top' ? "top-1.5 left-7" :
                    orientation === 'left' ? "top-5 left-1.5 w-1.5 h-6" :
                    "top-5 right-1.5 w-1.5 h-6"
                )} />

                {/* Mouse */}
                <div className={cn(
                    "absolute w-1.5 h-2 bg-neutral-300 rounded-full",
                    orientation === 'bottom' ? "bottom-1.5 right-3" :
                    orientation === 'top' ? "top-1.5 left-3" :
                    orientation === 'left' ? "bottom-3 left-1.5" :
                    "top-3 right-1.5"
                )} />

                {/* Coffee Mug */}
                <div className="absolute w-2 h-2 rounded-full bg-white top-2 right-2 border border-neutral-300 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3d2314] m-[0.5px]" />
                </div>
            </div>

            {/* The Employee (Renders only when visible/working) */}
            <AnimatePresence>
                {isVisible && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5, x: orientation === 'right' ? 50 : orientation === 'left' ? -50 : 0, y: orientation === 'top' ? -50 : orientation === 'bottom' ? 50 : 0 }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={cn("absolute", getEmployeePosition())}
                    >
                        <SpeechBubble message={msg} isActive={isActive && status !== 'success'} />
                        <EmployeeAvatar status={status} colorHash={colorHash} />
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Chair Under Employee */}
            <div className={cn(
                "absolute w-6 h-6 bg-[#2d2d2d] rounded-full shadow-inner border border-[#1a1a1a] -z-10",
                orientation === 'bottom' ? "-bottom-6 left-7" :
                orientation === 'top' ? "-top-6 left-7" :
                orientation === 'left' ? "-left-6 top-2" :
                "-right-6 top-2"
            )} />
        </div>
    );
}
