'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    Sparkles, Globe2, Map, Headphones, BookOpen, Search,
    MessageSquare, Star, CheckCircle2, ChevronRight, Send, Loader2,
    AlertCircle, Plane, Shield, Languages, Users, Bot, Compass,
    ArrowRight, Zap, Brain, TrendingUp, Lock, Terminal
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/landing/GlassCard';
import { ParticleField } from '@/components/landing/ParticleField';

// Lazy-load 3D globe to avoid SSR issues
const LandingGlobe = dynamic(
    () => import('@/components/landing/LandingGlobe').then(m => m.LandingGlobe),
    { ssr: false, loading: () => <GlobeFallback /> }
);

function GlobeFallback() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-64 h-64 rounded-full border border-cyan-500/20 animate-pulse" style={{
                background: 'radial-gradient(circle at 35% 35%, rgba(0,212,255,0.1), rgba(10,22,40,0.9))',
                boxShadow: '0 0 80px rgba(0,212,255,0.1)'
            }} />
        </div>
    );
}

// Animated counter hook
function useCounter(target: number, duration: number = 2000) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true });

    useEffect(() => {
        if (!inView) return;
        const start = Date.now();
        const step = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [inView, target, duration]);

    return { count, ref };
}

// Individual stat component
function StatCounter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
    const { count, ref } = useCounter(value);
    return (
        <div ref={ref} className="text-center">
            <div className="text-4xl md:text-5xl font-black text-white mb-2">
                {count.toLocaleString()}{suffix}
            </div>
            <div className="text-cyan-400/70 text-sm font-medium tracking-wide uppercase">{label}</div>
        </div>
    );
}

// ─────────────────────────────────────────────
// HERO FLOATING CARDS
// ─────────────────────────────────────────────
const agentSteps = [
    { icon: Brain, label: 'Route Planner Agent', status: 'Analyzing preferences…', color: '#6366F1', glow: '99, 102, 241' },
    { icon: Shield, label: 'Visa Check Agent', status: 'Fetching requirements…', color: '#00D4FF', glow: '0, 212, 255' },
    { icon: Globe2, label: 'Flight Agent', status: 'Scanning 800+ airlines…', color: '#00FFB3', glow: '0, 255, 179' },
    { icon: Map, label: 'Hotel Agent', status: 'Comparing 2,400 hotels…', color: '#F59E0B', glow: '245, 158, 11' },
    { icon: Languages, label: 'Translator Agent', status: 'Loading 50+ languages…', color: '#EC4899', glow: '236, 72, 153' },
    { icon: Users, label: 'Community Intel', status: 'Mining traveler tips…', color: '#8B5CF6', glow: '139, 92, 246' },
];

// ─────────────────────────────────────────────
// FEATURES DATA
// ─────────────────────────────────────────────
const features = [
    {
        title: 'AI Itinerary Engine',
        description: 'Multi-agent system generates 3-7 day personalized itineraries with real-time costs, activities, and hidden gems.',
        icon: Brain,
        glow: '99, 102, 241',
        badge: 'Core Feature',
        href: '/plan-trip',
    },
    {
        title: 'AI Visa Intelligence',
        description: 'Real-time visa requirements by passport. AI-summarized policies, document checklists, and processing timelines.',
        icon: Shield,
        glow: '0, 212, 255',
        badge: 'Agentic',
        href: '/visa-hub',
    },
    {
        title: 'LinguaSphere™',
        description: 'Real-time conversation translation, OCR for menus and signs, voice TTS in 50+ languages powered by AI.',
        icon: Languages,
        glow: '236, 72, 153',
        badge: 'AI-Powered',
        href: '/translate',
    },
    {
        title: 'Smart Discover',
        description: '150+ destinations with real data: safety index, avg costs, climate, internet speed, and travel vibe matching.',
        icon: Compass,
        glow: '0, 255, 179',
        badge: 'Data-Driven',
        href: '/discover',
    },
    {
        title: 'Travel Research',
        description: 'Live flight prices, hotel ratings, weather forecasts, and destination comparisons — all in one AI dashboard.',
        icon: Search,
        glow: '245, 158, 11',
        badge: 'Real-Time',
        href: '/travel-research',
    },
    {
        title: 'Travel Community',
        description: 'Real intel from verified travelers: visa wait times, budget breakdowns, and local secret spots — AI-curated.',
        icon: Users,
        glow: '139, 92, 246',
        badge: 'Community',
        href: '/community',
    },
    {
        title: 'AI Travel Guides',
        description: 'Deep-dive into SEO-optimized, uniquely generated blogs featuring hidden gems, budget tricks, and itineraries.',
        icon: BookOpen,
        glow: '236, 72, 153',
        badge: 'Intelligence',
        href: '/blogs',
    },
];

// ─────────────────────────────────────────────
// TESTIMONIALS
// ─────────────────────────────────────────────
const testimonials = [
    {
        text: 'The AI planned my entire 2-week Japan trip in under 3 minutes. Visa info, hotels, flights — all sorted. Mind-blowing.',
        name: 'Sarah M.',
        role: 'Frequent Traveler',
        loc: 'New York, USA',
        stars: 5,
    },
    {
        text: 'LinguaSphere saved me in a local Thai market. Real-time translation with my camera is pure wizardry.',
        name: 'Carlos R.',
        role: 'Digital Nomad',
        loc: 'Barcelona, Spain',
        stars: 5,
    },
    {
        text: 'The community visa tips are gold. I found out my Schengen was expedited thanks to other travelers\' real experiences.',
        name: 'Aisha K.',
        role: 'Travel Blogger',
        loc: 'Dubai, UAE',
        stars: 5,
    },
    {
        text: 'As a business traveler, the live flight tracker and hotel comparison tool save me hours every week.',
        name: 'James T.',
        role: 'Consultant',
        loc: 'London, UK',
        stars: 5,
    },
    {
        text: 'The itinerary agent found hidden gems in Bali I never would have discovered alone. This is the future of travel.',
        name: 'Priya S.',
        role: 'Adventure Seeker',
        loc: 'Mumbai, India',
        stars: 5,
    },
];

export default function Home() {
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [newsletterMessage, setNewsletterMessage] = useState('');
    const [activeAgent, setActiveAgent] = useState(0);
    const heroRef = useRef<HTMLElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

    // Agent pipeline cycling
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveAgent(prev => (prev + 1) % agentSteps.length);
        }, 1800);
        return () => clearInterval(interval);
    }, []);

    // Hero parallax
    useEffect(() => {
        let lastRect: DOMRect | null = null;
        let ticking = false;

        const handleMouseMove = (e: globalThis.MouseEvent) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (!heroRef.current) {
                        ticking = false;
                        return;
                    }
                    if (!lastRect) lastRect = heroRef.current.getBoundingClientRect();
                    
                    const x = (e.clientX - lastRect.left - lastRect.width / 2) / lastRect.width;
                    const y = (e.clientY - lastRect.top - lastRect.height / 2) / lastRect.height;
                    mouseX.set(x * 20);
                    mouseY.set(y * 20);
                    ticking = false;
                });
                ticking = true;
            }
        };

        const handleResize = () => {
            if (heroRef.current) lastRect = heroRef.current.getBoundingClientRect();
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, [mouseX, mouseY]);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail) return;
        setIsSubscribing(true);
        setNewsletterStatus('idle');
        try {
            const res = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newsletterEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to subscribe');
            setNewsletterStatus('success');
            setNewsletterMessage(data.message === 'Already subscribed!' ? "You're already on the list! ✈️" : 'Welcome aboard! Check your inbox. ✈️');
            setNewsletterEmail('');
        } catch (error: any) {
            setNewsletterStatus('error');
            setNewsletterMessage(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubscribing(false);
        }
    };

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: (i = 0) => ({
            opacity: 1, y: 0,
            transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const }
        })
    };

    return (
        <div
            className="flex flex-col min-h-screen overflow-x-hidden font-sans"
            style={{ background: 'linear-gradient(135deg, #020B18 0%, #03080F 50%, #050D1A 100%)' }}
        >
            {/* ═══════════════════════════════════════════ */}
            {/* HERO SECTION                               */}
            {/* ═══════════════════════════════════════════ */}
            <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
                {/* Particle field background */}
                <ParticleField />

                {/* Ambient glow blobs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)', filter: 'blur(60px)' }} />

                <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Text content */}
                    <div className="flex flex-col items-start">
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="mb-6"
                        >
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                                style={{
                                    background: 'rgba(99,102,241,0.15)',
                                    border: '1px solid rgba(99,102,241,0.4)',
                                    color: '#A5B4FC',
                                }}>
                                <Zap className="w-3.5 h-3.5" />
                                6 AI Agents Working for You
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            </span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            variants={fadeUp} initial="hidden" animate="visible" custom={1}
                            className="text-5xl md:text-6xl xl:text-7xl font-black tracking-tight leading-[1.05] mb-6"
                            style={{ color: '#F0F4FF' }}
                        >
                            Travel Planned by{' '}
                            <span className="block"
                                style={{
                                    background: 'linear-gradient(135deg, #00D4FF 0%, #6366F1 50%, #00FFB3 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}>
                                Agentic AI
                            </span>
                        </motion.h1>

                        {/* Subheadline */}
                        <motion.p
                            variants={fadeUp} initial="hidden" animate="visible" custom={2}
                            className="text-lg md:text-xl leading-relaxed mb-10 max-w-lg"
                            style={{ color: 'rgba(176,184,204,0.85)' }}
                        >
                            Six specialized AI agents collaborate to plan your perfect trip — from itineraries
                            to visa checks, real-time flights, hotel comparisons, live translation, and traveler intel.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            variants={fadeUp} initial="hidden" animate="visible" custom={3}
                            className="flex flex-wrap gap-4 mb-12"
                        >
                            <Link href="/plan-trip">
                                <Button size="lg"
                                    className="h-13 px-8 text-base font-bold rounded-full relative overflow-hidden group"
                                    style={{
                                        background: 'linear-gradient(135deg, #00D4FF, #6366F1)',
                                        boxShadow: '0 0 30px rgba(0,212,255,0.35), 0 4px 15px rgba(0,0,0,0.3)',
                                        border: 'none',
                                        color: 'white',
                                    }}>
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" />
                                        Generate My Itinerary
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: 'linear-gradient(135deg, #6366F1, #00D4FF)' }} />
                                </Button>
                            </Link>
                            <Link href="/discover">
                                <Button size="lg" variant="outline"
                                    className="h-13 px-8 text-base font-bold rounded-full"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        color: 'rgba(220,225,245,0.9)',
                                        backdropFilter: 'blur(8px)',
                                    }}>
                                    <Globe2 className="w-4 h-4 mr-2" />
                                    Explore Destinations
                                </Button>
                            </Link>
                            <Link href="/blogs">
                                <Button size="lg" variant="outline"
                                    className="h-13 px-8 text-base font-bold rounded-full"
                                    style={{
                                        background: 'rgba(236,72,153,0.05)',
                                        border: '1px solid rgba(236,72,153,0.3)',
                                        color: '#F9A8D4',
                                        backdropFilter: 'blur(8px)',
                                    }}>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Read Travel Blog
                                </Button>
                            </Link>
                        </motion.div>

                        {/* Mini stats */}
                        <motion.div
                            variants={fadeUp} initial="hidden" animate="visible" custom={4}
                            className="flex items-center gap-8"
                        >
                            {[['150+', 'Destinations'], ['50+', 'Languages'], ['24/7', 'AI Support']].map(([val, label]) => (
                                <div key={label} className="text-center">
                                    <div className="text-2xl font-black text-white">{val}</div>
                                    <div className="text-xs text-cyan-400/60 font-medium uppercase tracking-wide">{label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right: 3D Globe + floating agent cards */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                        className="relative hidden lg:flex items-center justify-center"
                        style={{ height: 520 }}
                    >
                        {/* Globe */}
                        <motion.div
                            style={{ x: springX, y: springY }}
                            className="absolute inset-0"
                        >
                            <LandingGlobe />
                        </motion.div>

                        {/* Floating glass agent card */}
                        <motion.div
                            key={activeAgent}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                            className="absolute bottom-8 left-0 z-20"
                        >
                            <GlassCard className="p-4 min-w-[220px]" glowColor={agentSteps[activeAgent].glow?.toString() ?? '0,212,255'}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ background: `rgba(${agentSteps[activeAgent].glow ?? '0,212,255'}, 0.2)` }}>
                                        {(() => {
                                            const Icon = agentSteps[activeAgent].icon;
                                            return <Icon className="w-4 h-4" style={{ color: agentSteps[activeAgent].color }} />;
                                        })()}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white/90">{agentSteps[activeAgent].label}</div>
                                        <div className="text-[10px] text-cyan-400/70 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                                            {agentSteps[activeAgent].status}
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>

                        {/* Flight card */}
                        <div className="absolute top-8 right-0 z-20">
                            <GlassCard className="p-4" glowColor="0, 255, 179">
                                <div className="flex items-center gap-3 mb-2">
                                    <Plane className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-bold text-white/80">Live Flights</span>
                                </div>
                                <div className="flex items-center justify-between gap-6">
                                    <div className="text-center">
                                        <div className="text-[10px] text-white/40">FROM</div>
                                        <div className="text-sm font-black text-white">JFK</div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-6 h-px bg-cyan-400/40" />
                                        <Plane className="w-3 h-3 text-cyan-400 rotate-90" />
                                        <div className="w-6 h-px bg-cyan-400/40" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] text-white/40">TO</div>
                                        <div className="text-sm font-black text-white">NRT</div>
                                    </div>
                                </div>
                                <div className="mt-2 text-center">
                                    <span className="text-xs font-bold"
                                        style={{
                                            background: 'linear-gradient(90deg, #00D4FF, #00FFB3)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                        }}>
                                        $847 · 14h 35m
                                    </span>
                                </div>
                            </GlassCard>
                        </div>
                    </motion.div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                >
                    <span className="text-xs text-white/30 font-medium uppercase tracking-widest">Scroll</span>
                    <div className="w-px h-12 overflow-hidden">
                        <motion.div
                            animate={{ y: ['-100%', '200%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                            className="w-full h-1/2 bg-gradient-to-b from-transparent via-cyan-400 to-transparent"
                        />
                    </div>
                </motion.div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* AGENT PIPELINE SECTION                     */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-28 px-4 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, transparent, rgba(99,102,241,0.04) 50%, transparent)' }} />

                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }}
                        variants={fadeUp} className="text-center mb-16"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
                            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00D4FF' }}>
                            <Bot className="w-3.5 h-3.5" />
                            Multi-Agent Architecture
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black mb-5"
                            style={{ color: '#F0F4FF' }}>
                            Six Agents. One{' '}
                            <span style={{ background: 'linear-gradient(90deg, #00D4FF, #6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Perfect Trip.
                            </span>
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(176,184,204,0.75)' }}>
                            Our AI agents work in parallel, each specializing in a different aspect of your travel — 
                            then synthesize everything into one seamless plan.
                        </p>
                    </motion.div>

                    {/* Pipeline cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
                        {/* Connecting line (desktop) */}
                        <div className="absolute top-1/2 left-0 right-0 h-px hidden lg:block"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), rgba(99,102,241,0.3), rgba(0,212,255,0.3), transparent)' }} />

                        {agentSteps.map((agent, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                            >
                                <GlassCard className="p-5 text-center relative" glowColor={agent.color.replace('#', '').match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',') ?? '0,212,255'}>
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                                        style={{ background: agent.color, color: 'black' }}>
                                        {i + 1}
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                                        style={{ background: `${agent.color}20` }}>
                                        <agent.icon className="w-6 h-6" style={{ color: agent.color }} />
                                    </div>
                                    <div className="text-xs font-bold text-white/90 mb-1 leading-tight">{agent.label}</div>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: agent.color }} />
                                        <span className="text-[9px]" style={{ color: `${agent.color}99` }}>Active</span>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* FEATURES SECTION                           */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-28 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }}
                        variants={fadeUp} className="text-center mb-16"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
                            style={{ background: 'rgba(0,255,179,0.08)', border: '1px solid rgba(0,255,179,0.25)', color: '#00FFB3' }}>
                            <Sparkles className="w-3.5 h-3.5" />
                            Full Feature Suite
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black mb-5" style={{ color: '#F0F4FF' }}>
                            Everything You Need to{' '}
                            <span style={{ background: 'linear-gradient(90deg, #00FFB3, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Travel Smart
                            </span>
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(176,184,204,0.75)' }}>
                            From initial inspiration to on-the-ground navigation. One platform, powered by AI from start to finish.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((feat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08, duration: 0.5 }}
                            >
                                <GlassCard className="p-7 h-full group cursor-pointer" glowColor={feat.glow}>
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                            style={{ background: `rgba(${feat.glow}, 0.15)` }}>
                                            <feat.icon className="w-7 h-7" style={{ color: `rgb(${feat.glow})` }} />
                                        </div>
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                                            style={{
                                                background: `rgba(${feat.glow}, 0.12)`,
                                                border: `1px solid rgba(${feat.glow}, 0.3)`,
                                                color: `rgb(${feat.glow})`,
                                            }}>
                                            {feat.badge}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                                    <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(176,184,204,0.7)' }}>
                                        {feat.description}
                                    </p>
                                    <Link href={feat.href}
                                        className="inline-flex items-center gap-2 text-sm font-semibold transition-all group-hover:gap-3"
                                        style={{ color: `rgb(${feat.glow})` }}>
                                        Explore <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* HOW IT WORKS SECTION                       */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-28 px-4 relative">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, transparent, rgba(99,102,241,0.04) 50%, transparent)' }} />

                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }}
                        variants={fadeUp} className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-black mb-5" style={{ color: '#F0F4FF' }}>
                            Up and Running in{' '}
                            <span style={{ background: 'linear-gradient(90deg, #6366F1, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Minutes
                            </span>
                        </h2>
                        <p className="text-lg" style={{ color: 'rgba(176,184,204,0.75)' }}>From inspiration to adventure in four simple steps.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                        {/* Connector */}
                        <div className="absolute top-12 left-[12%] right-[12%] h-px hidden md:block"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(0,212,255,0.5), transparent)' }} />

                        {[
                            { num: '01', icon: Compass, title: 'Choose Destination', desc: 'Browse 150+ cities with real-time safety, costs, and climate data.' },
                            { num: '02', icon: Brain, title: 'AI Builds Your Plan', desc: 'Agents generate a day-by-day itinerary tailored to your style and budget.' },
                            { num: '03', icon: Shield, title: 'Visa & Translation', desc: 'Get instant visa requirements and translate anything on the go.' },
                            { num: '04', icon: Users, title: 'Share & Inspire', desc: 'Post your trip insights and help the next generation of travelers.' },
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15, duration: 0.5 }}
                                className="relative flex flex-col items-center text-center"
                            >
                                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 relative z-10"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(12px)',
                                    }}>
                                    <step.icon className="w-8 h-8 text-cyan-400" />
                                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                                        style={{ background: 'linear-gradient(135deg, #00D4FF, #6366F1)', color: 'black' }}>
                                        {step.num.replace('0', '')}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'rgba(176,184,204,0.65)' }}>{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* STATS SECTION                              */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <GlassCard className="p-12" glowColor="0, 212, 255" tilt={false}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                            <StatCounter value={150} label="Destinations" suffix="+" />
                            <StatCounter value={10000} label="Itineraries Created" suffix="+" />
                            <StatCounter value={50} label="Languages" suffix="+" />
                            <StatCounter value={98} label="Satisfaction Rate" suffix="%" />
                        </div>
                    </GlassCard>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* SHOWCASE: ITINERARY MOCKUP                 */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-28 px-4">
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="flex-1"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
                            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}>
                            <Brain className="w-3.5 h-3.5" />
                            AI-Powered Planning
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight" style={{ color: '#F0F4FF' }}>
                            Itineraries That <br />
                            <span style={{ background: 'linear-gradient(90deg, #6366F1, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Understand You
                            </span>
                        </h2>
                        <p className="text-lg mb-8 leading-relaxed" style={{ color: 'rgba(176,184,204,0.75)' }}>
                            Our AI learns your travel style — adventurous or relaxed, budget or luxury —
                            and builds a day-by-day plan with activities, restaurant picks, and hidden gems.
                        </p>

                        <ul className="space-y-3 mb-8">
                            {['Morning, afternoon & evening breakdown', 'Estimated costs per activity', 'Real-time travel times between spots', 'Shareable & editable plans'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3" style={{ color: 'rgba(220,225,245,0.8)' }}>
                                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                                    <span className="text-sm font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>

                        <Link href="/plan-trip">
                            <Button className="rounded-full px-7 font-bold"
                                style={{
                                    background: 'linear-gradient(135deg, #6366F1, #00D4FF)',
                                    color: 'white',
                                    boxShadow: '0 0 25px rgba(99,102,241,0.35)',
                                    border: 'none',
                                }}>
                                Try the AI Planner <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Mockup card */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="flex-1 w-full"
                    >
                        <GlassCard className="p-7" glowColor="99, 102, 241">
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'rgba(99,102,241,0.2)' }}>
                                    <Map className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Day 1 — Tokyo, Japan</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF' }}>Culture</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,255,179,0.15)', color: '#00FFB3' }}>Food</span>
                                        <span className="text-xs text-white/40">~$95 est.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline items */}
                            <div className="space-y-3">
                                {[
                                    { time: '🌅 Morning', place: 'Senso-ji Temple & Asakusa', cost: '$0', accent: '#F59E0B' },
                                    { time: '☀️ Afternoon', place: 'Shibuya Crossing & Harajuku', cost: '$25', accent: '#00D4FF' },
                                    { time: '🌙 Evening', place: 'Golden Gai ramen crawl, Shinjuku', cost: '$30', accent: '#8B5CF6' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.accent }} />
                                        <div className="flex-1">
                                            <div className="text-[10px] font-bold mb-0.5" style={{ color: item.accent }}>{item.time}</div>
                                            <div className="text-sm font-semibold text-white">{item.place}</div>
                                        </div>
                                        <div className="text-xs font-bold" style={{ color: '#00FFB3' }}>{item.cost}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Terminal-like status */}
                            <div className="mt-5 p-3 rounded-xl flex items-center gap-3"
                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.15)' }}>
                                <Terminal className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                <span className="text-[10px] font-mono text-cyan-400/70">
                                    Agent synthesized 847 data points in 2.3s ✓
                                </span>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* TESTIMONIALS SECTION                       */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-28 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }}
                        variants={fadeUp} className="text-center mb-14"
                    >
                        <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: '#F0F4FF' }}>
                            Loved by{' '}
                            <span style={{ background: 'linear-gradient(90deg, #F59E0B, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Travelers Worldwide
                            </span>
                        </h2>
                        <p className="text-lg" style={{ color: 'rgba(176,184,204,0.75)' }}>Join thousands exploring smarter with AI-powered travel intelligence.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {testimonials.slice(0, 3).map((test, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                            >
                                <GlassCard className="p-7 h-full" glowColor="245, 158, 11">
                                    <div className="flex gap-1 mb-5">
                                        {Array.from({ length: test.stars }).map((_, s) => (
                                            <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        ))}
                                    </div>
                                    <p className="text-sm leading-relaxed mb-6 font-medium" style={{ color: 'rgba(220,225,245,0.85)' }}>
                                        "{test.text}"
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
                                            style={{ background: 'linear-gradient(135deg, #6366F1, #00D4FF)', color: 'black' }}>
                                            {test.name[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{test.name}</div>
                                            <div className="text-[11px]" style={{ color: 'rgba(176,184,204,0.5)' }}>{test.role} · {test.loc}</div>
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* PARTNERS MARQUEE                           */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-12 px-4 overflow-hidden"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-center text-xs font-bold tracking-widest uppercase mb-8"
                    style={{ color: 'rgba(176,184,204,0.35)' }}>
                    Trusted Booking & Data Partners
                </p>
                <div className="relative">
                    <div className="flex items-center gap-16 animate-[marquee_20s_linear_infinite]">
                        {['Booking.com', 'Expedia', 'Skyscanner', 'GetYourGuide', 'Hostelworld', 'SafetyWing', 'Amadeus', 'Stripe'].map((p, i) => (
                            <span key={i} className="text-xl font-black whitespace-nowrap flex-shrink-0"
                                style={{ color: 'rgba(176,184,204,0.2)' }}>
                                {p}
                            </span>
                        ))}
                        {/* Duplicate for seamless loop */}
                        {['Booking.com', 'Expedia', 'Skyscanner', 'GetYourGuide', 'Hostelworld', 'SafetyWing', 'Amadeus', 'Stripe'].map((p, i) => (
                            <span key={`d-${i}`} className="text-xl font-black whitespace-nowrap flex-shrink-0"
                                style={{ color: 'rgba(176,184,204,0.2)' }}>
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* NEWSLETTER SECTION                         */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-28 px-4">
                <div className="max-w-2xl mx-auto">
                    <GlassCard className="p-10 text-center" glowColor="0, 212, 255" tilt={false}>
                        <div className="w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center"
                            style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.2)' }}>
                            <Send className="w-7 h-7 text-cyan-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-3">Stay in the Loop</h2>
                        <p className="mb-8" style={{ color: 'rgba(176,184,204,0.7)' }}>
                            Get weekly AI travel tips, destination guides, and early feature access.
                        </p>
                        <form onSubmit={handleSubscribe} className="flex gap-3">
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={newsletterEmail}
                                onChange={(e) => setNewsletterEmail(e.target.value)}
                                disabled={isSubscribing}
                                required
                                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    color: 'white',
                                }}
                            />
                            <Button type="submit" disabled={isSubscribing}
                                className="rounded-xl px-6 font-bold flex-shrink-0"
                                style={{
                                    background: 'linear-gradient(135deg, #00D4FF, #6366F1)',
                                    color: 'white',
                                    border: 'none',
                                }}>
                                {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
                            </Button>
                        </form>
                        {newsletterStatus === 'success' && (
                            <p className="text-xs text-emerald-400 mt-3 flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {newsletterMessage}
                            </p>
                        )}
                        {newsletterStatus === 'error' && (
                            <p className="text-xs text-red-400 mt-3 flex items-center justify-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" /> {newsletterMessage}
                            </p>
                        )}
                        {newsletterStatus === 'idle' && (
                            <p className="text-[11px] mt-3" style={{ color: 'rgba(176,184,204,0.35)' }}>
                                No spam. Unsubscribe any time.
                            </p>
                        )}
                    </GlassCard>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* FINAL CTA SECTION                          */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-36 px-4 relative overflow-hidden">
                {/* Aurora background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
                        style={{
                            background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, rgba(0,212,255,0.10) 40%, transparent 70%)',
                            filter: 'blur(60px)',
                        }} />
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8"
                            style={{ background: 'rgba(0,255,179,0.08)', border: '1px solid rgba(0,255,179,0.25)', color: '#00FFB3' }}>
                            <TrendingUp className="w-3.5 h-3.5" />
                            Join 10,000+ Smart Travelers
                        </span>
                        <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight" style={{ color: '#F0F4FF' }}>
                            Ready to Travel{' '}
                            <span style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #6366F1 50%, #00FFB3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Smarter?
                            </span>
                        </h2>
                        <p className="text-xl mb-12 max-w-2xl mx-auto" style={{ color: 'rgba(176,184,204,0.75)' }}>
                            Let six specialized AI agents build your next adventure — visa checked, flights compared,
                            hotels ranked, language barrier eliminated.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/plan-trip">
                                <Button size="lg"
                                    className="h-14 px-10 text-lg font-black rounded-full group relative overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(135deg, #00D4FF, #6366F1)',
                                        boxShadow: '0 0 50px rgba(0,212,255,0.3), 0 0 100px rgba(99,102,241,0.2)',
                                        color: 'white',
                                        border: 'none',
                                    }}>
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" />
                                        Start Your Journey Free
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </Button>
                            </Link>
                            <Link href="/community">
                                <Button size="lg" variant="outline"
                                    className="h-14 px-10 text-lg font-bold rounded-full"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        color: 'rgba(220,225,245,0.9)',
                                        backdropFilter: 'blur(8px)',
                                    }}>
                                    <Users className="w-5 h-5 mr-2" />
                                    Explore the Community
                                </Button>
                            </Link>
                        </div>

                        {/* Trust badges */}
                        <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
                            {[
                                { icon: Lock, label: 'Secure & Private' },
                                { icon: Zap, label: 'Instant Results' },
                                { icon: Globe2, label: '150+ Destinations' },
                                { icon: Star, label: '4.9/5 Rating' },
                            ].map(({ icon: Icon, label }, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 text-cyan-400/60" />
                                    <span className="text-xs font-medium" style={{ color: 'rgba(176,184,204,0.45)' }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Marquee keyframe */}
            <style jsx global>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}
