'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
    Map, Settings, Bookmark, CheckCircle2, MoreHorizontal, Calendar, 
    LogOut, User, Loader2, Languages, Volume2, Copy, Trash2, Shield, Activity, 
    Globe2, LayoutDashboard, Compass, CreditCard, ChevronRight, PlaneTakeoff, 
    ArrowRightLeft, History
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const supabase = createClient();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [itineraries, setItineraries] = useState<any[]>([]);
    const [translations, setTranslations] = useState<any[]>([]);

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { router.push('/login'); return; }

                const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                const { data: itinerariesData } = await supabase.from('itineraries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
                const { data: translationsData } = await supabase.from('translation_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

                setProfile(profileData || { full_name: 'Traveler', username: '@wanderer' });
                setItineraries(itinerariesData || []);
                setTranslations(translationsData || []);
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [supabase, router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
                <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
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
        { id: 'itineraries', icon: <Compass className="w-4 h-4" />, label: 'My Trips' },
        { id: 'translations', icon: <Languages className="w-4 h-4" />, label: 'Translation Log' },
        { id: 'profile', icon: <User className="w-4 h-4" />, label: 'Account Settings' },
    ];

    const upcomingTrips = itineraries.filter(it => !it.start_date || new Date(it.start_date) >= new Date());
    const latestTrip = itineraries[0];

    return (
        <div className="min-h-screen bg-[#09090b] text-neutral-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
            {/* Subtle Top Radial Gradient */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-[100%] pointer-events-none opacity-50" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

            <div className="max-w-[1400px] mx-auto pt-24 pb-12 px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 relative z-10">
                
                {/* Minimalist Sidebar */}
                <aside className="space-y-8">
                    {/* User Mini Profile */}
                    <div className="flex items-center gap-4 px-2">
                        <Avatar className="w-12 h-12 ring-1 ring-white/10 shadow-lg">
                            <AvatarImage src={profile?.avatar_url || "https://i.pravatar.cc/150?u=user123"} />
                            <AvatarFallback className="bg-neutral-800 text-neutral-300 font-medium">
                                {profile?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                            <h2 className="text-sm font-semibold truncate text-neutral-100">{profile?.full_name}</h2>
                            <p className="text-xs text-neutral-400 truncate">{profile?.username}</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    activeTab === item.id 
                                    ? 'bg-neutral-800/50 text-white shadow-sm ring-1 ring-white/10' 
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
                                }`}
                            >
                                <span className={activeTab === item.id ? 'text-indigo-400' : 'text-neutral-500'}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="h-px bg-white/5 mx-2" />

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </aside>

                {/* Main Content Area */}
                <main className="min-h-[700px]">
                    <AnimatePresence mode="wait">
                        
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <motion.div 
                                key="overview"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                {/* Header Section */}
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight text-neutral-50 mb-2">
                                        {greeting()}, {profile?.full_name?.split(' ')[0] || 'Traveler'}.
                                    </h1>
                                    <p className="text-neutral-400">
                                        You have <strong className="text-neutral-200 font-medium">{upcomingTrips.length} upcoming trips</strong> lined up.
                                    </p>
                                </div>

                                {/* High-level Stats */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2 text-neutral-400">
                                            <Compass className="w-4 h-4 text-indigo-400" />
                                            <span className="text-xs font-medium uppercase tracking-wider">Total Itineraries</span>
                                        </div>
                                        <div className="text-3xl font-semibold text-neutral-50">{itineraries.length}</div>
                                    </div>
                                    <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2 text-neutral-400">
                                            <Languages className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-medium uppercase tracking-wider">Translations</span>
                                        </div>
                                        <div className="text-3xl font-semibold text-neutral-50">{translations.length}</div>
                                    </div>
                                    <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2 text-neutral-400">
                                            <Bookmark className="w-4 h-4 text-amber-400" />
                                            <span className="text-xs font-medium uppercase tracking-wider">Saved Places</span>
                                        </div>
                                        <div className="text-3xl font-semibold text-neutral-50">0</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                    {/* Latest Trip / Up Next (Takes up 2 columns on large screens) */}
                                    <div className="xl:col-span-2 space-y-4">
                                        <div className="flex justify-between items-end">
                                            <h2 className="text-lg font-semibold text-neutral-200">Up Next</h2>
                                            <button onClick={() => setActiveTab('itineraries')} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center">
                                                View all <ChevronRight className="w-4 h-4 ml-1" />
                                            </button>
                                        </div>
                                        
                                        {latestTrip ? (
                                            <div onClick={() => router.push(`/itineraries/${latestTrip.id}`)} className="group relative bg-neutral-900/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-indigo-500/10 transition-all duration-300">
                                                {/* Decorative Top Banner */}
                                                <div className="h-32 w-full bg-neutral-800 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                                                    <Badge className="absolute top-4 right-4 bg-neutral-950/50 backdrop-blur-md text-white border-white/10">
                                                        Upcoming
                                                    </Badge>
                                                </div>
                                                <div className="p-6">
                                                    <h3 className="text-2xl font-bold text-neutral-50 mb-2 truncate">{latestTrip.title}</h3>
                                                    <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                                                        <span className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> 
                                                            {latestTrip.start_date ? new Date(latestTrip.start_date).toLocaleDateString() : new Date(latestTrip.created_at).toLocaleDateString()}
                                                        </span>
                                                        <span className="flex items-center"><Map className="w-4 h-4 mr-2" /> {latestTrip.travel_style || 'General'} Tour</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-neutral-900/40 border border-dashed border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
                                                <PlaneTakeoff className="w-10 h-10 text-neutral-600 mb-4" />
                                                <h3 className="text-neutral-300 font-medium mb-1">No trips planned yet</h3>
                                                <p className="text-sm text-neutral-500 mb-6 max-w-sm">Use our AI agent to generate a complete travel itinerary in seconds.</p>
                                                <Button onClick={() => router.push('/plan-trip')} className="bg-white text-black hover:bg-neutral-200">
                                                    Plan a Trip
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Actions / Activity */}
                                    <div className="space-y-4">
                                        <h2 className="text-lg font-semibold text-neutral-200">Quick Actions</h2>
                                        <div className="grid gap-3">
                                            <button onClick={() => router.push('/plan-trip')} className="flex items-center p-4 bg-neutral-900/50 border border-white/5 rounded-xl hover:bg-neutral-800 transition-colors group text-left">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mr-4 group-hover:bg-indigo-500/20 transition-colors">
                                                    <Map className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-neutral-200">New Itinerary</div>
                                                    <div className="text-xs text-neutral-500 mt-0.5">Let AI plan your next journey.</div>
                                                </div>
                                            </button>
                                            <button onClick={() => router.push('/translate')} className="flex items-center p-4 bg-neutral-900/50 border border-white/5 rounded-xl hover:bg-neutral-800 transition-colors group text-left">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-4 group-hover:bg-emerald-500/20 transition-colors">
                                                    <Languages className="w-5 h-5 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-neutral-200">Live Translator</div>
                                                    <div className="text-xs text-neutral-500 mt-0.5">Real-time voice and text translation.</div>
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
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">My Trips</h1>
                                        <p className="text-neutral-400 mt-1">Manage and view all your generated itineraries.</p>
                                    </div>
                                    <Button onClick={() => router.push('/plan-trip')} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm">
                                        <Map className="w-4 h-4 mr-2" /> Plan New Trip
                                    </Button>
                                </div>

                                {itineraries.length === 0 ? (
                                    <div className="py-24 text-center">
                                        <Compass className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-medium text-neutral-300">No itineraries found</h3>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {itineraries.map((it) => (
                                            <div 
                                                key={it.id} 
                                                onClick={() => router.push(`/itineraries/${it.id}`)}
                                                className="group bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden hover:border-white/10 hover:bg-neutral-800/80 transition-all cursor-pointer flex flex-col h-[200px]"
                                            >
                                                <div className="p-5 flex-1 relative">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h3 className="text-lg font-semibold text-neutral-100 line-clamp-2 pr-4">{it.title}</h3>
                                                        <button className="text-neutral-500 hover:text-neutral-200 transition-colors shrink-0">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    
                                                    <Badge variant="outline" className="bg-neutral-950/50 border-white/10 text-neutral-300 mb-3 font-normal">
                                                        {it.travel_style || 'General'}
                                                    </Badge>
                                                    
                                                    {it.is_public && (
                                                        <div className="absolute top-5 right-10 flex items-center text-[10px] text-emerald-400 font-medium tracking-wide">
                                                            <Globe2 className="w-3 h-3 mr-1" /> PUBLIC
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="px-5 py-4 bg-black/20 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400 font-medium">
                                                    <div className="flex items-center">
                                                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                                        {it.start_date ? new Date(it.start_date).toLocaleDateString() : new Date(it.created_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center">
                                                        View <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TRANSLATIONS TAB */}
                        {activeTab === 'translations' && (
                            <motion.div 
                                key="translations"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Translation Log</h1>
                                        <p className="text-neutral-400 mt-1">A semantic history of your voice and text translations.</p>
                                    </div>
                                    <Button onClick={() => router.push('/translate')} variant="outline" className="border-white/10 hover:bg-white/5 shadow-sm">
                                        <Languages className="w-4 h-4 mr-2" /> Open Translator
                                    </Button>
                                </div>

                                {translations.length === 0 ? (
                                    <div className="py-24 text-center border-t border-white/5">
                                        <History className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-medium text-neutral-300">No translations yet</h3>
                                    </div>
                                ) : (
                                    <div className="bg-neutral-900/30 border border-white/5 rounded-xl overflow-hidden">
                                        <div className="hidden md:grid grid-cols-[1fr_1fr_120px] gap-6 p-4 border-b border-white/5 text-xs font-semibold text-neutral-500 uppercase tracking-wider bg-black/20">
                                            <div>Original Text <span className="font-normal normal-case text-neutral-600 block sm:inline sm:ml-2">(Source)</span></div>
                                            <div>Translation <span className="font-normal normal-case text-neutral-600 block sm:inline sm:ml-2">(Target)</span></div>
                                            <div className="text-right">Action</div>
                                        </div>
                                        
                                        <div className="divide-y divide-white/5">
                                            {translations.map((t) => (
                                                <div key={t.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px] gap-4 md:gap-6 p-4 md:p-5 hover:bg-white/[0.02] transition-colors items-center group">
                                                    
                                                    {/* Source Item */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5 md:hidden">
                                                            <Badge variant="outline" className="text-[10px] bg-neutral-950 border-white/10 text-neutral-400">{t.source_language}</Badge>
                                                        </div>
                                                        <p className="text-sm text-neutral-300 leading-relaxed">{t.original_text}</p>
                                                        <div className="hidden md:block mt-2">
                                                            <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest">{t.source_language}</span>
                                                        </div>
                                                    </div>

                                                    {/* Mobile Divider */}
                                                    <div className="md:hidden flex items-center justify-center py-2 text-neutral-700">
                                                        <ArrowRightLeft className="w-4 h-4 rotate-90" />
                                                    </div>

                                                    {/* Target Item */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5 md:hidden">
                                                            <Badge variant="outline" className="text-[10px] bg-indigo-950/30 border-indigo-500/20 text-indigo-300">{t.target_language}</Badge>
                                                        </div>
                                                        <p className="text-sm font-medium text-neutral-100 leading-relaxed">{t.translated_text}</p>
                                                        <div className="hidden md:block mt-2">
                                                            <span className="text-[10px] font-medium text-indigo-400/70 uppercase tracking-widest">{t.target_language}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center md:justify-end gap-3 mt-2 md:mt-0">
                                                        <span className="text-xs text-neutral-600 font-medium md:hidden">
                                                            {new Date(t.created_at).toLocaleDateString()}
                                                        </span>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(t.translated_text)}
                                                            className="p-2 ml-auto md:ml-0 text-neutral-500 hover:text-neutral-200 hover:bg-white/10 rounded-md transition-all shadow-sm border border-transparent hover:border-white/10 opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                            title="Copy translation"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <motion.div 
                                key="profile"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                                className="space-y-6 max-w-3xl"
                            >
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight text-neutral-50 mb-1">Account Settings</h1>
                                    <p className="text-neutral-400">Manage your personal information and preferences.</p>
                                </div>

                                <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 mt-8">
                                    <h3 className="text-lg font-semibold text-neutral-200 mb-6">Profile Details</h3>
                                    
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-neutral-400">Full Name</label>
                                                <Input 
                                                    defaultValue={profile?.full_name || ''} 
                                                    className="bg-black/40 border-white/10 text-neutral-200 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 shadow-inner" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-neutral-400">Username</label>
                                                <Input 
                                                    defaultValue={profile?.username || ''} 
                                                    className="bg-black/40 border-white/10 text-neutral-200 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 shadow-inner" 
                                                />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className="text-xs font-medium text-neutral-400">Bio</label>
                                                <Input 
                                                    defaultValue={profile?.bio || ''} 
                                                    placeholder="Tell us about your travel style..."
                                                    className="bg-black/40 border-white/10 text-neutral-200 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 shadow-inner" 
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="pt-4 border-t border-white/5 flex justify-end">
                                            <Button className="bg-white text-black hover:bg-neutral-200 font-medium px-6">
                                                Save Changes
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone (Visual only for UI completeness) */}
                                <div className="border border-red-500/20 rounded-2xl p-6 bg-red-500/5 mt-8">
                                    <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
                                    <p className="text-sm text-neutral-400 mb-4">Permanently delete your account and all associated travel data. This action cannot be undone.</p>
                                    <Button variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300">
                                        Delete Account
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
