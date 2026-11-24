'use client';

import { useRef, MouseEvent, ReactNode } from 'react';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    glowColor?: string;
    tilt?: boolean;
}

export function GlassCard({ children, className = '', glowColor = '0, 212, 255', tilt = true }: GlassCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!tilt) return;
        const card = cardRef.current;
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        card.style.boxShadow = `0 25px 50px rgba(0,0,0,0.4), 0 0 30px rgba(${glowColor}, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)`;

        // Moving highlight
        const percentX = (x / rect.width) * 100;
        const percentY = (y / rect.height) * 100;
        card.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.07) 0%, transparent 60%), rgba(255,255,255,0.04)`;
    };

    const handleMouseLeave = () => {
        if (!tilt) return;
        const card = cardRef.current;
        if (!card) return;
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        card.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.25), 0 10px 40px rgba(0,0,0,0.1)';
        card.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))';
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative rounded-2xl border border-white/5 backdrop-blur-2xl transition-transform duration-200 ease-out ${className}`}
            style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.25), 0 10px 40px rgba(0,0,0,0.1)',
                willChange: 'transform',
            }}
        >
            {/* Glow edge */}
            <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                    background: `linear-gradient(135deg, rgba(${glowColor}, 0.08) 0%, transparent 50%, rgba(243,184,127,0.05) 100%)`,
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
