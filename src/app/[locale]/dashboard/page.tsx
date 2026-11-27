'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/i18n/routing';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
    Map, Calendar, LogOut, User, Loader2, Languages, Copy,
    Globe2, LayoutDashboard, Compass, ChevronRight, PlaneTakeoff,
    History, Plus, ShieldCheck, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { MyFlightsTab } from '@/components/dashboard/MyFlightsTab';

export default function DashboardPage() {
    const supabase = createClient();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('overview');

    // Deep links such as /dashboard?tab=flights (used by the live map's "Track this flight").
    useEffect(() => {
        const tab = new URLSearchParams(window.location.search).get('tab');
        if (tab && ['overview', 'itineraries', 'flights', 'translations', 'profile'].includes(tab)) setActiveTab(tab);
    }, []);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [profile, setProfile] = useState<any>(null);
    const [itineraries, setItineraries] = useState<any[]>([]);
    const [translations, setTranslations] = useState<any[]>([]);

    // Controlled Account Settings form
    const [fullNameInput, setFullNameInput] = useState('');
    const [usernameInput, setUsernameInput] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                setUserId(user.id);
                setUserEmail(user.email || '');

                const [{ data: profileData }, { data: itinerariesData }, { data: translationsData }] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
                    supabase.from('itineraries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('translation_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                ]);

                const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveler';
                const resolvedProfile = profileData || {
                    full_name: fallbackName,
                    username: `@${(user.email?.split('@')[0] || 'voyager').replace(/[^a-zA-Z0-9_]/g, '')}`,
                };

                setProfile(resolvedProfile);
                setFullNameInput(resolvedProfile.full_name || '');
                setUsernameInput(resolvedProfile.username || '');
                setItineraries(itinerariesData || []);
                setTranslations(translationsData || []);
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [supabase, router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success('Signed out safely');
        router.push('/');
    };

    const handleSaveProfile = async () => {
        if (!userId) return;
        setIsSavingProfile(true);
        try {
            const cleanName = fullNameInput.trim() || 'Traveler';
            const cleanUsername = usernameInput.trim() || '@voyager';

            await supabase.auth.updateUser({
                data: { full_name: cleanName },
            });

            const { error } = await supabase.from('profiles').upsert(
                {
                    id: userId,
                    full_name: cleanName,
                    username: cleanUsername,
                },
                { onConflict: 'id' }
            );

            setProfile((prev: any) => ({ ...prev, full_name: cleanName, username: cleanUsername }));
            if (error) {
                toast.success('Display name updated for your account');
            } else {
                toast.success('Traveler profile saved');
            }
        } catch {
            toast.error('Could not save profile changes right now.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Compute accurate total planned days across itineraries
    const totalPlannedDays = useMemo(() => {
        return itineraries.reduce((acc, it) => {
            const rawContent = it.content || it.itinerary_data || it.days;
            if (Array.isArray(rawContent)) return acc + rawContent.length;
            if (rawContent && Array.isArray(rawContent.days)) return acc + rawContent.days.length;
            if (typeof it.days_count === 'number') return acc + it.days_count;
            if (it.start_date && it.end_date) {
                const diff = Math.max(
                    1,
                    Math.round((new Date(it.end_date).getTime() - new Date(it.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
                );
                return acc + diff;
            }
            return acc + 1;
        }, 0);
    }, [itineraries]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b0c0f]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-7 h-7 text-slate-500 animate-spin" />
                    <span className="text-sm text-slate-500">Loading your trips…</span>
                </div>
            </div>
        );
    }

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const navItems = [
        { id: 'overview', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Overview' },
        { id: 'itineraries', icon: <Compass className="w-4 h-4" />, label: `My Trips (${itineraries.length})` },
        { id: 'flights', icon: <PlaneTakeoff className="w-4 h-4" />, label: 'My flights' },
        { id: 'translations', icon: <Languages className="w-4 h-4" />, label: `Phrases (${translations.length})` },
        { id: 'profile', icon: <User className="w-4 h-4" />, label: 'Account' },
    ];

    const upcomingTrips = itineraries.filter((it) => !it.start_date || new Date(it.start_date) >= new Date());
    const latestTrip = itineraries[0];

    return (
        <div className="min-h-screen bg-background text-slate-200 font-body relative overflow-x-clip">
            {/* Ambient Lighting */}
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-sunrise-300/[0.05] blur-[120px] pointer-events-none" />

            <div className="relative max-w-[1280px] mx-auto pt-10 md:pt-14 pb-20 px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
                {/* Sidebar */}
                <aside className="space-y-5">
                    {/* User Profile Card */}
                    <div className="apple-glass-card p-4 rounded-2xl flex items-center gap-3.5">
                        <Avatar className="w-11 h-11 border border-white/15 shadow-inner">
                            <AvatarImage src={profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-slate-800 text-white font-semibold text-sm">
                                {(profile?.full_name?.charAt(0) || 'T').toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                            <h2 className="text-sm font-semibold truncate text-white">{profile?.full_name}</h2>
                            <p className="text-xs text-slate-500 truncate">{profile?.username || userEmail}</p>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <nav className="apple-liquid-glass p-1.5 rounded-2xl space-y-1">
                        {navItems.map((item) => {
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-colors duration-200 ${
                                        isActive ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="dashboard-nav-pill"
                                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                            className="absolute inset-0 rounded-xl bg-slate-100"
                                        />
                                    )}
                                    <span className={`relative z-10 ${isActive ? 'text-slate-950' : 'text-slate-400'}`}>{item.icon}</span>
                                    <span className="relative z-10">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="pt-1">
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs text-slate-500 hover:text-rose-300 hover:bg-white/[0.03] transition-all"
                        >
                            <LogOut className="w-4 h-4" /> Sign out
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="min-h-[600px]">
                    <AnimatePresence mode="wait">
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                {/* Header Section */}
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                    <div>
                                        <h1 className="font-heading text-4xl sm:text-5xl text-slate-100 mb-2 leading-[1.05]">
                                            {greeting()}, {profile?.full_name?.split(' ')[0] || 'Traveler'}.
                                        </h1>
                                        <p className="text-slate-400 text-sm">
                                            You have{' '}
                                            <span className="text-slate-100">
                                                {upcomingTrips.length} upcoming {upcomingTrips.length === 1 ? 'trip' : 'trips'}
                                            </span>{' '}
                                            saved.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => router.push('/plan-trip')}
                                        className="btn-apple-primary px-5 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Plan a trip
                                    </button>
                                </div>

                                {/* High-level Stats */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="apple-glass-card p-5 rounded-2xl hover:border-white/20 transition-all">
                                        <div className="flex items-center gap-2.5 mb-3 text-slate-300">
                                            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300">
                                                <Compass className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm">Saved trips</span>
                                        </div>
                                        <div className="font-heading text-4xl text-slate-100">{itineraries.length}</div>
                                    </div>
                                    <div className="apple-glass-card p-5 rounded-2xl hover:border-white/20 transition-all">
                                        <div className="flex items-center gap-2.5 mb-3 text-slate-300">
                                            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300">
                                                <Calendar className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm">Days planned</span>
                                        </div>
                                        <div className="font-heading text-4xl text-slate-100">{totalPlannedDays}</div>
                                    </div>
                                    <div className="apple-glass-card p-5 rounded-2xl hover:border-white/20 transition-all">
                                        <div className="flex items-center gap-2.5 mb-3 text-slate-300">
                                            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300">
                                                <Languages className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm">Saved phrases</span>
                                        </div>
                                        <div className="font-heading text-4xl text-slate-100">{translations.length}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                    {/* Latest Trip Card */}
                                    <div className="xl:col-span-2 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h2 className="font-heading text-3xl text-slate-100">Latest trip</h2>
                                            {itineraries.length > 0 && (
                                                <button
                                                    onClick={() => setActiveTab('itineraries')}
                                                    className="text-xs font-mono text-slate-300 hover:text-white flex items-center transition-colors"
                                                >
                                                    View all ({itineraries.length}) <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                                </button>
                                            )}
                                        </div>

                                        {latestTrip ? (
                                            <div
                                                onClick={() => router.push(`/itineraries/${latestTrip.id}`)}
                                                className="group apple-glass-card rounded-3xl overflow-hidden cursor-pointer hover:border-white/25 transition-all"
                                            >
                                                <div className="h-40 w-full bg-gradient-to-br from-slate-900 via-slate-800/90 to-slate-950 relative p-6 flex flex-col justify-between border-b border-white/[0.08]">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-sunrise-300 capitalize">
                                                            {latestTrip.travel_style || 'Verified places'}
                                                        </span>
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider apple-glass-pill text-white">
                                                            Ready
                                                        </span>
                                                    </div>
                                                    <h3 className="font-heading text-3xl text-slate-100 leading-tight">
                                                        {latestTrip.title}
                                                    </h3>
                                                </div>
                                                <div className="p-5 flex items-center justify-between text-xs text-slate-300">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {latestTrip.start_date
                                                            ? new Date(latestTrip.start_date).toLocaleDateString()
                                                            : new Date(latestTrip.created_at).toLocaleDateString()}
                                                    </span>
                                                    <span className="flex items-center gap-1 font-semibold text-white group-hover:translate-x-1 transition-transform">
                                                        Open trip <ChevronRight className="w-3.5 h-3.5" />
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="apple-glass-card rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[220px] border-dashed">
                                                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-3 text-slate-300">
                                                    <PlaneTakeoff className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-heading text-3xl text-slate-100 mb-1">No trips yet</h3>
                                                <p className="text-xs text-slate-300/80 mb-5 max-w-sm">
                                                    Tell us where you’re going and we’ll build a day-by-day plan with real places, routes and a budget.
                                                </p>
                                                <button
                                                    onClick={() => router.push('/plan-trip')}
                                                    className="btn-apple-primary text-xs px-6 py-2.5 rounded-full font-semibold inline-flex items-center gap-1.5"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Plan your first trip
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="space-y-4">
                                        <h2 className="font-heading text-3xl text-slate-100">Tools</h2>
                                        <div className="grid gap-3">
                                            <button
                                                onClick={() => router.push('/plan-trip')}
                                                className="flex items-center p-4 apple-glass-card rounded-2xl group text-left cursor-pointer hover:border-white/25 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mr-3.5 text-slate-300">
                                                    <Map className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-slate-100">Plan a new trip</div>
                                                    <div className="text-[11px] text-slate-400">Day-by-day route &amp; budget plan</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => router.push('/visa-hub')}
                                                className="flex items-center p-4 apple-glass-card rounded-2xl group text-left cursor-pointer hover:border-white/25 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mr-3.5 text-slate-300">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-slate-100">Visa hub</div>
                                                    <div className="text-[11px] text-slate-400">Entry rules &amp; approval confidence</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => router.push('/translate')}
                                                className="flex items-center p-4 apple-glass-card rounded-2xl group text-left cursor-pointer hover:border-white/25 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mr-3.5 text-slate-300">
                                                    <Languages className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-slate-100">Translate</div>
                                                    <div className="text-[11px] text-slate-400">Phrases, live voice &amp; menu OCR</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => router.push('/travel-research')}
                                                className="flex items-center p-4 apple-glass-card rounded-2xl group text-left cursor-pointer hover:border-white/25 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mr-3.5 text-slate-300">
                                                    <Globe2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-slate-100">Place research</div>
                                                    <div className="text-[11px] text-slate-400">Fare scanner &amp; advisories</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ITINERARIES TAB */}
                        {activeTab === 'itineraries' && (
                            <motion.div
                                key="itineraries"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                                    <div>
                                        <h1 className="font-heading text-4xl sm:text-5xl text-slate-100">My trips</h1>
                                        <p className="text-slate-300/80 text-xs mt-1">Open, share, or export any of your generated itineraries.</p>
                                    </div>
                                    <button
                                        onClick={() => router.push('/plan-trip')}
                                        className="btn-apple-primary text-xs px-5 py-2.5 rounded-full font-semibold inline-flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Plan a trip
                                    </button>
                                </div>

                                {itineraries.length === 0 ? (
                                    <div className="py-20 text-center apple-glass-card rounded-3xl border-dashed">
                                        <Compass className="w-9 h-9 text-slate-400 mx-auto mb-3" />
                                        <h3 className="font-heading text-3xl text-slate-100">No trips yet</h3>
                                        <p className="text-sm text-slate-400 mt-1 mb-6">Your first plan takes under a minute.</p>
                                        <button
                                            onClick={() => router.push('/plan-trip')}
                                            className="btn-apple-primary text-xs px-5 py-2.5 rounded-full font-semibold"
                                        >
                                            Start planning →
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {itineraries.map((it) => (
                                            <div
                                                key={it.id}
                                                onClick={() => router.push(`/itineraries/${it.id}`)}
                                                className="group apple-glass-card rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between hover:border-white/25 transition-all"
                                            >
                                                <div className="p-6">
                                                    <span className="inline-block text-xs text-sunrise-300 capitalize mb-2">
                                                        {it.travel_style || 'Curated'}
                                                    </span>
                                                    <h3 className="font-heading text-2xl text-slate-100 leading-tight mb-2 line-clamp-2">
                                                        {it.title}
                                                    </h3>
                                                </div>
                                                <div className="px-6 py-3.5 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                        {it.start_date
                                                            ? new Date(it.start_date).toLocaleDateString()
                                                            : new Date(it.created_at).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-white group-hover:translate-x-1 transition-all flex items-center gap-1">
                                                        Open <ChevronRight className="w-3.5 h-3.5" />
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* FLIGHTS TAB */}
                        {activeTab === 'flights' && (
                            <motion.div
                                key="flights"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <MyFlightsTab itineraries={itineraries.map((it) => ({ id: it.id, title: it.title }))} />
                            </motion.div>
                        )}

                        {/* TRANSLATIONS TAB */}
                        {activeTab === 'translations' && (
                            <motion.div
                                key="translations"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                                    <div>
                                        <h1 className="font-heading text-4xl sm:text-5xl text-slate-100">Saved phrases</h1>
                                        <p className="text-slate-400 text-sm mt-1">Phrases, voice and menu scans you’ve translated.</p>
                                    </div>
                                    <button
                                        onClick={() => router.push('/translate')}
                                        className="btn-apple-primary text-xs px-5 py-2.5 rounded-full font-semibold inline-flex items-center gap-1.5"
                                    >
                                        <Languages className="w-3.5 h-3.5" /> Open translator
                                    </button>
                                </div>

                                {translations.length === 0 ? (
                                    <div className="py-20 text-center apple-glass-card rounded-3xl border-dashed">
                                        <History className="w-9 h-9 text-slate-400 mx-auto mb-3" />
                                        <h3 className="font-semibold text-white text-sm">No translations recorded</h3>
                                        <p className="text-xs text-slate-400 mt-1">Anything you translate will show up here.</p>
                                    </div>
                                ) : (
                                    <div className="apple-glass-card rounded-3xl overflow-hidden divide-y divide-white/[0.07]">
                                        {translations.map((t) => (
                                            <div
                                                key={t.id}
                                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                                            >
                                                <div>
                                                    <div className="text-xs text-slate-500 mb-1">
                                                        {t.source_language} → {t.target_language}
                                                    </div>
                                                    <div className="text-sm text-slate-300">{t.original_text}</div>
                                                    <div className="text-base text-slate-100 mt-1">{t.translated_text}</div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(t.translated_text);
                                                        toast.success('Copied translation');
                                                    }}
                                                    className="btn-apple-glass p-2.5 rounded-xl self-end sm:self-center"
                                                    title="Copy translation"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6 max-w-2xl"
                            >
                                <div>
                                    <h1 className="font-heading text-4xl sm:text-5xl text-slate-100 mb-1">Account</h1>
                                    <p className="text-slate-400 text-sm">Your display name and community handle.</p>
                                </div>

                                <div className="apple-glass-card rounded-3xl p-6 sm:p-8 space-y-5">
                                    {userEmail && (
                                        <div className="space-y-2">
                                            <label className="text-sm text-slate-400">Email</label>
                                            <Input
                                                value={userEmail}
                                                disabled
                                                className="rounded-2xl bg-slate-950/60 border-white/10 text-slate-400 text-sm h-12"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-300">Name</label>
                                        <Input
                                            value={fullNameInput}
                                            onChange={(e) => setFullNameInput(e.target.value)}
                                            placeholder="Your display name"
                                            className="rounded-2xl bg-slate-950/65 border-white/10 text-white text-sm h-12 focus-visible:ring-1 focus-visible:ring-white/25"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-300">Handle</label>
                                        <Input
                                            value={usernameInput}
                                            onChange={(e) => setUsernameInput(e.target.value)}
                                            placeholder="@voyager"
                                            className="rounded-2xl bg-slate-950/65 border-white/10 text-white text-sm h-12 focus-visible:ring-1 focus-visible:ring-white/25 font-mono"
                                        />
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveProfile}
                                            disabled={isSavingProfile}
                                            className="btn-apple-primary text-xs px-6 py-3 rounded-full font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            <span>{isSavingProfile ? 'Saving…' : 'Save changes'}</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
