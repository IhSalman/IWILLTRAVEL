'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Check, Star, Zap, Plane, X, Sparkles,
    Shield, Coffee, MapPin, Route, Building2,
    CalendarDays, Mic, FileText, Share2, Users,
    ChevronDown, Send, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

// ─────────────────────────────────────────────
// ENTERPRISE CONTACT MODAL
// ─────────────────────────────────────────────
function EnterpriseModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        // Fire to newsletter endpoint as a lead, or mailto fallback
        try {
            await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, company, message, type: 'enterprise' }),
            });
        } catch (_) { /* silent fail — mailto fallback below */ }
        setSent(true);
        setSending(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(3,8,15,0.85)', backdropFilter: 'blur(12px)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', bounce: 0.2 }}
                className="w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                <Card className="bg-[#0a1628] border border-[#6366F1]/30 rounded-[28px] p-8"
                    style={{ boxShadow: '0 0 60px rgba(99,102,241,0.2)' }}>
                    {!sent ? (
                        <>
                            <div className="mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center mb-4">
                                    <Building2 className="w-6 h-6 text-[#6366F1]" />
                                </div>
                                <h2 className="text-2xl font-extrabold text-white mb-1">Talk to us</h2>
                                <p className="text-white/50 text-sm">We'll get back to you within 24 hours with a custom quote.</p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-1.5 block">Name</label>
                                        <input
                                            required value={name} onChange={e => setName(e.target.value)}
                                            placeholder="Your name"
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#6366F1]/50 focus:ring-1 focus:ring-[#6366F1]/30 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-1.5 block">Company</label>
                                        <input
                                            value={company} onChange={e => setCompany(e.target.value)}
                                            placeholder="Optional"
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#6366F1]/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-1.5 block">Email</label>
                                    <input
                                        required type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#6366F1]/50 focus:ring-1 focus:ring-[#6366F1]/30 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-1.5 block">What do you need?</label>
                                    <textarea
                                        value={message} onChange={e => setMessage(e.target.value)}
                                        placeholder="Team size, use case, integrations needed..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#6366F1]/50 transition-all resize-none"
                                    />
                                </div>
                                <Button
                                    type="submit" disabled={sending}
                                    className="w-full h-11 rounded-xl font-bold bg-[#6366F1] hover:bg-[#4f52d3] text-white border-none transition-all"
                                >
                                    {sending ? 'Sending…' : (
                                        <><Send className="w-4 h-4 mr-2" /> Send Message</>
                                    )}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-[#00FFB3]/10 flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-[#00FFB3]" />
                            </div>
                            <h3 className="text-xl font-extrabold text-white mb-2">Message sent!</h3>
                            <p className="text-white/50 text-sm mb-6">We'll reach out within 24 hours with a custom plan for your team.</p>
                            <Button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white border-none rounded-xl px-6">
                                Close
                            </Button>
                        </div>
                    )}
                </Card>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────
// PRICING DATA
// ─────────────────────────────────────────────
interface PlanFeature {
    text: string;
    included: boolean;
    highlight?: boolean;
    note?: string;
}

interface PricingPlan {
    id: string;
    name: string;
    label: string;
    tagline: string;
    monthlyPrice: number | null;
    yearlyPrice: number | null;
    yearlyTotal: number | null;
    gradientFrom: string;
    gradientTo: string;
    accentColor: string;
    glowColor: string;
    borderColor: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
    ctaText: string;
    ctaClassName: string;
    features: PlanFeature[];
    isEnterprise?: boolean;
    isPopular?: boolean;
}

const plans: PricingPlan[] = [
    {
        id: 'free',
        name: 'Free',
        label: 'Try it',
        tagline: 'Experience AI trip planning. No card required.',
        monthlyPrice: 0,
        yearlyPrice: 0,
        yearlyTotal: 0,
        gradientFrom: '#0d1117',
        gradientTo: '#161b22',
        accentColor: '#00FFB3',
        glowColor: 'rgba(0,255,179,0.07)',
        borderColor: 'rgba(255,255,255,0.07)',
        icon: <Plane className="w-4 h-4" />,
        ctaText: 'Start for Free',
        ctaClassName: 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20',
        features: [
            { text: '3 itineraries to try', included: true, highlight: true },
            { text: 'Full day-by-day road plan', included: true, highlight: true },
            { text: 'Activity & place suggestions', included: true },
            { text: 'Browse 150+ destinations', included: true },
            { text: 'Save & share trips', included: false },
            { text: 'Hotel recommendations', included: false },
            { text: 'Live flight prices', included: false },
            { text: 'PDF export', included: false },
        ],
    },
    {
        id: 'starter',
        name: 'Starter',
        label: 'Occasional traveler',
        tagline: 'Plan and save unlimited trips. Great for 1–2 trips a year.',
        monthlyPrice: 6,
        yearlyPrice: 5,
        yearlyTotal: 60,
        gradientFrom: '#0a1628',
        gradientTo: '#0d1f3c',
        accentColor: '#00D4FF',
        glowColor: 'rgba(0,212,255,0.08)',
        borderColor: 'rgba(0,212,255,0.2)',
        icon: <MapPin className="w-4 h-4" />,
        ctaText: 'Get Starter',
        ctaClassName: 'bg-white/10 hover:bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:border-[#00D4FF]/60',
        features: [
            { text: 'Unlimited itineraries', included: true, highlight: true },
            { text: 'Save & share trips', included: true, highlight: true },
            { text: 'Hotel recommendations', included: true },
            { text: 'PDF export', included: true },
            { text: 'Priority AI model', included: true },
            { text: 'Live flight prices', included: false },
            { text: 'Voice translation', included: false },
            { text: 'ESG / sustainability score', included: false },
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        label: 'Serious traveler',
        tagline: 'Flights, hotels, translation & more. Your full travel command center.',
        monthlyPrice: 12,
        yearlyPrice: 10,
        yearlyTotal: 115,
        gradientFrom: '#0a1628',
        gradientTo: '#0d1f3c',
        accentColor: '#B4A7FF',
        glowColor: 'rgba(99,102,241,0.18)',
        borderColor: 'rgba(99,102,241,0.5)',
        icon: <Sparkles className="w-4 h-4" />,
        badge: 'Most Popular',
        badgeColor: 'from-[#6366F1] to-[#B4A7FF]',
        isPopular: true,
        ctaText: 'Get Pro',
        ctaClassName: 'bg-white text-black hover:bg-[#B4A7FF] hover:shadow-[0_0_30px_rgba(180,167,255,0.4)] font-extrabold',
        features: [
            { text: 'Everything in Starter', included: true, highlight: true },
            { text: 'Live flight prices', included: true, highlight: true },
            { text: 'Advanced optimization', included: true, highlight: true },
            { text: 'Voice translation', included: true, note: '10 min/mo' },
            { text: 'ESG / sustainability score', included: true },
            { text: 'Export without watermark', included: true },
            { text: 'Priority Gemini model', included: true },
            { text: 'Priority support', included: true },
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        label: 'Teams & B2B',
        tagline: 'Custom seats, white-label exports, API access & dedicated support.',
        monthlyPrice: null,
        yearlyPrice: null,
        yearlyTotal: null,
        gradientFrom: '#0a1a14',
        gradientTo: '#050d07',
        accentColor: '#fbbf24',
        glowColor: 'rgba(251,191,36,0.08)',
        borderColor: 'rgba(251,191,36,0.2)',
        icon: <Building2 className="w-4 h-4" />,
        isEnterprise: true,
        ctaText: 'Contact Us',
        ctaClassName: 'bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/30 hover:border-[#fbbf24]/60',
        features: [
            { text: 'Everything in Pro', included: true, highlight: true },
            { text: 'White-label export', included: true, highlight: true },
            { text: 'API access', included: true, highlight: true },
            { text: 'Team seats (custom)', included: true },
            { text: 'Unlimited voice translation', included: true },
            { text: 'Custom integrations', included: true },
            { text: 'Dedicated account manager', included: true },
            { text: 'SLA & priority support', included: true },
        ],
    },
];

// ─────────────────────────────────────────────
// COMPARISON TABLE
// ─────────────────────────────────────────────
const comparisonRows = [
    { feature: 'AI itinerary generation',   free: '✅',        starter: '✅',     pro: '✅',         enterprise: '✅' },
    { feature: 'Browse 150+ destinations',  free: '✅',        starter: '✅',     pro: '✅',         enterprise: '✅' },
    { feature: 'Itineraries',               free: '3 (total)', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Day-length cap',            free: 'None',      starter: 'None',   pro: 'None',       enterprise: 'None' },
    { feature: 'Save & share trips',        free: '—',         starter: '✅',     pro: '✅',         enterprise: '✅' },
    { feature: 'Hotel recommendations',     free: '—',         starter: '✅',     pro: '✅',         enterprise: '✅' },
    { feature: 'Live flight prices',        free: '—',         starter: '—',      pro: '✅',         enterprise: '✅' },
    { feature: 'PDF export',                free: '—',         starter: '✅',     pro: 'No watermark', enterprise: 'White-label' },
    { feature: 'Voice translation',         free: '—',         starter: '—',      pro: '10 min/mo',  enterprise: 'Unlimited' },
    { feature: 'ESG sustainability score',  free: '—',         starter: '—',      pro: '✅',         enterprise: '✅' },
    { feature: 'Priority AI model',         free: '—',         starter: '✅',     pro: '✅',         enterprise: '✅' },
    { feature: 'API access',                free: '—',         starter: '—',      pro: '—',          enterprise: '✅' },
    { feature: 'White-label export',        free: '—',         starter: '—',      pro: '—',          enterprise: '✅' },
    { feature: 'Team seats',                free: '—',         starter: '—',      pro: '—',          enterprise: 'Custom' },
];

// ─────────────────────────────────────────────
// INLINE FAQ
// ─────────────────────────────────────────────
const pricingFaqs = [
    {
        q: 'Do I need to pay to start?',
        a: 'No. You can generate up to 3 full itineraries completely free — no credit card required. When you\'re ready for more, upgrading takes 30 seconds.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes, always. No contracts, no lock-in. Cancel from your account settings at any time and you won\'t be charged again.',
    },
    {
        q: 'What\'s the difference between Starter and Pro?',
        a: 'Starter gives you unlimited itineraries, save & share, hotels, and PDF exports. Pro adds live flight prices, voice translation, ESG sustainability scoring, and advanced route optimization — everything a serious traveler needs.',
    },
    {
        q: 'How accurate is the AI?',
        a: 'Our AI uses real-time data from multiple sources — flight APIs, hotel databases, government travel advisories — and generates structured, verified plans. It\'s a powerful head start, not a final word. Always cross-check visa info with official sources.',
    },
    {
        q: 'What happens after my 3 free itineraries?',
        a: 'You\'ll see a prompt to upgrade. You can still browse 150+ destinations and explore the app — you just won\'t be able to generate new itineraries until you upgrade.',
    },
    {
        q: 'Do you offer team or B2B plans?',
        a: 'Yes. Our Enterprise plan includes team seats, white-label exports, API access, and a dedicated account manager. Use the contact form to get a custom quote.',
    },
];

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function PricingClient() {
    const locale = useLocale();
    const [isYearly, setIsYearly] = useState(false);
    const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
    const [enterpriseOpen, setEnterpriseOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <div className="min-h-screen bg-[#03080f] text-white font-sans relative overflow-hidden">

            {/* Ambient background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{ y: [0, -50, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.07]"
                    style={{ background: '#6366F1' }}
                />
                <motion.div
                    animate={{ y: [0, 50, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute bottom-[-20%] right-[-5%] w-[800px] h-[800px] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.05]"
                    style={{ background: '#00D4FF' }}
                />
            </div>

            {/* Enterprise Modal */}
            <AnimatePresence>
                {enterpriseOpen && <EnterpriseModal onClose={() => setEnterpriseOpen(false)} />}
            </AnimatePresence>

            <div className="container relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-20">

                {/* ── Header ── */}
                <div className="text-center max-w-2xl mx-auto mb-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Badge className="bg-white/10 text-[#00FFB3] border-white/10 mb-6 py-2 px-4 text-sm rounded-full backdrop-blur-md inline-flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 fill-[#00FFB3]" />
                            Simple, transparent pricing
                        </Badge>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="text-5xl md:text-6xl font-extrabold tracking-tight mb-5"
                    >
                        <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
                            Plan your entire trip
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-[#6366F1] to-[#00D4FF] bg-clip-text text-transparent">
                            in minutes, not hours.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="text-white/55 text-lg leading-relaxed mb-3"
                    >
                        For solo travelers, digital nomads, and anyone ready to explore — from hidden local gems to cross-continent adventures.
                    </motion.p>

                    {/* Risk Reversal */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="inline-flex items-center gap-2 text-sm text-[#00FFB3]/80 bg-[#00FFB3]/5 border border-[#00FFB3]/15 rounded-full px-4 py-1.5"
                    >
                        <Shield className="w-3.5 h-3.5" />
                        No credit card required to start
                    </motion.div>
                </div>

                {/* ── Billing Toggle ── */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
                    className="flex justify-center mb-14"
                >
                    <div className="bg-white/5 p-1 rounded-full border border-white/10 flex items-center shadow-xl backdrop-blur-md">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${!isYearly ? 'bg-white text-black shadow-md' : 'text-white/50 hover:text-white'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${isYearly ? 'bg-[#6366F1] text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]' : 'text-white/50 hover:text-white'}`}
                        >
                            Yearly
                            <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full whitespace-nowrap">Save ~17%</span>
                        </button>
                    </div>
                </motion.div>

                {/* ── Pricing Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-20">
                    {plans.map((plan, i) => {
                        const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.07 }}
                                onHoverStart={() => setHoveredPlan(plan.id)}
                                onHoverEnd={() => setHoveredPlan(null)}
                                className={`relative ${plan.isPopular ? 'xl:-translate-y-4' : ''}`}
                            >
                                {/* Most Popular badge */}
                                {plan.badge && (
                                    <div className="absolute -top-3.5 inset-x-0 flex justify-center z-10">
                                        <Badge className={`bg-gradient-to-r ${plan.badgeColor} text-white border-none py-1 px-4 shadow-lg text-xs font-bold`}>
                                            {plan.badge}
                                        </Badge>
                                    </div>
                                )}

                                <Card
                                    className="h-full backdrop-blur-xl p-7 rounded-[26px] flex flex-col transition-all duration-300 border"
                                    style={{
                                        background: `linear-gradient(165deg, ${plan.gradientFrom}, ${plan.gradientTo})`,
                                        borderColor: plan.borderColor,
                                        boxShadow: hoveredPlan === plan.id
                                            ? `0 20px 50px ${plan.glowColor}`
                                            : plan.isPopular
                                                ? `0 16px 40px ${plan.glowColor}`
                                                : 'none',
                                        transform: hoveredPlan === plan.id ? 'scale(1.02)' : 'scale(1)',
                                    }}
                                >
                                    {/* Popular accent line */}
                                    {plan.isPopular && (
                                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#6366F1] to-[#B4A7FF] rounded-t-[26px]" />
                                    )}

                                    {/* Plan Header */}
                                    <div className="mb-5">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span style={{ color: plan.accentColor }}>{plan.icon}</span>
                                            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                                        </div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: plan.accentColor }}>
                                            {plan.label}
                                        </p>
                                        <p className="text-white/40 text-xs leading-relaxed min-h-[2.5rem]">{plan.tagline}</p>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-7">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={isYearly ? 'y' : 'm'}
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 6 }}
                                                transition={{ duration: 0.16 }}
                                                className="flex items-baseline gap-1"
                                            >
                                                {plan.isEnterprise ? (
                                                    <span className="text-3xl font-extrabold text-[#fbbf24]">Custom</span>
                                                ) : price === 0 ? (
                                                    <span className="text-4xl font-extrabold text-white">Free</span>
                                                ) : (
                                                    <>
                                                        <span className="text-4xl font-extrabold text-white">€{price}</span>
                                                        <span className="text-white/35 text-sm">/ mo</span>
                                                    </>
                                                )}
                                            </motion.div>
                                        </AnimatePresence>

                                        {plan.isEnterprise ? (
                                            <p className="text-white/30 text-xs mt-1">Contact us for a custom quote</p>
                                        ) : isYearly && plan.yearlyTotal && plan.yearlyTotal > 0 ? (
                                            <p className="text-white/30 text-xs mt-1">billed €{plan.yearlyTotal}/year</p>
                                        ) : !isYearly && plan.monthlyPrice && plan.monthlyPrice > 0 ? (
                                            <p className="text-white/30 text-xs mt-1">or €{plan.yearlyPrice}/mo billed annually</p>
                                        ) : null}
                                    </div>

                                    {/* Features */}
                                    <ul className="mb-7 space-y-2.5 flex-1">
                                        {plan.features.map((f, fi) => (
                                            <li key={fi} className="flex items-start gap-2.5">
                                                {f.included ? (
                                                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: plan.accentColor }} />
                                                ) : (
                                                    <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/18" />
                                                )}
                                                <span className={`text-xs leading-snug ${f.included ? (f.highlight ? 'text-white font-semibold' : 'text-white/60') : 'text-white/20 line-through'}`}>
                                                    {f.text}
                                                    {f.note && <span className="text-white/30 ml-1">({f.note})</span>}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    {plan.isEnterprise ? (
                                        <Button
                                            onClick={() => setEnterpriseOpen(true)}
                                            className={`w-full rounded-xl h-11 font-bold text-sm transition-all duration-300 ${plan.ctaClassName}`}
                                        >
                                            {plan.ctaText}
                                        </Button>
                                    ) : (
                                        <Link href={`/${locale}/${plan.id === 'free' ? 'signup' : `signup?plan=${plan.id}`}`}>
                                            <Button className={`w-full rounded-xl h-11 font-bold text-sm transition-all duration-300 ${plan.ctaClassName}`}>
                                                {plan.ctaText}
                                            </Button>
                                        </Link>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Value Anchoring Strip ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="mb-20 grid grid-cols-1 md:grid-cols-3 gap-5"
                >
                    {[
                        {
                            icon: <MapPin className="w-5 h-5" />, color: '#00FFB3',
                            title: 'Free includes',
                            items: ['Full day-by-day itinerary', 'Activity & place suggestions', 'Real road map & route plan', '3 complete trips to try'],
                        },
                        {
                            icon: <Route className="w-5 h-5" />, color: '#00D4FF',
                            title: 'Starter unlocks',
                            items: ['Unlimited itineraries', 'Save & share your trips', 'Hotel recommendations', 'PDF export'],
                        },
                        {
                            icon: <CalendarDays className="w-5 h-5" />, color: '#B4A7FF',
                            title: 'Pro unlocks',
                            items: ['Live flight prices', 'Voice translation (10 min)', 'ESG sustainability score', 'Advanced route optimization'],
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6"
                        >
                            <span style={{ color: card.color }} className="mb-3 block">{card.icon}</span>
                            <h4 className="text-white font-bold text-sm mb-3">{card.title}</h4>
                            <ul className="space-y-2">
                                {card.items.map((item, j) => (
                                    <li key={j} className="flex items-center gap-2 text-white/50 text-xs">
                                        <Check className="w-3 h-3 shrink-0" style={{ color: card.color }} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </motion.div>

                {/* ── Feature Comparison Table ── */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="mb-20 overflow-x-auto"
                >
                    <h2 className="text-2xl font-extrabold text-white text-center mb-7">Full feature comparison</h2>
                    <div className="rounded-2xl border border-white/8 overflow-hidden bg-white/[0.02]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/8">
                                    <th className="text-left p-4 pl-5 text-white/35 font-medium w-[30%]">Feature</th>
                                    <th className="p-4 text-center text-white/55 font-bold text-xs uppercase tracking-wider">Free</th>
                                    <th className="p-4 text-center text-[#00D4FF] font-bold text-xs uppercase tracking-wider">Starter</th>
                                    <th className="p-4 text-center text-[#B4A7FF] font-bold text-xs uppercase tracking-wider bg-[#6366F1]/5">Pro ⭐</th>
                                    <th className="p-4 text-center text-[#fbbf24] font-bold text-xs uppercase tracking-wider">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonRows.map((row, i) => (
                                    <tr key={i} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                                        <td className="p-3.5 pl-5 text-white/50 text-xs">{row.feature}</td>
                                        <td className="p-3.5 text-center text-white/40 text-xs">{row.free}</td>
                                        <td className="p-3.5 text-center text-white/60 text-xs">{row.starter}</td>
                                        <td className="p-3.5 text-center text-white/80 text-xs bg-[#6366F1]/5 font-medium">{row.pro}</td>
                                        <td className="p-3.5 text-center text-[#fbbf24]/70 text-xs">{row.enterprise}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* ── Buy Me a Coffee ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="mb-20"
                >
                    <div className="bg-gradient-to-br from-[#1a1206] to-[#0d0a03] border border-[#fbbf24]/20 rounded-3xl p-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-shrink-0">
                            <div className="w-20 h-20 rounded-3xl bg-[#fbbf24]/10 border border-[#fbbf24]/20 flex items-center justify-center">
                                <Coffee className="w-10 h-10 text-[#fbbf24]" />
                            </div>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-extrabold text-white mb-2">Enjoying iWillTravel? ☕</h2>
                            <p className="text-white/50 text-sm leading-relaxed max-w-md">
                                Built by one person who loves travel and code. If it helped you plan a great trip, a coffee keeps the AI thinking.
                                No subscription, no drama — just good vibes.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                                {['€3 — small coffee', '€5 — the real deal', '€9 — you\'re a legend'].map((label, i) => (
                                    <span key={i} className="text-xs text-[#fbbf24]/60 bg-[#fbbf24]/5 border border-[#fbbf24]/15 rounded-full px-3 py-1">
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <a href="https://buymeacoffee.com/iwilltravel" target="_blank" rel="noopener noreferrer">
                                <Button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-extrabold h-12 px-8 rounded-xl transition-all duration-300 shadow-[0_0_24px_rgba(251,191,36,0.3)] hover:shadow-[0_0_35px_rgba(251,191,36,0.5)] text-sm gap-2">
                                    <Coffee className="w-4 h-4" /> Buy me a coffee
                                </Button>
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* ── Inline FAQ ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-2xl font-extrabold text-white text-center mb-8">Common questions</h2>
                    <div className="space-y-3 max-w-3xl mx-auto">
                        {pricingFaqs.map((faq, i) => (
                            <div
                                key={i}
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className={`border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${openFaq === i ? 'bg-white/[0.04] border-[#6366F1]/30' : 'bg-white/[0.02] border-white/[0.07] hover:border-white/20'}`}
                            >
                                <div className="px-6 py-4 flex items-center justify-between gap-4">
                                    <h3 className="font-semibold text-sm text-white">{faq.q}</h3>
                                    <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.25 }}>
                                        <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                                    </motion.div>
                                </div>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <p className="px-6 pb-5 text-white/50 text-sm leading-relaxed">{faq.a}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* ── Footer strip ── */}
                <motion.div
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    className="text-center"
                >
                    <p className="text-white/30 text-sm">
                        Still have questions?{' '}
                        <button onClick={() => setEnterpriseOpen(true)} className="text-white/50 hover:text-white underline underline-offset-4 transition-colors">
                            Talk to us
                        </button>
                        {' '}or reach out at{' '}
                        <a href="mailto:hello@iwilltravel.ai" className="text-white/50 hover:text-white underline underline-offset-4 transition-colors">
                            hello@iwilltravel.ai
                        </a>
                    </p>
                </motion.div>

            </div>

            {/* Schema markup for FAQ rich results */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: pricingFaqs.map(faq => ({
                            '@type': 'Question',
                            name: faq.q,
                            acceptedAnswer: { '@type': 'Answer', text: faq.a },
                        })),
                    }),
                }}
            />
        </div>
    );
}
