'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Globe2, FileCheck, ChevronRight,
    Loader2, ShieldAlert, BookOpen,
    AlertTriangle, Activity, ArrowUpDown,
    ScanFace, Navigation, Fingerprint, AlertCircle, ArrowRight, Lock, Sparkles
} from 'lucide-react';

const COUNTRIES = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia',
    'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium',
    'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia',
    'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Cuba', 'Czech Republic',
    'Denmark', 'Ecuador', 'Egypt', 'Ethiopia', 'Finland', 'France', 'Georgia',
    'Germany', 'Ghana', 'Greece', 'Hungary', 'India', 'Indonesia', 'Iran',
    'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan',
    'Kazakhstan', 'Kenya', 'Kuwait', 'Lebanon', 'Malaysia', 'Mexico',
    'Morocco', 'Nepal', 'Netherlands', 'Nigeria', 'Norway', 'Pakistan',
    'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
    'Saudi Arabia', 'Serbia', 'Singapore', 'South Africa', 'South Korea',
    'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand',
    'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
    'United States', 'Venezuela', 'Vietnam', 'Zimbabwe',
];

const POPULAR_CORRIDORS = [
    { from: 'United States', to: 'Japan' },
    { from: 'United Kingdom', to: 'France' },
    { from: 'India', to: 'Thailand' },
    { from: 'Canada', to: 'Portugal' },
    { from: 'Australia', to: 'Indonesia' },
];

const SAMPLE_EMBASSY_TEXT = `Pursuant to Article 14 of the Short-Stay Entry Regulation (Sub-class B-1/Tourist), nationals of non-exempt jurisdictions must furnish biometric travel credentials retaining a minimum validity of 180 days beyond intended departure, alongside verifiable onward air carriage, proof of confirmed lodging, and liquid financial reserves equivalent to no less than EUR 120 per diem for the duration of authorized sojourn (maximum 90 days within any rolling 180-day period).`;

const WEIGHT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    critical: { label: 'CRITICAL', color: 'text-rose-300', bg: 'bg-rose-950/40', border: 'border-rose-500/20' },
    important: { label: 'IMPORTANT', color: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-500/20' },
    recommended: { label: 'OPTIONAL', color: 'text-slate-300', bg: 'bg-slate-800/40', border: 'border-white/10' },
};

const STATUS_COLOR: Record<string, string> = {
    green: 'border-emerald-500/25 bg-emerald-950/25 text-emerald-300',
    blue: 'border-sky-500/25 bg-sky-950/25 text-sky-300',
    yellow: 'border-amber-500/25 bg-amber-950/25 text-amber-300',
    orange: 'border-amber-600/25 bg-amber-950/30 text-amber-300',
    red: 'border-rose-500/25 bg-rose-950/30 text-rose-300',
};

type Tab = 'checker' | 'denial' | 'passport' | 'simplifier';

const AmbientBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0b0c0f]" />
        <div className="absolute top-0 right-1/4 w-[620px] h-[620px] bg-sky-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-10 left-1/4 w-[520px] h-[520px] bg-indigo-500/[0.04] rounded-full blur-[150px]" />
    </div>
);

const RadarScan = () => (
    <div className="relative w-52 h-52 mx-auto flex items-center justify-center">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-dashed border-white/[0.14]"
        />
        <div className="absolute inset-4 rounded-full border border-white/[0.08] bg-slate-900/50 overflow-hidden">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="w-1/2 h-[50%] absolute top-0 right-1/2 origin-bottom-right"
                style={{
                    background: 'conic-gradient(from 90deg, transparent 0deg, rgba(125, 211, 252, 0.14) 90deg)',
                }}
            />
        </div>
        <div className="absolute inset-14 rounded-full border border-white/[0.08]" />
        <div className="absolute inset-20 rounded-full border border-white/[0.14] bg-slate-950" />
        <Globe2 className="w-9 h-9 text-sky-300 relative z-10 animate-pulse" />
    </div>
);

function AuthPromptBanner({ message }: { message?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="apple-liquid-glass rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-sky-400/20"
        >
            <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-sky-300" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-white">Sign in to run live Visa & Border Intelligence</h4>
                    <p className="text-xs text-slate-300/80 mt-0.5 leading-relaxed">
                        {message || 'Create a free traveler account to verify real-time border clearance rules, denial risk profiles, and passport mobility.'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                <Link href="/login" className="btn-apple-primary px-5 py-2.5 rounded-full text-xs font-semibold text-center flex-1 sm:flex-initial">
                    Sign In →
                </Link>
                <Link href="/signup" className="btn-apple-glass px-4 py-2.5 rounded-full text-xs font-medium text-center flex-1 sm:flex-initial">
                    Create Free Account
                </Link>
            </div>
        </motion.div>
    );
}

function VisaHubContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<Tab>('checker');

    // Shared Auth / Error Feedback
    const [requiresAuth, setRequiresAuth] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // --- Visa Checker State ---
    const [source, setSource] = useState('');
    const [destination, setDestination] = useState('');
    const [step, setStep] = useState(1);
    const [showResults, setShowResults] = useState(false);
    const [visaInfo, setVisaInfo] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        const destParam = searchParams.get('destination');
        const sourceParam = searchParams.get('source');
        if (destParam) setDestination(destParam);
        if (sourceParam) setSource(sourceParam);
    }, [searchParams]);

    // --- Denial Risk State ---
    const [profile, setProfile] = useState({
        nationality: '', destination: '', employment: '', ownsProperty: 'No',
        previousDenials: 'None', travelHistory: '', purpose: 'Tourism',
        income: '', familyTies: '',
    });
    const [denialResult, setDenialResult] = useState<any>(null);
    const [isAssessing, setIsAssessing] = useState(false);

    // --- Passport Power State ---
    const [passportCountry, setPassportCountry] = useState('');
    const [passportData, setPassportData] = useState<any>(null);
    const [isLoadingPassport, setIsLoadingPassport] = useState(false);

    // --- Simplifier State ---
    const [rawText, setRawText] = useState('');
    const [simplifiedInfo, setSimplifiedInfo] = useState<any>(null);
    const [isSimplifying, setIsSimplifying] = useState(false);

    const resetFeedback = () => {
        setRequiresAuth(false);
        setApiError(null);
    };

    const handleSwapCorridor = () => {
        setSource(destination);
        setDestination(source);
    };

    const handleSearch = async () => {
        if (!source || !destination) return;
        resetFeedback();
        setIsAnalyzing(true);
        setShowResults(true);
        setStep(2);
        setVisaInfo(null);
        try {
            const res = await fetch('/api/visa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source, destination }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setVisaInfo(data);
                setStep(4);
            } else if (res.status === 401 || data.requiresAuth) {
                setRequiresAuth(true);
                setShowResults(false);
                setStep(1);
            } else {
                setApiError(data.error || `Unable to retrieve border requirements for ${destination}.`);
                setShowResults(false);
                setStep(1);
            }
        } catch {
            setApiError('Network error while contacting the border intelligence service. Please try again.');
            setShowResults(false);
            setStep(1);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDenialAssessment = async () => {
        resetFeedback();
        setIsAssessing(true);
        setDenialResult(null);
        try {
            const res = await fetch('/api/visa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'denial_risk', profile }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setDenialResult(data);
            } else if (res.status === 401 || data.requiresAuth) {
                setRequiresAuth(true);
            } else {
                setApiError(data.error || 'Could not complete risk assessment. Please try again.');
            }
        } catch {
            setApiError('Network error while calculating profile risk.');
        } finally {
            setIsAssessing(false);
        }
    };

    const handlePassportLookup = async (overrideCountry?: string) => {
        const target = (overrideCountry ?? passportCountry).trim();
        if (!target) return;
        if (overrideCountry) setPassportCountry(overrideCountry);
        resetFeedback();
        setIsLoadingPassport(true);
        setPassportData(null);
        try {
            const res = await fetch('/api/visa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'passport_power', source: target }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setPassportData(data);
            } else if (res.status === 401 || data.requiresAuth) {
                setRequiresAuth(true);
            } else {
                setApiError(data.error || `Could not inspect mobility index for ${target}.`);
            }
        } catch {
            setApiError('Network error while querying passport mobility.');
        } finally {
            setIsLoadingPassport(false);
        }
    };

    const handleSimplify = async () => {
        if (!rawText.trim()) return;
        resetFeedback();
        setIsSimplifying(true);
        setSimplifiedInfo(null);
        try {
            const res = await fetch('/api/visa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawText }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setSimplifiedInfo(data);
            } else if (res.status === 401 || data.requiresAuth) {
                setRequiresAuth(true);
            } else {
                setApiError(data.error || 'Unable to decode policy text right now.');
            }
        } catch {
            setApiError('Network error while decoding embassy text.');
        } finally {
            setIsSimplifying(false);
        }
    };

    const tabs: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
        { id: 'checker', label: 'Route Clearance', icon: <Globe2 className="w-4 h-4" />, desc: 'Entry rules & fees' },
        { id: 'denial', label: 'Denial Risk', icon: <ShieldAlert className="w-4 h-4" />, desc: 'Approval confidence' },
        { id: 'passport', label: 'Passport Power', icon: <Fingerprint className="w-4 h-4" />, desc: 'Visa-free mobility' },
        { id: 'simplifier', label: 'Policy Decoder', icon: <ScanFace className="w-4 h-4" />, desc: 'Plain-English summary' },
    ];

    return (
        <div className="relative min-h-screen pt-28 pb-20 font-body text-slate-200 selection:bg-white/10 z-10">
            <AmbientBackground />

            <div className="container max-w-6xl mx-auto relative z-10 px-4 md:px-8">
                {/* Header */}
                <div className="mb-10 pb-8 border-b border-white/[0.07] relative">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full apple-glass-pill mb-5"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-medium tracking-wider uppercase text-slate-300 font-mono">Border & Entry Intelligence</span>
                    </motion.div>

                    <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight mb-3 text-white">
                        Visa &amp; Border Hub
                    </h1>
                    <p className="text-base text-slate-300/80 max-w-2xl leading-relaxed">
                        Verify passport entry rules, required documents, processing times, and approval confidence before booking flights.
                    </p>
                </div>

                {/* Apple Liquid Glass Segmented Tab Bar */}
                <div className="apple-liquid-glass p-2 rounded-[26px] grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                    {tabs.map((t) => {
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => { setActiveTab(t.id); resetFeedback(); }}
                                className={`relative text-left p-3.5 md:p-4 rounded-[20px] transition-colors duration-200 ${
                                    isActive ? 'text-slate-950' : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="visa-tab-highlight"
                                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                        className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-white via-slate-100 to-slate-200 shadow-lg"
                                    />
                                )}
                                <div className="relative z-10 flex items-center gap-2.5 mb-1">
                                    <div className={`p-1.5 rounded-xl border ${
                                        isActive
                                            ? 'bg-slate-950/10 text-slate-950 border-slate-950/10'
                                            : 'bg-white/[0.05] text-slate-300 border-white/[0.08]'
                                    }`}>
                                        {t.icon}
                                    </div>
                                    <span className={`text-sm font-semibold ${isActive ? 'text-slate-950' : 'text-white'}`}>
                                        {t.label}
                                    </span>
                                </div>
                                <p className={`relative z-10 text-[11px] pl-1 ${isActive ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                                    {t.desc}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Auth or Error Feedback Banner */}
                <div className="space-y-4 mb-6">
                    {requiresAuth && <AuthPromptBanner />}
                    {apiError && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-2xl bg-rose-950/35 border border-rose-500/25 text-rose-200 text-xs flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>{apiError}</span>
                            </div>
                            <button onClick={() => setApiError(null)} className="text-rose-300 hover:text-white font-mono text-[11px] shrink-0">
                                Dismiss
                            </button>
                        </motion.div>
                    )}
                </div>

                <datalist id="countries">
                    {COUNTRIES.map((c) => (
                        <option key={c} value={c} />
                    ))}
                </datalist>

                <AnimatePresence mode="wait">
                    {/* ===== TAB: ROUTE CLEARANCE (VISA CHECKER) ===== */}
                    {activeTab === 'checker' && (
                        <motion.div
                            key="checker"
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -14 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                        >
                            <div className="lg:col-span-2 space-y-6">
                                <div className="apple-glass-card rounded-[32px] p-6 md:p-10">
                                    <AnimatePresence mode="wait">
                                        {!showResults ? (
                                            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-7">
                                                <div>
                                                    <h3 className="text-2xl font-serif font-bold mb-1.5 text-white">Inspect Travel Corridor</h3>
                                                    <p className="text-slate-400 text-sm">Select your passport nationality and arrival destination</p>
                                                </div>

                                                {/* Quick Corridors */}
                                                <div>
                                                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2.5">
                                                        Quick Corridors
                                                    </span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {POPULAR_CORRIDORS.map((c) => (
                                                            <button
                                                                key={`${c.from}-${c.to}`}
                                                                type="button"
                                                                onClick={() => { setSource(c.from); setDestination(c.to); }}
                                                                className="apple-glass-pill px-3 py-1.5 rounded-full text-xs text-slate-200 hover:text-white hover:border-white/25 transition-all"
                                                            >
                                                                {c.from} → {c.to}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Origin Passport
                                                        </label>
                                                        <div className="relative">
                                                            <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <Input
                                                                placeholder="e.g. United States, United Kingdom, India"
                                                                className="h-14 pl-12 text-base font-medium border-white/[0.1] bg-slate-950/60 focus-visible:ring-1 focus-visible:ring-white/[0.25] rounded-2xl text-white placeholder:text-slate-500"
                                                                value={source}
                                                                onChange={(e) => setSource(e.target.value)}
                                                                list="countries"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-center -my-1">
                                                        <button
                                                            type="button"
                                                            onClick={handleSwapCorridor}
                                                            title="Swap Origin & Destination"
                                                            className="apple-glass-pill w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:scale-105 transition-all"
                                                        >
                                                            <ArrowUpDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Destination Country
                                                        </label>
                                                        <div className="relative">
                                                            <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-180" />
                                                            <Input
                                                                placeholder="e.g. Japan, France, Thailand"
                                                                className="h-14 pl-12 text-base font-medium border-white/[0.1] bg-slate-950/60 focus-visible:ring-1 focus-visible:ring-white/[0.25] rounded-2xl text-white placeholder:text-slate-500"
                                                                value={destination}
                                                                onChange={(e) => setDestination(e.target.value)}
                                                                list="countries"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    className="w-full h-14 rounded-2xl text-base font-semibold btn-apple-primary disabled:opacity-45 disabled:pointer-events-none"
                                                    disabled={!source || !destination}
                                                    onClick={handleSearch}
                                                >
                                                    Check Entry Requirements →
                                                </button>
                                            </motion.div>
                                        ) : isAnalyzing ? (
                                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                                                <RadarScan />
                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-serif font-bold text-white">Querying Border Regulations</h3>
                                                    <p className="text-slate-400 text-sm max-w-md mx-auto">
                                                        Evaluating entry requirements from <span className="text-white font-medium">{source}</span> to <span className="text-white font-medium">{destination}</span>…
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ) : visaInfo ? (
                                            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                                {/* Header */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-5 gap-4">
                                                    <div className="flex items-center gap-3 text-xl md:text-2xl font-serif font-bold">
                                                        <span className="text-white">{source}</span>
                                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                                        <span className="text-white">{destination}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2.5">
                                                        <Link
                                                            href={`/plan-trip?destination=${encodeURIComponent(destination)}`}
                                                            className="btn-apple-primary px-4 py-2 rounded-full text-xs font-semibold"
                                                        >
                                                            Plan {destination} Trip →
                                                        </Link>
                                                        <button
                                                            onClick={() => { setShowResults(false); setVisaInfo(null); setStep(1); }}
                                                            className="btn-apple-glass px-4 py-2 rounded-full text-xs font-medium"
                                                        >
                                                            New Query
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Alerts */}
                                                {visaInfo.warningsAndAlerts?.length > 0 && (
                                                    <div className="space-y-2">
                                                        {visaInfo.warningsAndAlerts.map((w: string, i: number) => (
                                                            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/25 text-amber-200">
                                                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                                                                <span className="text-xs leading-relaxed">{w}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Status Card */}
                                                <div className={`rounded-2xl p-6 border ${STATUS_COLOR[visaInfo.statusColor] || STATUS_COLOR.orange}`}>
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-950/70 border border-white/[0.12] flex items-center justify-center shrink-0">
                                                            <FileCheck className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300/80 mb-1">Clearance Status</div>
                                                            <h3 className="text-2xl font-serif font-bold text-white mb-2">{visaInfo.status}</h3>
                                                            <p className="text-slate-200/90 text-sm leading-relaxed">{visaInfo.description}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Facts Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    {[
                                                        { label: 'Processing', value: visaInfo.processingTime },
                                                        { label: 'Est. Fee', value: visaInfo.estimatedCost },
                                                        { label: 'Max Stay', value: visaInfo.maxStay },
                                                        { label: 'Denial Rate', value: visaInfo.denialRate },
                                                    ].map((fact, i) => (
                                                        <div key={i} className="bg-slate-950/60 border border-white/[0.08] rounded-2xl p-4">
                                                            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">{fact.label}</div>
                                                            <div className="font-semibold text-sm text-white font-mono">{fact.value || '—'}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Requirements */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-4 border-b border-white/[0.07] pb-3">
                                                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                                                            Required Documentation
                                                        </h4>
                                                        <Badge variant="outline" className="border-white/[0.12] text-slate-300 bg-white/[0.04] rounded-full font-mono text-[11px]">
                                                            {visaInfo.requirements?.length || 0} items
                                                        </Badge>
                                                    </div>
                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        {visaInfo.requirements?.map((req: any, i: number) => {
                                                            const wc = WEIGHT_CONFIG[req.weight] || WEIGHT_CONFIG.recommended;
                                                            return (
                                                                <div key={i} className={`flex flex-col p-4 rounded-2xl border ${wc.border} bg-slate-950/55`}>
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <h5 className="font-semibold text-white text-xs leading-snug">{req.title}</h5>
                                                                        <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${wc.bg} ${wc.color} shrink-0 ml-2 border ${wc.border}`}>
                                                                            {wc.label}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-300/80 leading-relaxed">{req.desc}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Sidebar HUD */}
                            <div className="space-y-6">
                                <div className="apple-glass-card rounded-[28px] p-6">
                                    <div className="text-[11px] font-mono tracking-wider text-slate-300 mb-5 uppercase flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-sky-400" /> Verification Protocol
                                    </div>
                                    <div className="space-y-3.5">
                                        {[
                                            'Origin Nationality Check',
                                            'Documentation Audit',
                                            'Policy Verification',
                                            'Clearance Synthesis',
                                        ].map((label, i) => (
                                            <div key={i} className={`flex items-center gap-3.5 ${step > i ? 'opacity-100' : 'opacity-45'}`}>
                                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-[11px] font-semibold border ${
                                                    step > i ? 'bg-white text-slate-950 border-white' : 'bg-slate-950/70 border-white/[0.08] text-slate-500'
                                                }`}>
                                                    {step > i ? '✓' : `0${i + 1}`}
                                                </div>
                                                <span className="text-xs font-medium text-slate-200">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="apple-glass-card rounded-[28px] p-6">
                                    <ShieldAlert className="w-7 h-7 text-amber-300 mb-3" />
                                    <h4 className="font-serif font-bold text-base text-white mb-1.5">Denial Risk Profiler</h4>
                                    <p className="text-xs text-slate-300/80 mb-5 leading-relaxed">
                                        Applying for a strict consulate visa? Estimate approval confidence and uncover tailored supporting documents.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setProfile((prev) => ({
                                                ...prev,
                                                nationality: prev.nationality || source,
                                                destination: prev.destination || destination,
                                            }));
                                            setActiveTab('denial');
                                        }}
                                        className="btn-apple-glass w-full py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-between"
                                    >
                                        <span>Assess Profile Risk</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ===== TAB: DENIAL RISK ===== */}
                    {activeTab === 'denial' && (
                        <motion.div key="denial" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}>
                            <div className="apple-glass-card rounded-[32px] p-6 md:p-10 space-y-8">
                                <div className="text-center max-w-xl mx-auto">
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.05] border border-white/[0.12] flex items-center justify-center shadow-lg">
                                        <ShieldAlert className="w-7 h-7 text-amber-300" />
                                    </div>
                                    <h2 className="text-3xl font-serif font-bold text-white mb-2">Denial Risk Profiler</h2>
                                    <p className="text-slate-300/80 text-sm leading-relaxed">
                                        Enter applicant parameters to estimate approval confidence and receive practical document recommendations.
                                    </p>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4 bg-slate-950/50 p-6 rounded-2xl border border-white/[0.07]">
                                    {[
                                        { key: 'nationality', label: 'Origin Country', placeholder: 'e.g. India, Nigeria, Brazil', useList: true },
                                        { key: 'destination', label: 'Destination Country', placeholder: 'e.g. United States, France, Japan', useList: true },
                                        { key: 'employment', label: 'Occupation / Industry', placeholder: 'e.g. Software Engineer' },
                                        { key: 'income', label: 'Monthly Income', placeholder: 'e.g. $4,000' },
                                        { key: 'travelHistory', label: 'Past Travel History', placeholder: 'e.g. UK, UAE, Schengen' },
                                        { key: 'familyTies', label: 'Home Ties / Family', placeholder: 'e.g. Spouse, lease, employer letter' },
                                    ].map(({ key, label, placeholder, useList }) => (
                                        <div key={key} className="space-y-1.5">
                                            <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider">{label}</label>
                                            <Input
                                                className="h-12 rounded-xl bg-slate-900/80 border-white/[0.1] focus-visible:ring-1 focus-visible:ring-white/[0.25] text-white placeholder:text-slate-500 text-sm"
                                                placeholder={placeholder}
                                                list={useList ? 'countries' : undefined}
                                                value={(profile as any)[key]}
                                                onChange={(e) => setProfile((prev) => ({ ...prev, [key]: e.target.value }))}
                                            />
                                        </div>
                                    ))}

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider">Property Ownership</label>
                                        <select
                                            className="w-full h-12 rounded-xl bg-slate-900/80 border border-white/[0.1] px-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/[0.25]"
                                            value={profile.ownsProperty}
                                            onChange={(e) => setProfile((prev) => ({ ...prev, ownsProperty: e.target.value }))}
                                        >
                                            <option className="bg-slate-900 text-white">No</option>
                                            <option className="bg-slate-900 text-white">Yes - Primary Residence</option>
                                            <option className="bg-slate-900 text-white">Yes - Multiple Properties</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider">Prior Visa Denials</label>
                                        <select
                                            className="w-full h-12 rounded-xl bg-slate-900/80 border border-white/[0.1] px-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/[0.25]"
                                            value={profile.previousDenials}
                                            onChange={(e) => setProfile((prev) => ({ ...prev, previousDenials: e.target.value }))}
                                        >
                                            <option className="bg-slate-900 text-white">None</option>
                                            <option className="bg-slate-900 text-white">1 past refusal</option>
                                            <option className="bg-slate-900 text-white">2 past refusals</option>
                                            <option className="bg-slate-900 text-white">3+ past refusals</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    className="w-full h-14 rounded-2xl text-base font-semibold btn-apple-primary disabled:opacity-45 disabled:pointer-events-none"
                                    disabled={!profile.nationality || !profile.destination || isAssessing}
                                    onClick={handleDenialAssessment}
                                >
                                    {isAssessing ? (
                                        <span className="inline-flex items-center gap-2 font-mono text-sm">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Calculating Profile Risk…
                                        </span>
                                    ) : (
                                        'Calculate Risk Index →'
                                    )}
                                </button>

                                <AnimatePresence>
                                    {denialResult && (
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-8 border-t border-white/[0.08] space-y-6">
                                            <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-950/60 p-6 rounded-2xl border border-white/[0.08]">
                                                <div className="relative">
                                                    <svg className="w-32 h-32 transform -rotate-90">
                                                        <circle cx="64" cy="64" r="54" className="stroke-white/[0.08]" strokeWidth="6" fill="transparent" />
                                                        <motion.circle
                                                            cx="64"
                                                            cy="64"
                                                            r="54"
                                                            stroke="#f8fafc"
                                                            strokeWidth="6"
                                                            strokeDasharray={340}
                                                            strokeDashoffset={340 - (340 * (parseInt(denialResult.riskScore) || 50)) / 100}
                                                            fill="transparent"
                                                            initial={{ strokeDashoffset: 340 }}
                                                            animate={{ strokeDashoffset: 340 - (340 * (parseInt(denialResult.riskScore) || 50)) / 100 }}
                                                            transition={{ duration: 1.1, ease: 'easeOut' }}
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-3xl font-serif font-bold text-white">{denialResult.riskScore}%</span>
                                                        <span className="text-[9px] font-mono text-slate-400 uppercase">Risk Score</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 text-center md:text-left">
                                                    <h3 className="text-xl font-serif font-bold text-white mb-1.5">Assessment: {denialResult.riskLevel}</h3>
                                                    <p className="text-slate-300/85 text-sm leading-relaxed mb-3">{denialResult.summary}</p>
                                                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                                        {denialResult.strengths?.map((s: string, i: number) => (
                                                            <span key={i} className="text-xs font-mono px-3 py-1 rounded-full border border-emerald-400/20 text-emerald-200 bg-emerald-950/30">
                                                                ✓ {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="font-mono text-xs text-slate-300 uppercase tracking-wider mb-3">Key Vulnerabilities &amp; Mitigation</h4>
                                                <div className="space-y-3">
                                                    {denialResult.topRiskFactors?.map((rf: any, i: number) => (
                                                        <div key={i} className="flex flex-col md:flex-row gap-3 p-4 rounded-2xl bg-slate-950/60 border border-white/[0.08]">
                                                            <div className="w-20 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/[0.08] pb-2 md:pb-0 md:pr-3 shrink-0">
                                                                <AlertCircle className="w-5 h-5 mb-1 text-amber-300" />
                                                                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">{rf.severity}</span>
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="font-semibold text-white mb-1 text-sm">{rf.factor}</div>
                                                                <p className="text-xs text-slate-300/85 leading-relaxed">
                                                                    <span className="font-mono uppercase text-[10px] text-sky-300 mr-1.5">Mitigation:</span>
                                                                    {rf.advice}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}

                    {/* ===== TAB: PASSPORT POWER ===== */}
                    {activeTab === 'passport' && (
                        <motion.div key="passport" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}>
                            <div className="apple-glass-card rounded-[32px] p-6 md:p-10 space-y-10">
                                <div className="text-center max-w-xl mx-auto">
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.05] border border-white/[0.12] flex items-center justify-center shadow-lg">
                                        <Fingerprint className="w-7 h-7 text-sky-300" />
                                    </div>
                                    <h2 className="text-3xl font-serif font-bold text-white mb-2">Passport Mobility Index</h2>
                                    <p className="text-slate-300/80 text-sm leading-relaxed mb-6">
                                        Inspect global passport rank, visa-free destination count, and top visa-free corridors.
                                    </p>

                                    <div className="flex max-w-md mx-auto items-center gap-2">
                                        <Input
                                            className="h-13 rounded-2xl bg-slate-950/70 border-white/[0.1] focus-visible:ring-1 focus-visible:ring-white/[0.25] text-base text-white placeholder:text-slate-500 px-4"
                                            placeholder="e.g. Singapore, Germany, United States"
                                            value={passportCountry}
                                            onChange={(e) => setPassportCountry(e.target.value)}
                                            list="countries"
                                        />
                                        <button
                                            className="h-13 px-6 rounded-2xl btn-apple-primary font-semibold text-sm shrink-0 disabled:opacity-45"
                                            onClick={() => handlePassportLookup()}
                                            disabled={!passportCountry || isLoadingPassport}
                                        >
                                            {isLoadingPassport ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Inspect →'}
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                                        {['Singapore', 'Japan', 'Germany', 'United States', 'United Kingdom', 'Brazil'].map((country) => (
                                            <button
                                                key={country}
                                                type="button"
                                                onClick={() => handlePassportLookup(country)}
                                                className="apple-glass-pill px-3 py-1 rounded-full text-xs text-slate-300 hover:text-white transition-all"
                                            >
                                                {country}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {passportData && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center pt-6 border-t border-white/[0.08]"
                                        >
                                            {/* Minimal 3D Passport Card */}
                                            <div className="w-full max-w-[300px]">
                                                <div className="w-full aspect-[1/1.42] rounded-3xl border border-white/[0.16] bg-gradient-to-b from-slate-900 to-slate-950 p-6 flex flex-col shadow-2xl relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-36 h-36 bg-sky-400/[0.08] rounded-full blur-2xl pointer-events-none" />
                                                    <div className="w-10 h-8 rounded-md border border-amber-300/30 bg-amber-400/10 flex flex-wrap p-1 mb-6">
                                                        {[...Array(6)].map((_, i) => (
                                                            <div key={i} className="w-1/3 h-1/2 border border-amber-300/20" />
                                                        ))}
                                                    </div>

                                                    <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase mb-1">Passport Mobility</div>
                                                    <div className="text-2xl font-serif font-bold text-white uppercase tracking-wide mb-6">{passportCountry}</div>

                                                    <div className="mt-auto space-y-4">
                                                        <div className="border-l-2 border-white pl-3">
                                                            <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Global Rank</div>
                                                            <div className="text-3xl font-serif font-bold text-white">#{passportData.passportRank}</div>
                                                        </div>
                                                        <div className="flex justify-between border-t border-white/[0.1] pt-3">
                                                            <div>
                                                                <div className="text-[9px] text-slate-400 font-mono tracking-wider uppercase">Mobility</div>
                                                                <div className="text-lg font-mono font-semibold text-slate-200">{passportData.mobilityScore}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[9px] text-slate-400 font-mono tracking-wider uppercase">Visa-Free</div>
                                                                <div className="text-lg font-mono font-semibold text-emerald-300">{passportData.visaFreeCount}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Destinations Breakdown */}
                                            <div className="flex-1 space-y-6 max-w-2xl w-full">
                                                {passportData.tip && (
                                                    <div className="p-4 rounded-2xl border border-white/[0.1] bg-slate-950/60 text-xs text-slate-200 leading-relaxed border-l-2 border-l-sky-400">
                                                        {passportData.tip}
                                                    </div>
                                                )}

                                                <div>
                                                    <h4 className="font-mono text-xs uppercase tracking-wider text-slate-300 mb-3">Popular Visa-Free Corridors</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        {passportData.topDestinations?.map((dest: any, i: number) => (
                                                            <Link
                                                                key={i}
                                                                href={`/plan-trip?destination=${encodeURIComponent(dest.country)}`}
                                                                className="px-4 py-3 rounded-2xl border border-white/[0.08] bg-slate-950/60 hover:border-white/[0.2] flex justify-between items-center transition-all group"
                                                            >
                                                                <span className="text-xs font-medium text-white group-hover:text-sky-200 transition-colors">{dest.country}</span>
                                                                <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-400/20 text-emerald-300">
                                                                    {dest.entryType}
                                                                </span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-white/[0.08]">
                                                    <h4 className="font-mono text-xs uppercase tracking-wider text-slate-400 mb-3">Prior Consular Visa Required</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {passportData.challengingDestinations?.map((c: string, i: number) => (
                                                            <span key={i} className="text-[11px] font-mono px-3 py-1 rounded-full border border-white/[0.08] text-slate-300 bg-slate-950/50">
                                                                {c}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}

                    {/* ===== TAB: POLICY DECODER ===== */}
                    {activeTab === 'simplifier' && (
                        <motion.div key="simplifier" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}>
                            <div className="apple-glass-card rounded-[32px] overflow-hidden">
                                <div className="flex flex-col md:flex-row min-h-[540px]">
                                    {/* Input Pane */}
                                    <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col">
                                        <div className="flex items-start justify-between gap-3 mb-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.12] flex items-center justify-center">
                                                    <ScanFace className="w-5 h-5 text-sky-300" />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-serif font-bold text-white">Embassy Policy Decoder</h2>
                                                    <p className="text-xs text-slate-400">Turn dense immigration text into a clear checklist</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setRawText(SAMPLE_EMBASSY_TEXT)}
                                                className="apple-glass-pill px-3 py-1.5 rounded-full text-[11px] text-slate-200 hover:text-white inline-flex items-center gap-1.5 shrink-0"
                                            >
                                                <Sparkles className="w-3 h-3 text-sky-300" /> Load Sample
                                            </button>
                                        </div>

                                        <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/[0.1] bg-slate-950/60 p-4">
                                            <Textarea
                                                className="w-full h-full min-h-[220px] border-0 bg-transparent focus-visible:ring-0 text-sm text-slate-200 leading-relaxed resize-none placeholder:text-slate-500"
                                                placeholder="Paste complex embassy or immigration rules here to translate them into plain-English traveler steps..."
                                                value={rawText}
                                                onChange={(e) => setRawText(e.target.value)}
                                            />
                                        </div>

                                        <button
                                            className="w-full h-13 mt-5 rounded-2xl text-sm font-semibold btn-apple-primary disabled:opacity-45 disabled:pointer-events-none"
                                            disabled={!rawText.trim() || isSimplifying}
                                            onClick={handleSimplify}
                                        >
                                            {isSimplifying ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Decoding Requirements…
                                                </span>
                                            ) : (
                                                'Decode into Plain English →'
                                            )}
                                        </button>
                                    </div>

                                    {/* Output Pane */}
                                    <div className="flex-1 p-6 md:p-8 bg-slate-950/45 flex flex-col">
                                        <div className="text-[11px] font-mono tracking-wider text-slate-400 uppercase mb-6 border-b border-white/[0.08] pb-3">
                                            Plain-English Action Plan
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {!simplifiedInfo && !isSimplifying && (
                                                <div className="flex-1 flex flex-col justify-center items-center text-slate-400 text-xs text-center py-12">
                                                    <BookOpen className="w-10 h-10 mb-3 opacity-40" />
                                                    Paste official embassy text on the left (or tap &ldquo;Load Sample&rdquo;) to generate an actionable checklist.
                                                </div>
                                            )}

                                            {isSimplifying && (
                                                <div className="flex-1 flex flex-col justify-center items-center text-slate-300 text-xs py-12 font-mono">
                                                    <Loader2 className="w-8 h-8 mb-3 animate-spin text-sky-300" />
                                                    Analyzing clauses, validity rules, and financial thresholds…
                                                </div>
                                            )}

                                            {simplifiedInfo && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto space-y-6">
                                                    <div>
                                                        <div className="inline-block px-2.5 py-1 bg-white/[0.05] rounded-full text-[10px] font-mono uppercase tracking-wider text-slate-300 mb-2 border border-white/[0.1]">
                                                            Summary
                                                        </div>
                                                        <h3 className="text-xl font-serif font-bold text-white mb-1.5">{simplifiedInfo.status}</h3>
                                                        <p className="text-slate-300/85 text-sm leading-relaxed">{simplifiedInfo.description}</p>
                                                    </div>

                                                    {simplifiedInfo.requirements?.length > 0 && (
                                                        <div>
                                                            <div className="inline-block px-2.5 py-1 bg-white/[0.05] rounded-full text-[10px] font-mono uppercase tracking-wider text-slate-300 mb-3 border border-white/[0.1]">
                                                                Actionable Checklist
                                                            </div>
                                                            <div className="space-y-3">
                                                                {simplifiedInfo.requirements.map((req: any, i: number) => {
                                                                    const wc = WEIGHT_CONFIG[req.weight] || WEIGHT_CONFIG.recommended;
                                                                    return (
                                                                        <div key={i} className="flex gap-3.5 p-4 rounded-2xl border border-white/[0.08] bg-slate-900/60">
                                                                            <div className={`w-7 h-7 shrink-0 rounded-xl flex items-center justify-center font-semibold font-mono text-xs ${wc.bg} ${wc.color} border ${wc.border}`}>
                                                                                {i + 1}
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-semibold text-white text-xs mb-1">
                                                                                    {req.title}
                                                                                    <span className={`ml-2 text-[9px] font-mono tracking-wider ${wc.color}`}>{wc.label}</span>
                                                                                </div>
                                                                                <p className="text-xs text-slate-300/80 leading-relaxed">{req.desc}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function VisaHubPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
                </div>
            }
        >
            <VisaHubContent />
        </Suspense>
    );
}
