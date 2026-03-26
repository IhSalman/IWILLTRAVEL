'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Globe2, FileCheck, CheckCircle2, ChevronRight,
    Loader2, Plane, ShieldAlert, BookOpen,
    TrendingUp, ExternalLink, AlertTriangle, Star, Activity, 
    ScanFace, Navigation, Fingerprint, AlertCircle
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

const WEIGHT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    critical: { label: 'CRITICAL', color: 'text-[#FF0040]', bg: 'bg-[#FF0040]/10', border: 'border-[#FF0040]/30' },
    important: { label: 'IMPORTANT', color: 'text-[#FF8C00]', bg: 'bg-[#FF8C00]/10', border: 'border-[#FF8C00]/30' },
    recommended: { label: 'OPTIONAL', color: 'text-[#00FFB3]', bg: 'bg-[#00FFB3]/10', border: 'border-[#00FFB3]/30' },
};

const STATUS_COLOR: Record<string, string> = {
    green: 'from-[#00FFB3]/20 via-[#00FFB3]/5 to-transparent border-[#00FFB3]/30 text-[#00FFB3]',
    blue: 'from-[#00D4FF]/20 via-[#00D4FF]/5 to-transparent border-[#00D4FF]/30 text-[#00D4FF]',
    yellow: 'from-[#FFD700]/20 via-[#FFD700]/5 to-transparent border-[#FFD700]/30 text-[#FFD700]',
    orange: 'from-[#FF8C00]/20 via-[#FF8C00]/5 to-transparent border-[#FF8C00]/30 text-[#FF8C00]',
    red: 'from-[#FF0040]/20 via-[#FF0040]/5 to-transparent border-[#FF0040]/30 text-[#FF0040]',
};

type Tab = 'checker' | 'denial' | 'passport' | 'simplifier';

const GlobalGrid = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep space background */}
        <div className="absolute inset-0 bg-[#02050A]" />
        
        {/* Animated Cyber Grid */}
        <motion.div
            className="absolute inset-0 bg-[linear-gradient(to_right,#00D4FF15_1px,transparent_1px),linear-gradient(to_bottom,#00D4FF15_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]"
            animate={{
                backgroundPosition: ['0px 0px', '40px 40px'],
            }}
            transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
            }}
        />

        {/* Floating Accent Orbs */}
        <motion.div
            className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-[#00D4FF]/10 rounded-full blur-[120px] mix-blend-screen"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
            className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#FF007F]/10 rounded-full blur-[100px] mix-blend-screen"
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
            className="absolute top-[40%] left-[50%] w-[500px] h-[500px] bg-[#00FFB3]/5 rounded-full blur-[100px] mix-blend-screen translate-x-[-50%] translate-y-[-50%]"
            animate={{ rotate: 360, scale: [0.8, 1, 0.8] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
    </div>
);

const RadarScan = () => (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
        {/* Outer Tech Ring */}
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-[#00D4FF]/30"
        />
        
        {/* Radar Background */}
        <div className="absolute inset-4 rounded-full border border-[#00D4FF]/20 bg-[#00D4FF]/5 overflow-hidden">
            {/* Sweeping Radar Beam */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-1/2 h-[50%] absolute top-0 right-1/2 origin-bottom-right"
                style={{
                    background: 'conic-gradient(from 90deg, transparent 0deg, #00D4FF40 90deg)'
                }}
            />
        </div>
        
        {/* Inner Rings */}
        <div className="absolute inset-16 rounded-full border border-[#00D4FF]/20" />
        <div className="absolute inset-24 rounded-full border border-[#00D4FF]/30 bg-[#02050A]" />
        
        {/* Center Icon */}
        <Globe2 className="w-12 h-12 text-[#00D4FF] relative z-10 animate-pulse" />
        
        {/* Pulsing Dots */}
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-[#00FFB3]"
                style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: `${20 + Math.random() * 60}%`,
                }}
                animate={{ scale: [1, 2, 1], opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
            />
        ))}
    </div>
);


export default function VisaHubPage() {
    const [activeTab, setActiveTab] = useState<Tab>('checker');

    // --- Visa Checker State ---
    const [source, setSource] = useState('');
    const [destination, setDestination] = useState('');
    const [step, setStep] = useState(1);
    const [showResults, setShowResults] = useState(false);
    const [visaInfo, setVisaInfo] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

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

    const handleSearch = async () => {
        if (!source || !destination) return;
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
            const data = await res.json();
            if (res.ok) setVisaInfo(data);
            else console.error('API Error:', data.error);
        } catch (e) { console.error(e); }
        finally { setIsAnalyzing(false); }
    };

    const handleDenialAssessment = async () => {
        setIsAssessing(true);
        setDenialResult(null);
        try {
            const res = await fetch('/api/visa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'denial_risk', profile }),
            });
            const data = await res.json();
            if (res.ok) setDenialResult(data);
        } catch (e) { console.error(e); }
        finally { setIsAssessing(false); }
    };

    const handlePassportLookup = async () => {
        if (!passportCountry) return;
        setIsLoadingPassport(true);
        setPassportData(null);
        try {
            const res = await fetch('/api/visa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'passport_power', source: passportCountry }),
            });
            const data = await res.json();
            if (res.ok) setPassportData(data);
        } catch (e) { console.error(e); }
        finally { setIsLoadingPassport(false); }
    };

    const handleSimplify = async () => {
        if (!rawText.trim()) return;
        setIsSimplifying(true);
        setSimplifiedInfo(null);
        try {
            const res = await fetch('/api/visa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawText }),
            });
            const data = await res.json();
            if (res.ok) setSimplifiedInfo(data);
        } catch (e) { console.error(e); }
        finally { setIsSimplifying(false); }
    };

    const tabs: { id: Tab; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
        { id: 'checker', label: 'Global Access', icon: <Globe2 className="w-5 h-5" />, desc: 'Route Clearance', color: '#00D4FF' },
        { id: 'denial', label: 'Threat Oracle', icon: <ShieldAlert className="w-5 h-5" />, desc: 'Denial Probability', color: '#FF0040' },
        { id: 'passport', label: 'ID Nexus', icon: <Fingerprint className="w-5 h-5" />, desc: 'Passport Rank', color: '#00FFB3' },
        { id: 'simplifier', label: 'Cyber Text', icon: <ScanFace className="w-5 h-5" />, desc: 'Decode Law', color: '#FF8C00' },
    ];

    return (
        <div className="relative min-h-screen pt-24 pb-12 font-sans text-white/90 selection:bg-[#00D4FF]/30 z-10">
            <GlobalGrid />

            <div className="container max-w-6xl relative z-10 px-4 md:px-8">
                {/* HUD Header */}
                <div className="mb-12 border-b border-white/10 pb-8 relative">
                    <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                        <div className="text-[10px] font-mono tracking-[0.3em] text-[#00D4FF] text-right mb-1">SYSTEM ONLINE</div>
                        <div className="w-24 h-px bg-gradient-to-r from-transparent to-[#00D4FF]" />
                    </div>
                    
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6"
                    >
                        <div className="w-2 h-2 rounded-full bg-[#00FFB3] animate-pulse shadow-[0_0_10px_#00FFB3]" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Immigration Core v2.0</span>
                    </motion.div>
                    
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-[#00D4FF]/50 [text-shadow:0_0_80px_rgba(0,212,255,0.3)]">
                        VISA <span className="font-light">NEXUS</span>
                    </h1>
                    <p className="text-lg text-white/40 max-w-2xl font-light tracking-wide">
                        Initialize global border protocols. Analyze entry clearance, predict denial vectors, and synchronize passport credentials instantly.
                    </p>
                </div>

                {/* Cyber Tabs Navigation */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`group relative flex flex-col items-start gap-3 p-5 rounded-xl border transition-all duration-500 overflow-hidden ${
                                activeTab === t.id
                                ? `bg-white/10 border-[${t.color}]/50 shadow-[0_0_30px_${t.color}20]`
                                : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                            }`}
                        >
                            <div 
                                className="absolute inset-x-0 bottom-0 h-1 transition-all duration-500"
                                style={{
                                    background: activeTab === t.id ? t.color : 'transparent',
                                    boxShadow: activeTab === t.id ? `0 0 20px ${t.color}` : 'none'
                                }}
                            />
                            <div 
                                className={`p-2.5 rounded-lg transition-colors border border-white/5 ${
                                    activeTab === t.id ? 'bg-white/10 text-white shadow-inner' : 'bg-black/50 text-white/50 group-hover:text-white'
                                }`}
                                style={{
                                    color: activeTab === t.id ? t.color : undefined,
                                    textShadow: activeTab === t.id ? `0 0 10px ${t.color}` : 'none'
                                }}
                            >
                                {t.icon}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm tracking-widest uppercase mb-1 text-white/90">{t.label}</div>
                                <div className="text-[10px] font-mono tracking-wider text-white/40">{t.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">

                    {/* ===== TAB: GLOBAL ACCESS (VISA CHECKER) ===== */}
                    {activeTab === 'checker' && (
                        <motion.div key="checker" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-white/10 bg-white/5 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl relative">
                                    {/* Tech Borders */}
                                    <div className="absolute top-0 left-0 w-16 h-16 border-t font-mono border-l border-[#00D4FF]/50 rounded-tl-3xl z-10" />
                                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b border-r border-[#00D4FF]/50 rounded-br-3xl z-10" />

                                    <CardContent className="p-8 relative z-20">
                                        <AnimatePresence mode="wait">
                                            {!showResults ? (
                                                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
                                                    
                                                    <div className="text-center mb-8">
                                                        <h3 className="text-2xl font-black uppercase tracking-[0.2em] mb-2 text-white">Initialize Corridor</h3>
                                                        <p className="text-white/40 text-sm font-mono">Input departure and arrival nodes</p>
                                                    </div>

                                                    <div className="space-y-6 relative">
                                                        {/* Connecting Line */}
                                                        <div className="absolute left-[39px] top-14 bottom-14 w-px bg-gradient-to-b from-[#00D4FF]/50 via-[#FF007F]/50 to-[#00D4FF]/50 hidden md:block" />

                                                        <div className="flex flex-col md:flex-row gap-6 relative z-10 items-end">
                                                            <div className="flex-1 space-y-3 w-full">
                                                                <label className="text-[10px] font-bold text-[#00D4FF] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" /> Origin Node
                                                                </label>
                                                                <div className="relative">
                                                                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                                                                    <Input placeholder="e.g. United Kingdom" className="h-[60px] pl-12 text-lg font-medium border-white/10 bg-black/40 focus-visible:ring-[#00D4FF] focus-visible:border-[#00D4FF]/50 rounded-xl text-white placeholder:text-white/20 transition-all" value={source} onChange={(e) => setSource(e.target.value)} list="countries" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col md:flex-row gap-6 relative z-10 items-end mt-4">
                                                            <div className="flex-1 space-y-3 w-full">
                                                                <label className="text-[10px] font-bold text-[#FF007F] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF007F]" /> Target Node
                                                                </label>
                                                                <div className="relative">
                                                                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 rotate-180" />
                                                                    <Input placeholder="e.g. Japan" className="h-[60px] pl-12 text-lg font-medium border-white/10 bg-black/40 focus-visible:ring-[#FF007F] focus-visible:border-[#FF007F]/50 rounded-xl text-white placeholder:text-white/20 transition-all" value={destination} onChange={(e) => setDestination(e.target.value)} list="countries" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <datalist id="countries">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>
                                                    
                                                    <Button 
                                                        className="w-full h-[70px] mt-8 rounded-xl text-lg font-black uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-[#00D4FF]/20 hover:border-[#00D4FF]/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] text-white transition-all duration-500 overflow-hidden relative group" 
                                                        disabled={!source || !destination} 
                                                        onClick={handleSearch}
                                                    >
                                                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                                                        Execute Scan Scan
                                                    </Button>
                                                </motion.div>
                                            ) : isAnalyzing ? (
                                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 text-center space-y-8">
                                                    <RadarScan />
                                                    <div className="space-y-2">
                                                        <h3 className="text-xl font-mono uppercase tracking-[0.3em] text-[#00D4FF]">Uplinking to Border DB</h3>
                                                        <p className="text-white/40 text-sm font-mono max-w-md mx-auto">Intercepting clearance protocols for vector <span className="text-white">[{source}]</span> to <span className="text-white">[{destination}]</span>...</p>
                                                    </div>
                                                </motion.div>
                                            ) : visaInfo ? (
                                                <motion.div key="results" initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} className="space-y-8">

                                                    {/* Terminal Header */}
                                                    <div className="flex flex-col md:flex-row items-start justify-between border-b border-white/10 pb-6 gap-4">
                                                        <div className="flex items-center gap-4 text-2xl font-black uppercase tracking-widest">
                                                            <span className="text-[#00D4FF] drop-shadow-[0_0_10px_rgba(0,212,255,0.5)]">{source}</span>
                                                            <ChevronRight className="w-6 h-6 text-white/20" />
                                                            <span className="text-[#FF007F] drop-shadow-[0_0_10px_rgba(255,0,127,0.5)]">{destination}</span>
                                                        </div>
                                                        <Button variant="outline" className="rounded-xl border-white/10 bg-black/40 hover:bg-white/10 hover:text-white font-mono text-[10px] uppercase tracking-widest px-6" onClick={() => { setShowResults(false); setVisaInfo(null); setStep(1); }}>
                                                            Reset Vector
                                                        </Button>
                                                    </div>

                                                    {/* Alerts */}
                                                    {visaInfo.warningsAndAlerts?.length > 0 && (
                                                        <div className="space-y-2">
                                                            {visaInfo.warningsAndAlerts.map((w: string, i: number) => (
                                                                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[#FF8C00]/10 border border-[#FF8C00]/30 text-[#FF8C00]">
                                                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                                                    <span className="text-sm font-medium font-mono">{w}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Status Banner */}
                                                    <div className={`relative overflow-hidden bg-gradient-to-br ${STATUS_COLOR[visaInfo.statusColor] || STATUS_COLOR.orange} rounded-2xl p-8 border backdrop-blur-md`}>
                                                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none mix-blend-overlay">
                                                            <div className="w-48 h-48 border-[20px] border-current rounded-full" />
                                                        </div>
                                                        <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                                            <div className="w-20 h-20 rounded-2xl bg-black/40 backdrop-blur-xl flex items-center justify-center shrink-0 border border-current/20 shadow-inner">
                                                                <ScanFace className="w-10 h-10" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-60 mb-2">Clearance Status</div>
                                                                <h3 className="text-3xl font-black mb-3 tracking-tighter uppercase">{visaInfo.status}</h3>
                                                                <p className="text-white/70 leading-relaxed text-sm max-w-2xl">{visaInfo.description}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Quick Facts Grid */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {[
                                                            { label: 'Time', value: visaInfo.processingTime },
                                                            { label: 'Cost', value: visaInfo.estimatedCost },
                                                            { label: 'Stay', value: visaInfo.maxStay },
                                                            { label: 'Risk', value: visaInfo.denialRate },
                                                        ].map((fact, i) => (
                                                            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
                                                                <div className="text-[10px] uppercase font-mono tracking-widest text-[#00D4FF] mb-2">{fact.label}</div>
                                                                <div className="font-bold text-lg text-white font-mono">{fact.value || '--'}</div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Requirements */}
                                                    <div>
                                                        <h3 className="text-lg font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-4 flex justify-between items-center">
                                                            Required Artifacts
                                                            <Badge variant="outline" className="border-[#00D4FF]/30 text-[#00D4FF] bg-[#00D4FF]/10 rounded-md font-mono">{visaInfo.requirements?.length || 0} items</Badge>
                                                        </h3>
                                                        <div className="grid sm:grid-cols-2 gap-4">
                                                            {visaInfo.requirements?.map((req: any, i: number) => {
                                                                const wc = WEIGHT_CONFIG[req.weight] || WEIGHT_CONFIG.recommended;
                                                                return (
                                                                    <div key={i} className={`flex flex-col p-5 rounded-xl border ${wc.border} bg-black/40 backdrop-blur-md`}>
                                                                        <div className="flex items-start justify-between mb-3">
                                                                            <h4 className="font-bold text-white text-sm leading-tight uppercase font-mono">{req.title}</h4>
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm ${wc.bg} ${wc.color} shrink-0 ml-2 border ${wc.border}`}>{wc.label}</span>
                                                                        </div>
                                                                        <p className="text-xs text-white/50 leading-relaxed font-mono">{req.desc}</p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                </motion.div>
                                            ) : (
                                                <div className="py-20 text-center text-white/40 font-mono">
                                                    <div className="text-4xl mb-4">⚠</div>
                                                    <h3 className="text-lg font-bold mb-2 text-white">Data Not Found</h3>
                                                    <p className="mb-6 text-sm">Failed to retrieve clear vector for [{destination}].</p>
                                                    <Button variant="outline" className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10" onClick={() => { setShowResults(false); setStep(1); }}>Re-Initialize</Button>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Sidebar HUD */}
                            <div className="space-y-6">
                                <Card className="border-white/10 bg-black/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
                                    <div className="h-1 bg-[#00D4FF] w-full" />
                                    <CardContent className="p-6">
                                        <div className="text-[10px] font-mono tracking-widest text-[#00D4FF] mb-6 uppercase flex items-center gap-2">
                                            <Activity className="w-4 h-4" /> Sequence Log
                                        </div>
                                        <div className="space-y-4">
                                            {[
                                                'Verification Check',
                                                'Artifact Assembly',
                                                'Transmission',
                                                'Clearance Code',
                                            ].map((label, i) => (
                                                <div key={i} className={`flex items-center gap-4 ${step > i ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold border ${step > i ? 'bg-[#00D4FF]/20 border-[#00D4FF]/50 text-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.3)]' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                                        {step > i ? 'OK' : `0${i+1}`}
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-widest text-white/80">{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-[#FF0040]/30 bg-[#FF0040]/5 backdrop-blur-xl rounded-3xl overflow-hidden relative group">
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#FF0040] to-transparent translate-y-1 group-hover:translate-y-0 transition-transform" />
                                    <CardContent className="p-6">
                                        <ShieldAlert className="w-8 h-8 text-[#FF0040] mb-4" />
                                        <h3 className="font-black text-sm uppercase tracking-widest text-white mb-2">Denial Probability</h3>
                                        <p className="text-xs text-white/50 mb-6 font-mono leading-relaxed">System shows high rejection rates structurally. Bypass standard protocols and assess risk vector.</p>
                                        <Button variant="outline" className="w-full justify-between items-center border-[#FF0040]/50 text-[#FF0040] hover:bg-[#FF0040]/20 hover:text-white rounded-xl bg-black/50 font-mono text-xs uppercase" onClick={() => setActiveTab('denial')}>
                                            Run Threat Oracle <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>
                    )}

                    {/* ===== TAB: DENIAL RISK (THREAT ORACLE) ===== */}
                    {activeTab === 'denial' && (
                        <motion.div key="denial" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                            <Card className="border-[#FF0040]/20 bg-black/60 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(255,0,64,0.05)] overflow-hidden">
                                {/* Danger header strip */}
                                <div className="h-1.5 w-full bg-[repeating-linear-gradient(45deg,#FF0040_0,#FF0040_10px,transparent_10px,transparent_20px)] opacity-50" />
                                
                                <CardContent className="p-6 md:p-10 space-y-10">
                                    <div className="text-center max-w-2xl mx-auto">
                                        <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-white flex flex-col items-center gap-4 mb-4">
                                            <div className="w-16 h-16 rounded-full bg-[#FF0040]/10 border border-[#FF0040]/30 flex items-center justify-center animate-pulse shadow-[0_0_30px_#FF004030]">
                                                <ShieldAlert className="w-8 h-8 text-[#FF0040]" />
                                            </div>
                                            Threat Oracle
                                        </h2>
                                        <p className="text-white/40 text-sm font-mono leading-relaxed">Input subject parameters to calculate denial probability indices and extract mitigation vectors.</p>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-6 bg-white/5 p-8 rounded-3xl border border-white/10">
                                        {[
                                            { key: 'nationality', label: 'Origin ID', placeholder: 'e.g. Nigeria' },
                                            { key: 'destination', label: 'Target Vector', placeholder: 'e.g. United States' },
                                            { key: 'employment', label: 'Labor Status', placeholder: 'e.g. Software Engineer' },
                                            { key: 'income', label: 'Capital Query', placeholder: 'e.g. $2,500' },
                                            { key: 'travelHistory', label: 'Trace History', placeholder: 'e.g. UK, UAE' },
                                            { key: 'familyTies', label: 'Anchor Links', placeholder: 'e.g. Spouse' },
                                        ].map(({ key, label, placeholder }) => (
                                            <div key={key} className="space-y-2">
                                                <label className="text-[10px] font-mono text-[#FF0040] uppercase tracking-widest">{label}</label>
                                                <Input
                                                    className="h-14 rounded-xl bg-black/50 border-white/10 focus-visible:ring-[#FF0040] focus-visible:border-[#FF0040]/50 text-white placeholder:text-white/20 font-mono text-sm"
                                                    placeholder={placeholder}
                                                    value={(profile as any)[key]}
                                                    onChange={(e) => setProfile(prev => ({ ...prev, [key]: e.target.value }))}
                                                />
                                            </div>
                                        ))}
                                        
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-[#FF0040] uppercase tracking-widest">Asset Registry</label>
                                            <select
                                                className="w-full h-14 rounded-xl bg-black/50 border border-white/10 px-4 text-sm font-mono text-white focus:ring-[#FF0040] focus:border-[#FF0040]/50 outline-none"
                                                value={profile.ownsProperty}
                                                onChange={(e) => setProfile(prev => ({ ...prev, ownsProperty: e.target.value }))}
                                            >
                                                <option className="bg-black">No</option>
                                                <option className="bg-black">Yes - House</option>
                                                <option className="bg-black">Yes - Land/Property</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-mono text-[#FF0040] uppercase tracking-widest">Prior Denials</label>
                                            <select
                                                className="w-full h-14 rounded-xl bg-black/50 border border-white/10 px-4 text-sm font-mono text-white focus:ring-[#FF0040] focus:border-[#FF0040]/50 outline-none"
                                                value={profile.previousDenials}
                                                onChange={(e) => setProfile(prev => ({ ...prev, previousDenials: e.target.value }))}
                                            >
                                                <option className="bg-black">None</option>
                                                <option className="bg-black">1 denial</option>
                                                <option className="bg-black">2 denials</option>
                                                <option className="bg-black">3+ denials</option>
                                            </select>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-[70px] rounded-2xl text-lg font-black uppercase tracking-widest bg-gradient-to-r from-[#FF0040]/80 to-[#8B0000] hover:from-[#FF0040] hover:to-[#FF0040] text-white shadow-[0_0_30px_rgba(255,0,64,0.3)] transition-all"
                                        disabled={!profile.nationality || !profile.destination || isAssessing}
                                        onClick={handleDenialAssessment}
                                    >
                                        {isAssessing ? <span className="font-mono text-sm animate-pulse tracking-widest">RUNNING DIAGNOSTIC...</span> : 'Calculate Threat Metric'}
                                    </Button>

                                    <AnimatePresence>
                                        {denialResult && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-10 border-t border-white/10 space-y-8">
                                                {/* Risk Score */}
                                                {(() => {
                                                    const colorHex = denialResult.riskColor === 'red' ? '#FF0040' : (denialResult.riskColor === 'orange' ? '#FF8C00' : (denialResult.riskColor === 'yellow' ? '#FFD700' : '#00FFB3'));
                                                    return (
                                                        <div className="flex flex-col md:flex-row gap-8 items-center bg-white/5 p-8 rounded-3xl border border-white/10">
                                                            <div className="relative">
                                                                <svg className="w-40 h-40 transform -rotate-90">
                                                                    <circle cx="80" cy="80" r="70" className="stroke-white/10" strokeWidth="8" fill="transparent" />
                                                                    <motion.circle 
                                                                        cx="80" cy="80" r="70" 
                                                                        className="" 
                                                                        stroke={colorHex} 
                                                                        strokeWidth="8" 
                                                                        strokeDasharray={440}
                                                                        strokeDashoffset={440 - (440 * (parseInt(denialResult.riskScore) || 50)) / 100}
                                                                        fill="transparent" 
                                                                        initial={{ strokeDashoffset: 440 }}
                                                                        animate={{ strokeDashoffset: 440 - (440 * (parseInt(denialResult.riskScore) || 50)) / 100 }}
                                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                                    />
                                                                </svg>
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                    <span className="text-4xl font-black font-mono" style={{ color: colorHex }}>{denialResult.riskScore}</span>
                                                                    <span className="text-[8px] font-mono text-white/50 uppercase">Threat %</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex-1 text-center md:text-left">
                                                                <h3 className="text-2xl font-black uppercase tracking-widest mb-2" style={{ color: colorHex }}>Level: {denialResult.riskLevel}</h3>
                                                                <p className="text-white/60 font-mono text-sm leading-relaxed mb-4">{denialResult.summary}</p>
                                                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                                                    {denialResult.strengths?.map((s: string, i: number) => (
                                                                        <span key={i} className="text-[10px] uppercase font-mono px-3 py-1 rounded-sm border border-[#00FFB3]/30 text-[#00FFB3] bg-[#00FFB3]/10">✓ {s}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Risk Factors */}
                                                <div>
                                                    <h4 className="font-mono text-xs text-white/40 uppercase tracking-[0.2em] mb-4">Detected Vulnerabilities</h4>
                                                    <div className="space-y-3">
                                                        {denialResult.topRiskFactors?.map((rf: any, i: number) => (
                                                            <div key={i} className="flex flex-col md:flex-row gap-4 p-5 rounded-xl bg-black/40 border border-[#FF0040]/20 items-stretch">
                                                                <div className="w-16 flex flex-col items-center justify-center border-r border-white/10 pr-4 shrink-0">
                                                                    <AlertCircle className={`w-6 h-6 mb-1 ${rf.severity === 'high' ? 'text-[#FF0040]' : 'text-[#FF8C00]'}`} />
                                                                    <span className="text-[8px] uppercase tracking-widest text-white/40 font-mono">{rf.severity}</span>
                                                                </div>
                                                                <div className="flex-1 py-1">
                                                                    <div className="font-bold text-white mb-1 uppercase text-sm tracking-wider">{rf.factor}</div>
                                                                    <p className="text-xs font-mono text-white/50">Mitigation: <span className="text-white/80">{rf.advice}</span></p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* ===== TAB: PASSPORT POWER (ID NEXUS) ===== */}
                    {activeTab === 'passport' && (
                        <motion.div key="passport" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                            <Card className="border-white/10 bg-transparent shadow-none overflow-visible">
                                <CardContent className="p-0 space-y-12">
                                    
                                    <div className="text-center max-w-2xl mx-auto">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-[#00FFB3]/10 border border-[#00FFB3]/30 flex items-center justify-center mb-6 shadow-[0_0_30px_#00FFB330]">
                                            <Fingerprint className="w-8 h-8 text-[#00FFB3]" />
                                        </div>
                                        <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-white mb-4">
                                            ID Nexus
                                        </h2>
                                        <div className="flex max-w-md mx-auto items-center">
                                            <Input
                                                className="h-[60px] rounded-l-2xl rounded-r-none bg-black/40 border-white/10 focus-visible:ring-[#00FFB3] text-lg font-mono text-white placeholder:text-white/20 text-center uppercase"
                                                placeholder="Enter Origin ID (e.g. Germany)"
                                                value={passportCountry}
                                                onChange={(e) => setPassportCountry(e.target.value)}
                                                list="countries"
                                            />
                                            <Button 
                                                className="h-[60px] w-24 rounded-r-2xl rounded-l-none bg-[#00FFB3]/20 hover:bg-[#00FFB3]/40 border border-l-0 border-[#00FFB3]/50 text-[#00FFB3] transition-colors"
                                                onClick={handlePassportLookup}
                                                disabled={!passportCountry || isLoadingPassport}
                                            >
                                                {isLoadingPassport ? <Loader2 className="w-6 h-6 animate-spin" /> : 'IDENT'}
                                            </Button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {passportData && (
                                            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row gap-12 items-center lg:items-start justify-center">
                                                
                                                {/* Holographic Passport Card */}
                                                <div className="w-full max-w-[340px] perspective-[2000px]">
                                                    <motion.div
                                                        initial={{ rotateY: -30, rotateX: 10 }}
                                                        animate={{ rotateY: 0, rotateX: 0 }}
                                                        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                                                        className="w-full aspect-[1/1.5] rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-3xl shadow-[0_0_50px_rgba(0,255,179,0.15)] overflow-hidden relative group transform-style-3d hover:rotate-y-[15deg] transition-transform duration-700 ease-out"
                                                    >
                                                        {/* Holo overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-[#00FFB3]/20 via-transparent to-[#00D4FF]/20 mix-blend-screen opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                                                        
                                                        {/* Golden Chip */}
                                                        <div className="absolute top-8 left-6 w-12 h-10 rounded-md border border-[#FFD700]/50 bg-[#FFD700]/10 flex flex-wrap p-1">
                                                            {[...Array(6)].map((_, i) => <div key={i} className="w-1/3 h-1/2 border border-[#FFD700]/30" />)}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="absolute inset-0 p-6 pt-24 flex flex-col">
                                                            <div className="text-[8px] font-mono tracking-widest text-[#00FFB3] uppercase mb-1">Authenticated ID</div>
                                                            <div className="text-3xl font-black text-white uppercase tracking-wider leading-none mb-6">{passportCountry}</div>
                                                            
                                                            <div className="mt-auto space-y-4">
                                                                <div className="border-l-2 border-[#00FFB3] pl-3">
                                                                    <div className="text-[8px] text-white/50 font-mono tracking-widest uppercase mb-1">Global Passport Rank</div>
                                                                    <div className="text-3xl font-black text-white">#{passportData.passportRank}</div>
                                                                </div>
                                                                <div className="flex justify-between border-t border-white/10 pt-4">
                                                                    <div>
                                                                        <div className="text-[8px] text-white/50 font-mono tracking-widest uppercase mb-1">Mobility Score</div>
                                                                        <div className="text-xl font-bold text-white">{passportData.mobilityScore}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[8px] text-white/50 font-mono tracking-widest uppercase mb-1">Visa-Free Nodes</div>
                                                                        <div className="text-xl font-bold text-[#00FFB3]">{passportData.visaFreeCount}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Bottom barcode */}
                                                        <div className="absolute bottom-6 left-6 right-6 h-6 flex justify-between items-end opacity-30">
                                                            {[...Array(40)].map((_, i) => <div key={i} className="bg-white" style={{ width: Math.random() > 0.5 ? '2px' : '1px', height: `${50 + Math.random() * 50}%` }} />)}
                                                        </div>
                                                    </motion.div>
                                                </div>

                                                {/* Stats & Destinations */}
                                                <div className="flex-1 space-y-8 max-w-2xl w-full">
                                                    {passportData.tip && (
                                                        <div className="p-4 rounded-xl border border-white/10 bg-white/5 font-mono text-xs text-white/60 leading-relaxed border-l-2 border-l-[#00FFB3]">
                                                            {passportData.tip}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <h4 className="font-mono text-[10px] uppercase tracking-widest text-[#00D4FF] mb-4">Cleared Flight Vectors</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {passportData.topDestinations?.map((dest: any, i: number) => (
                                                                <div key={i} className="px-4 py-3 rounded-xl border border-white/10 bg-black/40 flex justify-between items-center group hover:border-[#00FFB3]/50 transition-colors">
                                                                    <span className="text-sm font-bold text-white/80 group-hover:text-white uppercase">{dest.country}</span>
                                                                    <span className={`text-[8px] font-mono tracking-widest px-2 py-1 rounded-sm ${dest.entryType === 'Visa-Free' ? 'bg-[#00FFB3]/10 text-[#00FFB3]' : 'bg-[#00D4FF]/10 text-[#00D4FF]'}`}>
                                                                        {dest.entryType}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="pt-6 border-t border-white/10">
                                                        <h4 className="font-mono text-[10px] uppercase tracking-widest text-[#FF0040] mb-4">Restricted Zones (Visa Required)</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {passportData.challengingDestinations?.map((c: string, i: number) => (
                                                                <span key={i} className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-md border border-[#FF0040]/30 text-[#FF0040] bg-[#FF0040]/5">
                                                                    {c}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* ===== TAB: AI TRANSLATOR (CYBER TEXT) ===== */}
                    {activeTab === 'simplifier' && (
                        <motion.div key="simplifier" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                            <Card className="border-[#FF8C00]/20 bg-black/60 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(255,140,0,0.05)] overflow-hidden">
                                <CardContent className="p-0 flex flex-col md:flex-row min-h-[600px]">
                                    
                                    {/* Input Pane */}
                                    <div className="flex-1 p-6 md:p-10 border-b md:border-b-0 md:border-r border-white/10 flex flex-col relative z-10">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-10 h-10 rounded-lg bg-[#FF8C00]/10 border border-[#FF8C00]/30 flex items-center justify-center">
                                                <ScanFace className="w-5 h-5 text-[#FF8C00]" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black uppercase tracking-widest text-white">Legal Decoder</h2>
                                                <p className="text-[10px] font-mono text-white/40 tracking-wider">Paste raw bureaucratic text</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 relative group rounded-2xl overflow-hidden border border-white/10 focus-within:border-[#FF8C00]/50 transition-colors bg-white/5">
                                            {/* decorative scanning line */}
                                            <div className="absolute top-0 left-0 right-0 h-px bg-[#FF8C00] opacity-0 group-focus-within:animate-scan" />
                                            
                                            <Textarea
                                                className="absolute inset-0 w-full h-full border-0 bg-transparent focus-visible:ring-0 text-sm font-mono text-white/70 leading-relaxed p-6 resize-none placeholder:text-white/20"
                                                placeholder=">>> INCOMING TRANSMISSION... INSERT LEGAL/OFFICIAL EMBASSY TEXT HERE FOR NEURAL TRANSLATION TO PLAIN ENGLISH."
                                                value={rawText}
                                                onChange={(e) => setRawText(e.target.value)}
                                            />
                                        </div>

                                        <Button
                                            className="w-full h-[60px] mt-6 rounded-xl text-sm font-black uppercase tracking-widest bg-[#FF8C00]/20 hover:bg-[#FF8C00]/40 border border-[#FF8C00]/50 text-[#FF8C00] transition-all"
                                            disabled={!rawText || isSimplifying}
                                            onClick={handleSimplify}
                                        >
                                            {isSimplifying ? <span className="animate-pulse">DECRYPTING...</span> : 'Execute Decryption'}
                                        </Button>
                                    </div>

                                    {/* Output Pane */}
                                    <div className="flex-1 p-6 md:p-10 relative bg-[#02050A]">
                                        {/* Matrix background subtle */}
                                        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden font-mono text-[8px] text-[#00FFB3] leading-none whitespace-pre-wrap break-all p-4">
                                            {Array.from({ length: 2000 }).map(() => String.fromCharCode(33 + Math.random() * 94)).join('')}
                                        </div>

                                        <div className="relative z-10 h-full flex flex-col">
                                            <div className="text-[10px] font-mono tracking-widest text-white/30 uppercase mb-8 border-b border-white/10 pb-4">
                                                Decrypted Output
                                            </div>

                                            <AnimatePresence mode="wait">
                                                {!simplifiedInfo && !isSimplifying && (
                                                    <motion.div key="empty" className="flex-1 flex flex-col justify-center items-center text-white/20 font-mono text-xs uppercase tracking-widest text-center">
                                                        <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                                                        Awaiting text input...
                                                    </motion.div>
                                                )}
                                                
                                                {isSimplifying && (
                                                    <motion.div key="parsing" className="flex-1 flex flex-col justify-center items-center text-[#FF8C00] font-mono text-xs uppercase tracking-widest">
                                                        <Loader2 className="w-12 h-12 mb-4 animate-spin" />
                                                        Processing Neural Translation...
                                                    </motion.div>
                                                )}

                                                {simplifiedInfo && (
                                                    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto pr-2 space-y-8 custom-scrollbar">
                                                        <div>
                                                            <div className="inline-block px-3 py-1 bg-white/10 rounded-sm text-[10px] font-mono uppercase tracking-widest text-white mb-3">
                                                                Summary
                                                            </div>
                                                            <h3 className="text-2xl font-black uppercase tracking-wider text-white mb-2">{simplifiedInfo.status}</h3>
                                                            <p className="text-white/60 font-mono text-sm leading-relaxed">{simplifiedInfo.description}</p>
                                                        </div>

                                                        {simplifiedInfo.requirements?.length > 0 && (
                                                            <div>
                                                                <div className="inline-block px-3 py-1 bg-[#00FFB3]/10 border border-[#00FFB3]/30 rounded-sm text-[10px] font-mono uppercase tracking-widest text-[#00FFB3] mb-4">
                                                                    Action Protocol
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {simplifiedInfo.requirements.map((req: any, i: number) => {
                                                                        const wc = WEIGHT_CONFIG[req.weight] || WEIGHT_CONFIG.recommended;
                                                                        return (
                                                                            <div key={i} className="flex gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                                                                                <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black font-mono text-sm ${wc.bg} ${wc.color} border ${wc.border}`}>
                                                                                    {i + 1}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="font-bold text-white uppercase text-sm mb-1">{req.title} <span className={`ml-2 text-[8px] tracking-widest ${wc.color}`}>{wc.label}</span></div>
                                                                                    <p className="text-xs text-white/50 font-mono leading-relaxed">{req.desc}</p>
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
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Tailwind util for scanning animation */}
            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(600px); opacity: 0; }
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
}
