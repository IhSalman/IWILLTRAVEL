'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface WorkRoomProps {
    id: string;
    title: string;
    icon: LucideIcon;
    isActive: boolean;
    isComplete: boolean;
    children?: React.ReactNode;
    className?: string;
}

export function WorkRoom({ id, title, icon: Icon, isActive, isComplete, children, className }: WorkRoomProps) {
    return (
        <motion.div 
            id={`room-${id}`}
            layout
            className={cn(
                "relative flex w-64 h-64 shrink-0 flex-col items-center justify-center rounded-[40px] border backdrop-blur-xl transition-all duration-700",
                isActive 
                    ? "border-[#f3b87f]/40 bg-[#f3b87f]/5 shadow-[0_0_50px_rgba(0,212,255,0.15)] scale-105 z-10" 
                    : isComplete 
                        ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)] opacity-70"
                        : "border-white/10 bg-white/5 opacity-50 hover:opacity-100",
                className
            )}
        >
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 rounded-[40px] opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[length:20px_20px]" />

            {/* Room Content Container */}
            <div className="relative z-10 flex flex-col items-center w-full h-full p-6">
                
                {/* Room Header */}
                <div className="flex flex-col items-center mb-auto pt-4">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors duration-500",
                        isActive ? "bg-[#f3b87f]/20 text-[#f3b87f]" : isComplete ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                    )}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-center text-white/90">
                        {title}
                    </h3>
                </div>

                {/* Agents Container - Centered */}
                <div className="flex-1 flex items-center justify-center w-full min-h-[80px]">
                    {children}
                </div>
            </div>

            {/* Processing Particles (Shown only when active) */}
            {isActive && (
                <div className="absolute inset-0 pointer-events-none rounded-[40px] overflow-hidden">
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: [0, 0.5, 0], y: -50 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute bottom-0 left-1/4 w-[1px] h-12 bg-gradient-to-t from-transparent via-[#f3b87f] to-transparent"
                    />
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: [0, 0.3, 0], y: -50 }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.5, ease: "linear" }}
                        className="absolute bottom-0 right-1/3 w-[1px] h-8 bg-gradient-to-t from-transparent via-[#f3b87f] to-transparent"
                    />
                </div>
            )}
        </motion.div>
    );
}
