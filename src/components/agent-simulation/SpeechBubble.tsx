'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpeechBubbleProps {
    message?: string;
    isActive: boolean;
}

export function SpeechBubble({ message, isActive }: SpeechBubbleProps) {
    return (
        <AnimatePresence>
            {isActive && message && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 z-40"
                >
                    <div className="relative bg-white text-black px-3 py-1.5 rounded-lg text-[9px] font-medium shadow-lg max-w-[120px] text-center leading-tight whitespace-normal break-words border border-neutral-200">
                        {message}
                        
                        {/* Typing dots if it's a generic "running" message, else show the text */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-neutral-200 rotate-45" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
