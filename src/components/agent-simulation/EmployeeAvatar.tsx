'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmployeeAvatarProps {
    status: 'idle' | 'running' | 'success' | 'error';
    colorHash: number; // to assign pseudo-random colors to different agents
}

export function EmployeeAvatar({ status, colorHash }: EmployeeAvatarProps) {
    // Generate a consistent color based on the hash
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-cyan-500'];
    const shirtColor = colors[colorHash % colors.length];

    const isTyping = status === 'running';

    return (
        <div className="relative w-12 h-12 flex items-center justify-center pointer-events-none">
            {/* Top-down character container */}
            <motion.div 
                className="relative z-10 flex flex-col items-center"
                animate={isTyping ? { 
                    rotate: [-2, 2, -2],
                    y: [0, -1, 0]
                } : status === 'success' ? {
                    scale: [1, 1.1, 1]
                } : {}}
                transition={isTyping ? { 
                    repeat: Infinity, duration: 0.3, ease: 'easeInOut' 
                } : { duration: 0.5 }}
            >
                {/* Shoulders / Torso */}
                <div className={`w-8 h-4 ${shirtColor} rounded-[20px] shadow-sm flex justify-between absolute top-4`} />
                
                {/* Left Hand (typing animation) */}
                <motion.div 
                    className="w-2.5 h-2.5 bg-[#fcd5b8] rounded-full absolute -left-1 opacity-90 shadow-sm"
                    animate={isTyping ? { y: [-2, 2, -2], x: [-1, 1, -1] } : { y: 6 }}
                    transition={{ repeat: Infinity, duration: 0.2, ease: "linear" }}
                />

                {/* Right Hand (typing animation) */}
                <motion.div 
                    className="w-2.5 h-2.5 bg-[#fcd5b8] rounded-full absolute -right-1 opacity-90 shadow-sm"
                    animate={isTyping ? { y: [2, -2, 2], x: [1, -1, 1] } : { y: 6 }}
                    transition={{ repeat: Infinity, duration: 0.2, delay: 0.1, ease: "linear" }}
                />

                {/* Head */}
                <div className="w-5 h-5 bg-[#fcd5b8] rounded-full z-20 shadow-[-1px_2px_4px_rgba(0,0,0,0.15)] overflow-hidden">
                    {/* Hair (top down) */}
                    <div className="w-full h-2.5 bg-neutral-800" />
                </div>
            </motion.div>

            {/* Status Exclamation or Check (Floating above head in top-down view) */}
            <AnimatePresence>
                {status === 'success' && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-4 -right-2 bg-emerald-500 rounded-full w-4 h-4 flex items-center justify-center z-30 shadow-md border-2 border-[#1e1e1e]"
                    >
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                    </motion.div>
                )}
                {status === 'error' && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-4 -right-2 bg-rose-500 rounded-full w-4 h-4 flex items-center justify-center z-30 shadow-md border-2 border-[#1e1e1e]"
                    >
                        <span className="text-white text-[10px] font-bold leading-none select-none">!</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
