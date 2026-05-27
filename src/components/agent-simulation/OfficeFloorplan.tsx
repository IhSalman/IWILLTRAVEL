'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OfficeFloorplanProps {
    children: React.ReactNode;
    className?: string;
}

export function OfficeFloorplan({ children, className }: OfficeFloorplanProps) {
    return (
        <div className={cn("relative w-full max-w-5xl mx-auto h-[600px] bg-[#1e1e1e] rounded-xl overflow-hidden border-4 border-[#2d2d2d] shadow-2xl", className)}>
            {/* The Floor - Tile pattern */}
            <div className="absolute inset-0 opacity-[0.1] bg-[linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none" />
            
            {/* Wall Top (Depth illusion) */}
            <div className="absolute top-0 inset-x-0 h-4 bg-[#2d2d2d] border-b border-black/50 z-0 shadow-md" />
            {/* Wall Left */}
            <div className="absolute top-0 bottom-0 left-0 w-4 bg-[#212121] border-r border-black/50 z-0 shadow-[4px_0_10px_rgba(0,0,0,0.3)]" />
            {/* Wall Right */}
            <div className="absolute top-0 bottom-0 right-0 w-4 bg-[#212121] border-l border-black/50 z-0 shadow-[-4px_0_10px_rgba(0,0,0,0.3)]" />
            {/* Wall Bottom */}
            <div className="absolute bottom-0 inset-x-0 h-4 bg-[#2d2d2d] border-t border-black/50 z-0 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]" />

            {/* Static Office Elements */}
            
            {/* Top Left Corner: Potted Plant */}
            <div className="absolute top-8 left-8">
                <div className="relative w-12 h-12">
                    <div className="absolute bottom-0 left-2 w-8 h-8 rounded-full bg-[#8c5a3c] shadow-lg border border-[#5c3a26]" />
                    <div className="absolute bottom-3 left-4 w-4 h-6 bg-[#3d2314] rounded-full" />
                    {/* Leaves */}
                    <div className="absolute top-0 left-2 w-8 h-8 bg-[#2d8a4a] rounded-full mix-blend-multiply opacity-80" />
                    <div className="absolute top-1 left-0 w-6 h-6 bg-[#2d8a4a] rounded-full mix-blend-multiply opacity-80" />
                    <div className="absolute top-1 left-5 w-6 h-6 bg-[#2d8a4a] rounded-full mix-blend-multiply opacity-80" />
                </div>
            </div>

            {/* Top Right Corner: Water Cooler */}
            <div className="absolute top-8 right-12 w-10 h-14 object-contain">
                <div className="w-10 h-8 bg-neutral-200 rounded-t-sm shadow-md flex justify-center border border-neutral-300">
                    <div className="w-6 h-8 bg-[#8ce0ff] rounded-t opacity-70 mt-1 border border-[#00bfff]" />
                </div>
                <div className="w-10 h-6 bg-neutral-300 rounded-b-sm border-t border-neutral-400 relative">
                    {/* Taps */}
                    <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                </div>
            </div>

            {/* Bottom Left Corner: Filing Cabinets */}
            <div className="absolute bottom-12 left-8 flex gap-1">
                {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-12 bg-neutral-400 rounded-sm border border-neutral-500 shadow-md flex flex-col justify-evenly px-1">
                        <div className="w-full h-[1px] bg-neutral-500" />
                        <div className="w-full h-[1px] bg-neutral-500" />
                        <div className="w-full h-[1px] bg-neutral-500" />
                    </div>
                ))}
            </div>

             {/* Bottom Right Corner: Potted Plant 2 */}
            <div className="absolute bottom-8 right-8">
                <div className="relative w-14 h-14">
                    <div className="absolute bottom-0 left-2 w-10 h-10 rounded-full bg-[#8c5a3c] shadow-lg border border-[#5c3a26]" />
                    <div className="absolute bottom-3 left-4 w-6 h-8 bg-[#3d2314] rounded-full" />
                    {/* Leaves */}
                    <div className="absolute top-0 left-2 w-10 h-10 bg-[#34a853] rounded-full mix-blend-multiply opacity-80" />
                    <div className="absolute top-1 left-0 w-8 h-8 bg-[#34a853] rounded-full mix-blend-multiply opacity-80" />
                    <div className="absolute top-1 left-6 w-8 h-8 bg-[#34a853] rounded-full mix-blend-multiply opacity-80" />
                </div>
            </div>

            {/* Dynamic Content (Desks and Employees) */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {children}
            </div>
            
            {/* Ambient Lighting Overlay */}
            <div className="absolute inset-0 bg-black/10 pointer-events-none z-50 mix-blend-overlay" />
        </div>
    );
}
