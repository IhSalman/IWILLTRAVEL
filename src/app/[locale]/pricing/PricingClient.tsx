'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/routing';
import {
    readCheckoutIntent,
    checkoutIntentQuery,
    startPlanCheckout,
    type CheckoutIntent,
} from '@/lib/checkout-client';
import {
    Check, Star, Plane, X, Sparkles,
    Shield, MapPin, Route, Building2,
    CalendarDays, ChevronDown, Send, Compass
} from 'lucide-react';
import { PLAN_PRICING } from '@/utils/plan-limits';

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
        try {
            await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, company, message, type: 'enterprise' }),
            });
        } catch {
            // graceful fallback
        }
        setSent(true);
        setSending(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="apple-liquid-glass rounded-[32px] p-8 relative">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {!sent ? (
                        <>
                            <div className="mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center mb-4">
                                    <Building2 className="w-6 h-6 text-sky-300" />
                                </div>
                                <h2 className="text-2xl font-serif font-bold text-white mb-1">Enterprise &amp; Agency Plans</h2>
                                <p className="text-slate-300/80 text-sm">
                                    Custom seat pools, white-label itinerary exports, and direct REST API access for travel teams.
                                </p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] text-slate-300 font-mono uppercase tracking-wider mb-1.5 block">Name</label>
                                        <input
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your name"
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/[0.1] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-white/[0.25] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-slate-300 font-mono uppercase tracking-wider mb-1.5 block">Organization</label>
                                        <input
                                            value={company}
                                            onChange={(e) => setCompany(e.target.value)}
                                            placeholder="Optional"
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/[0.1] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-white/[0.25] transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] text-slate-300 font-mono uppercase tracking-wider mb-1.5 block">Work Email</label>
                                    <input
                                        required
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/[0.1] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-white/[0.25] transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-slate-300 font-mono uppercase tracking-wider mb-1.5 block">Requirements</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Team size, white-label needs, or API volume..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-white/[0.1] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-white/[0.25] transition-all resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="w-full h-12 rounded-2xl font-semibold btn-apple-primary text-sm flex items-center justify-center gap-2"
                                >
                                    {sending ? (
                                        'Sending Inquiry…'
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" /> Request Custom Quote
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-center mx-auto mb-4">
                                <Check className="w-6 h-6 text-emerald-300" />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-white mb-2">Inquiry Received</h3>
                            <p className="text-slate-300/80 text-sm mb-6">
                                Our partnerships team will reply within 24 business hours.
                            </p>
                            <button onClick={onClose} className="btn-apple-glass rounded-full text-xs px-6 py-2.5 font-medium">
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────
// PRICING DATA (Synced directly with PLAN_PRICING & PLAN_LIMITS)
// ─────────────────────────────────────────────
interface PlanFeature {
    text: string;
    included: boolean;
    highlight?: boolean;
}

interface PricingPlan {
    id: string;
    name: string;
    label: string;
    tagline: string;
    monthlyPrice: number | null;
    yearlyMonthlyEquivalent: string | null;
    yearlyTotal: number | null;
    icon: React.ReactNode;
    badge?: string;
    ctaText: string;
    features: PlanFeature[];
    isEnterprise?: boolean;
    isPopular?: boolean;
}

const plans: PricingPlan[] = [
    {
        id: 'free',
        name: 'Free',
        label: 'Discovery',
        tagline: 'Experience 8-agent AI trip planning with zero payment card required.',
        monthlyPrice: PLAN_PRICING.free.monthly,
        yearlyMonthlyEquivalent: '0',
        yearlyTotal: PLAN_PRICING.free.yearly,
        icon: <Compass className="w-4 h-4 text-slate-300" />,
        ctaText: 'Start Free',
        features: [
            { text: 'Complimentary 8-agent itineraries', included: true, highlight: true },
            { text: 'Day-by-day route & activity curation', included: true },
            { text: 'Explore curated global destination guides', included: true },
            { text: 'Save & share permanent trip links', included: false },
            { text: 'Live hotel stay curation', included: false },
            { text: 'Live flight fare telemetry', included: false },
            { text: 'LinguaSphere voice interpreter', included: false },
            { text: 'PDF offline dossier export', included: false },
        ],
    },
    {
        id: 'starter',
        name: 'Starter',
        label: 'Occasional Traveler',
        tagline: 'Unlimited itineraries, permanent saving, curated hotels, and PDF exports.',
        monthlyPrice: PLAN_PRICING.starter.monthly, // €6
        yearlyMonthlyEquivalent: '5',               // €60 / 12 = €5/mo
        yearlyTotal: PLAN_PRICING.starter.yearly,   // €60
        icon: <Plane className="w-4 h-4 text-sky-300" />,
        ctaText: 'Choose Starter',
        features: [
            { text: 'Unlimited AI trip itineraries', included: true, highlight: true },
            { text: 'Save & share trips across devices', included: true },
            { text: 'Curated hotel stay recommendations', included: true },
            { text: 'Offline PDF itinerary export', included: true },
            { text: 'Priority AI model generation speed', included: true },
            { text: 'Live flight pricing telemetry', included: false },
            { text: 'LinguaSphere voice interpreter', included: false },
            { text: 'ESG sustainability carbon score', included: false },
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        label: 'Frequent Voyager',
        tagline: 'Full intelligence suite with live flights, voice translation, and carbon scoring.',
        monthlyPrice: PLAN_PRICING.pro.monthly,     // €12
        yearlyMonthlyEquivalent: '9.58',            // €115 / 12 = €9.58/mo
        yearlyTotal: PLAN_PRICING.pro.yearly,       // €115
        icon: <Star className="w-4 h-4 text-amber-300" />,
        badge: 'Most Popular',
        isPopular: true,
        ctaText: 'Upgrade to Pro',
        features: [
            { text: 'Everything in Starter', included: true, highlight: true },
            { text: 'Live flight pricing & corridor radar', included: true, highlight: true },
            { text: 'LinguaSphere voice & OCR translation', included: true, highlight: true },
            { text: 'ESG sustainability & carbon scoring', included: true },
            { text: 'Multi-modal transit route optimization', included: true },
            { text: 'Clean PDF export (no watermark)', included: true },
            { text: 'Priority traveler support', included: true },
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        label: 'Teams & Agencies',
        tagline: 'Custom team seats, white-label exports, REST API access & dedicated SLA.',
        monthlyPrice: null,
        yearlyMonthlyEquivalent: null,
        yearlyTotal: null,
        icon: <Building2 className="w-4 h-4 text-slate-300" />,
        isEnterprise: true,
        ctaText: 'Contact Sales',
        features: [
            { text: 'Everything in Pro', included: true, highlight: true },
            { text: 'White-label agency PDF exports', included: true, highlight: true },
            { text: 'Full REST API endpoint access', included: true, highlight: true },
            { text: 'Multi-seat team workspace', included: true },
            { text: 'Unlimited voice translation minutes', included: true },
            { text: 'Custom GDS / booking integrations', included: true },
            { text: 'Dedicated solutions lead & SLA', included: true },
        ],
    },
];

// ─────────────────────────────────────────────
// COMPARISON TABLE
// ─────────────────────────────────────────────
const comparisonRows = [
    { feature: '8-Agent itinerary generation', free: '✓', starter: '✓', pro: '✓', enterprise: '✓' },
    { feature: 'Global destination guides', free: '✓', starter: '✓', pro: '✓', enterprise: '✓' },
    { feature: 'Monthly trip allowance', free: 'Open Preview', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Trip duration cap', free: 'No cap', starter: 'No cap', pro: 'No cap', enterprise: 'No cap' },
    { feature: 'Save & share itineraries', free: '—', starter: '✓', pro: '✓', enterprise: '✓' },
    { feature: 'Live hotel stay curation', free: '—', starter: '✓', pro: '✓', enterprise: '✓' },
    { feature: 'Live flight fare telemetry', free: '—', starter: '—', pro: '✓', enterprise: '✓' },
    { feature: 'PDF offline export', free: '—', starter: '✓', pro: 'Clean format', enterprise: 'White-label' },
    { feature: 'LinguaSphere voice interpreter', free: '—', starter: '—', pro: '10 min/mo + ∞ text', enterprise: 'Unlimited' },
    { feature: 'ESG sustainability carbon score', free: '—', starter: '—', pro: '✓', enterprise: '✓' },
    { feature: 'Priority model compute', free: '—', starter: '✓', pro: '✓', enterprise: '✓' },
    { feature: 'REST API access', free: '—', starter: '—', pro: '—', enterprise: '✓' },
    { feature: 'White-label branding', free: '—', starter: '—', pro: '—', enterprise: '✓' },
    { feature: 'Team workspace seats', free: '—', starter: '—', pro: '—', enterprise: 'Custom' },
];

// ─────────────────────────────────────────────
// INLINE FAQ
// ─────────────────────────────────────────────
const pricingFaqs = [
    {
        q: 'Do I need a credit card to start planning?',
        a: 'No. You can generate complete multi-day itineraries and explore our destination intelligence completely free without entering payment details.',
    },
    {
        q: 'Can I cancel or switch plans anytime?',
        a: 'Yes. There are zero lock-in contracts. You can upgrade, downgrade, or cancel in one click from your account settings.',
    },
    {
        q: 'What is the difference between Starter (€6/mo) and Pro (€12/mo)?',
        a: 'Starter unlocks unlimited saved & shareable itineraries, hotel recommendations, priority model speed, and PDF exports. Pro adds live flight fare telemetry, LinguaSphere voice & camera translation, and ESG carbon footprint scoring.',
    },
    {
        q: 'How does the 8-Agent Architecture verify travel plans?',
        a: 'Every trip passes sequentially through 8 specialized agents—Discovery, Planning, Research, Logic Checker, Experience, Logistics, Sustainability, and Composer—auditing geographic proximity, transit times, opening hours, and realistic daily budgets.',
    },
    {
        q: 'Do you offer white-label or agency plans?',
        a: 'Yes. Our Enterprise tier provides multi-seat team workspaces, custom-branded client PDF dossiers, and REST API access for travel advisors and agencies.',
    },
];

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function PricingClient() {
    const [isYearly, setIsYearly] = useState(false);
    const [enterpriseOpen, setEnterpriseOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
    const router = useRouter();
    const resumeHandled = useRef(false);

    const handleCheckout = async (intent: CheckoutIntent) => {
        if (checkoutPlan) return;
        setCheckoutPlan(intent.plan);
        const result = await startPlanCheckout(intent);
        if (result.status === 'unauthenticated') {
            router.push(`/signup${checkoutIntentQuery(intent)}`);
            return;
        }
        if (result.status === 'error') {
            toast.error(result.message);
            setCheckoutPlan(null);
        }
        // 'redirecting': keep the button in its loading state while Stripe loads.
    };

    // Resume checkout after signup/login (/pricing?checkout=pro&billing=monthly),
    // and confirm a cancelled checkout.
    useEffect(() => {
        if (resumeHandled.current) return;
        resumeHandled.current = true;

        const params = new URLSearchParams(window.location.search);
        if (params.get('checkout') === 'cancelled') {
            toast('Checkout cancelled — you have not been charged.');
            return;
        }
        const intent = readCheckoutIntent(window.location.search, 'checkout');
        if (intent) {
            setIsYearly(intent.billing === 'yearly');
            void handleCheckout(intent);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-200 font-body relative overflow-x-clip selection:bg-white/10">
            {/* Ambient background glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-1/4 w-[620px] h-[620px] rounded-full blur-[150px] bg-sky-500/[0.04]" />
                <div className="absolute bottom-10 left-1/4 w-[520px] h-[520px] rounded-full blur-[150px] bg-indigo-500/[0.04]" />
            </div>

            {/* Enterprise Modal */}
            <AnimatePresence>{enterpriseOpen && <EnterpriseModal onClose={() => setEnterpriseOpen(false)} />}</AnimatePresence>

            <div className="container relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-28">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-glass-pill text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-5">
                            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                            Simple, Transparent Traveler Pricing
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                        className="text-4xl md:text-6xl font-serif font-bold tracking-tight mb-4 text-white"
                    >
                        8-Agent Travel Intelligence,{' '}
                        <span className="text-gradient-champagne">Priced Fairly.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14 }}
                        className="text-slate-300/80 text-base md:text-lg leading-relaxed mb-5"
                    >
                        Start planning for free, or unlock unlimited saved trips, live flight &amp; hotel telemetry, and real-time translation from €5/month.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                        className="inline-flex items-center gap-2 text-xs font-mono text-slate-300 apple-glass-pill rounded-full px-4 py-1.5"
                    >
                        <Shield className="w-3.5 h-3.5 text-emerald-300" />
                        No credit card required to start
                    </motion.div>
                </div>

                {/* Apple Liquid Glass Billing Toggle */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.22 }}
                    className="flex justify-center mb-16"
                >
                    <div className="apple-liquid-glass p-1.5 rounded-full flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setIsYearly(false)}
                            className={`relative px-6 py-2 rounded-full text-xs font-medium transition-colors ${
                                !isYearly ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            {!isYearly && (
                                <motion.div
                                    layoutId="pricing-billing-pill"
                                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                    className="absolute inset-0 rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-200 shadow-md"
                                />
                            )}
                            <span className="relative z-10">Monthly</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsYearly(true)}
                            className={`relative px-6 py-2 rounded-full text-xs font-medium transition-colors flex items-center gap-2 ${
                                isYearly ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            {isYearly && (
                                <motion.div
                                    layoutId="pricing-billing-pill"
                                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                    className="absolute inset-0 rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-200 shadow-md"
                                />
                            )}
                            <span className="relative z-10">Annual</span>
                            <span
                                className={`relative z-10 text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                    isYearly ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20'
                                }`}
                            >
                                Save 20%
                            </span>
                        </button>
                    </div>
                </motion.div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-24">
                    {plans.map((plan, i) => {
                        const displayPrice = isYearly ? plan.yearlyMonthlyEquivalent : plan.monthlyPrice;

                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 + i * 0.06 }}
                                className={`relative ${plan.isPopular ? 'xl:-translate-y-3' : ''}`}
                            >
                                {/* Recommended Badge */}
                                {plan.badge && (
                                    <div className="absolute -top-3.5 inset-x-0 flex justify-center z-10">
                                        <span className="bg-white text-slate-950 text-[10px] font-mono font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
                                            {plan.badge}
                                        </span>
                                    </div>
                                )}

                                <div
                                    className={`apple-glass-card h-full rounded-[30px] p-6 md:p-7 flex flex-col justify-between transition-all hover:border-white/25 ${
                                        plan.isPopular ? 'border-white/[0.26] ring-1 ring-white/[0.18] bg-slate-900/85' : ''
                                    }`}
                                >
                                    <div>
                                        {/* Plan Header */}
                                        <div className="mb-5">
                                            <div className="flex items-center gap-2.5 mb-1.5">
                                                <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                                                    {plan.icon}
                                                </div>
                                                <h3 className="text-xl font-serif font-bold text-white">{plan.name}</h3>
                                            </div>
                                            <p className="text-[10px] font-mono font-semibold uppercase tracking-wider mb-2 text-sky-300/90">
                                                {plan.label}
                                            </p>
                                            <p className="text-slate-300/80 text-xs leading-relaxed min-h-[2.5rem]">{plan.tagline}</p>
                                        </div>

                                        {/* Price */}
                                        <div className="mb-6 pb-5 border-b border-white/[0.08]">
                                            <div className="flex items-baseline gap-1">
                                                {plan.isEnterprise ? (
                                                    <span className="text-3xl font-serif font-bold text-white">Custom</span>
                                                ) : plan.monthlyPrice === 0 ? (
                                                    <span className="text-3xl font-serif font-bold text-white">€0</span>
                                                ) : (
                                                    <>
                                                        <span className="text-3xl font-serif font-bold text-white">€{displayPrice}</span>
                                                        <span className="text-slate-400 text-xs font-mono">/ mo</span>
                                                    </>
                                                )}
                                            </div>

                                            {plan.isEnterprise ? (
                                                <p className="text-slate-400 text-[11px] mt-1 font-mono">Tailored for agencies &amp; teams</p>
                                            ) : plan.monthlyPrice === 0 ? (
                                                <p className="text-slate-400 text-[11px] mt-1 font-mono">Free forever discovery tier</p>
                                            ) : isYearly && plan.yearlyTotal ? (
                                                <p className="text-emerald-300/90 text-[11px] mt-1 font-mono">Billed €{plan.yearlyTotal}/year</p>
                                            ) : (
                                                <p className="text-slate-400 text-[11px] mt-1 font-mono">
                                                    or €{plan.yearlyMonthlyEquivalent}/mo billed annually (€{plan.yearlyTotal}/yr)
                                                </p>
                                            )}
                                        </div>

                                        {/* Features */}
                                        <ul className="mb-8 space-y-2.5">
                                            {plan.features.map((f, fi) => (
                                                <li key={fi} className="flex items-start gap-2.5">
                                                    {f.included ? (
                                                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-300" />
                                                    ) : (
                                                        <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
                                                    )}
                                                    <span
                                                        className={`text-xs leading-snug ${
                                                            f.included
                                                                ? f.highlight
                                                                    ? 'text-white font-medium'
                                                                    : 'text-slate-300'
                                                                : 'text-slate-600 line-through'
                                                        }`}
                                                    >
                                                        {f.text}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* CTA */}
                                    {plan.isEnterprise ? (
                                        <button
                                            type="button"
                                            onClick={() => setEnterpriseOpen(true)}
                                            className="w-full rounded-2xl h-11 font-medium text-xs btn-apple-glass"
                                        >
                                            {plan.ctaText}
                                        </button>
                                    ) : plan.id === 'free' ? (
                                        <Link href="/plan-trip" className="block w-full">
                                            <span
                                                className={`w-full rounded-2xl h-11 font-semibold text-xs flex items-center justify-center ${
                                                    plan.isPopular ? 'btn-apple-primary' : 'btn-apple-glass'
                                                }`}
                                            >
                                                {plan.ctaText}
                                            </span>
                                        </Link>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={checkoutPlan !== null}
                                            onClick={() =>
                                                handleCheckout({
                                                    plan: plan.id as CheckoutIntent['plan'],
                                                    billing: isYearly ? 'yearly' : 'monthly',
                                                })
                                            }
                                            className={`w-full rounded-2xl h-11 font-semibold text-xs flex items-center justify-center disabled:opacity-60 disabled:cursor-wait ${
                                                plan.isPopular ? 'btn-apple-primary' : 'btn-apple-glass'
                                            }`}
                                        >
                                            {checkoutPlan === plan.id ? 'Opening secure checkout…' : plan.ctaText}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Value Anchoring Strip */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-24 grid grid-cols-1 md:grid-cols-3 gap-5"
                >
                    {[
                        {
                            icon: <MapPin className="w-5 h-5 text-sky-300" />,
                            title: 'Discovery Included Free',
                            items: [
                                '8-agent multi-day itinerary synthesis',
                                'Neighborhood dining & hidden gems',
                                'Interactive map & route timeline',
                                'Zero day-length restrictions',
                            ],
                        },
                        {
                            icon: <Route className="w-5 h-5 text-emerald-300" />,
                            title: 'Starter Capabilities (€6/mo)',
                            items: [
                                'Unlimited bespoke itineraries',
                                'Permanent cloud sync & share links',
                                'Curated hotel stay recommendations',
                                'Offline PDF dossier export',
                            ],
                        },
                        {
                            icon: <CalendarDays className="w-5 h-5 text-amber-300" />,
                            title: 'Pro Intelligence (€12/mo)',
                            items: [
                                'Live flight fare & corridor telemetry',
                                'LinguaSphere speech & camera OCR',
                                'ESG carbon footprint scoring',
                                'Priority AI model compute',
                            ],
                        },
                    ].map((card, i) => (
                        <div key={i} className="apple-glass-card rounded-3xl p-6">
                            <span className="mb-3 block">{card.icon}</span>
                            <h4 className="text-white font-serif font-bold text-base mb-3">{card.title}</h4>
                            <ul className="space-y-2">
                                {card.items.map((item, j) => (
                                    <li key={j} className="flex items-center gap-2 text-slate-300/85 text-xs">
                                        <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </motion.div>

                {/* Feature Comparison Table */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-24 overflow-x-auto"
                >
                    <h2 className="text-2xl font-serif font-bold text-white text-center mb-8">Full Plan Comparison</h2>
                    <div className="apple-glass-card rounded-3xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.08] bg-slate-950/50">
                                    <th className="text-left p-4 pl-6 text-slate-300 font-mono text-xs uppercase tracking-wider w-[32%]">Capability</th>
                                    <th className="p-4 text-center text-slate-400 font-mono font-medium text-xs uppercase tracking-wider">Free</th>
                                    <th className="p-4 text-center text-slate-200 font-mono font-medium text-xs uppercase tracking-wider">Starter (€6)</th>
                                    <th className="p-4 text-center text-white font-mono font-bold text-xs uppercase tracking-wider bg-white/[0.05]">Pro (€12) ⭐</th>
                                    <th className="p-4 text-center text-slate-300 font-mono font-medium text-xs uppercase tracking-wider">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonRows.map((row, i) => (
                                    <tr key={i} className={`border-b border-white/[0.05] last:border-0 ${i % 2 === 0 ? 'bg-white/[0.015]' : ''}`}>
                                        <td className="p-3.5 pl-6 text-slate-200 text-xs">{row.feature}</td>
                                        <td className="p-3.5 text-center text-slate-400 text-xs font-mono">{row.free}</td>
                                        <td className="p-3.5 text-center text-slate-200 text-xs font-mono">{row.starter}</td>
                                        <td className="p-3.5 text-center text-white text-xs font-mono bg-white/[0.05] font-semibold">{row.pro}</td>
                                        <td className="p-3.5 text-center text-slate-300 text-xs font-mono">{row.enterprise}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Inline FAQ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-20 max-w-3xl mx-auto"
                >
                    <h2 className="text-2xl font-serif font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
                    <div className="space-y-3">
                        {pricingFaqs.map((faq, i) => (
                            <div
                                key={i}
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className={`apple-glass-card rounded-2xl transition-all cursor-pointer p-5 ${
                                    openFaq === i ? 'border-white/[0.22]' : 'hover:border-white/[0.16]'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="font-medium text-sm text-white">{faq.q}</h3>
                                    <ChevronDown
                                        className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${
                                            openFaq === i ? 'rotate-180' : ''
                                        }`}
                                    />
                                </div>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <p className="pt-3 text-slate-300/85 text-xs leading-relaxed border-t border-white/[0.06] mt-3">{faq.a}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Footer strip */}
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center">
                    <p className="text-slate-400 text-xs font-mono">
                        Questions about custom plans or student/team discounts?{' '}
                        <button
                            type="button"
                            onClick={() => setEnterpriseOpen(true)}
                            className="text-white hover:text-sky-300 underline underline-offset-4 transition-colors"
                        >
                            Speak with us
                        </button>{' '}
                        or email{' '}
                        <a href="mailto:hello@iwilltravel.app" className="text-white hover:text-sky-300 underline underline-offset-4 transition-colors">
                            hello@iwilltravel.app
                        </a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
