'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
    Map, MapPin, Settings, Bookmark, CheckCircle2, MoreHorizontal, Calendar, 
    LogOut, User, Loader2, Languages, Volume2, Copy, Trash2, Shield, Activity, 
    Cpu, Globe2, Eye, Server, Radio
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Background Animation Component
const HolographicBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-[0] bg-[#03080F] overflow-hidden">
        {/* Cyber Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-200px)_scale(2)] opacity-30 animate-[gridMove_20s_linear_infinite]" />
        
        {/* Pulsing Nebulas */}
        <motion.div
            className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen filter blur-[150px] bg-gradient-to-tr from-[#8B5CF6]/30 to-transparent"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3], rotate: [0, 90, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
            className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[130px] bg-gradient-to-bl from-[#00D4FF]/20 to-transparent"
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2], rotate: [0, -90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
    </div>
);

// Memory Shard Component for Itineraries
const MemoryShard = ({ it, router }: { it: any, router: any }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [10, -10]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-10, 10]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    return (
        <motion.div
            ref={cardRef}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            whileHover={{ scale: 1.05, zIndex: 10 }}
            className="relative cursor-pointer group perspective-1000 w-full"
            onClick={() => router.push(`/itineraries/${it.id}`)}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative h-full bg-[#0A0D1A]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:opacity-0 group-hover:before:opacity-100">
                <div className="h-32 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#8B5CF6]/30 to-[#00D4FF]/30 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
                    <Badge className={`absolute top-4 right-4 backdrop-blur-md border ${it.is_public ? 'bg-[#00FFB3]/20 text-[#00FFB3] border-[#00FFB3]/50' : 'bg-[#FF8C00]/20 text-[#FF8C00] border-[#FF8C00]/50'}`}>
                        {it.is_public ? 'Public Node' : 'Encrypted'}
                    </Badge>
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between z-10">
                        <h3 className="text-white text-xl font-black uppercase tracking-widest drop-shadow-lg truncate">{it.title}</h3>
                    </div>
                </div>
                <div className="p-5 flex justify-between items-center border-t border-white/5">
                    <div className="text-xs text-[#00D4FF] font-mono uppercase tracking-widest flex items-center">
                        <Calendar className="w-3 h-3 mr-2 text-white/50" />
                        {it.start_date ? new Date(it.start_date).toLocaleDateString() : new Date(it.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase text-[#8B5CF6] border border-[#8B5CF6]/30 px-2 py-1 rounded-md bg-[#8B5CF6]/10">{it.travel_style || 'General'}</span>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-white/50 hover:text-white hover:bg-white/10">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

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

    // Sidebar 3D tilt tracking
    const sidebarRef = useRef<HTMLDivElement>(null);
    const sbX = useMotionValue(0);
    const sbY = useMotionValue(0);
    const sbRotateX = useTransform(useSpring(sbY), [-0.5, 0.5], [5, -5]);
    const sbRotateY = useTransform(useSpring(sbX), [-0.5, 0.5], [-5, 5]);

    const onSidebarMove = (e: React.MouseEvent) => {
        if (!sidebarRef.current) return;
        const rect = sidebarRef.current.getBoundingClientRect();
        sbX.set((e.clientX - rect.left) / rect.width - 0.5);
        sbY.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#03080F]">
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border-t-2 border-[#00D4FF] border-r-2 border-transparent" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="absolute inset-4 rounded-full border-b-2 border-[#8B5CF6] border-l-2 border-transparent" />
                    <Cpu className="w-8 h-8 text-[#00D4FF] animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-10 px-4 md:px-8 relative text-white font-sans overflow-hidden">
            <HolographicBackground />

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 relative z-10">
                
                {/* 3D Floating Sidebar */}
                <motion.div 
                    ref={sidebarRef}
                    style={{ rotateX: sbRotateX, rotateY: sbRotateY, transformStyle: "preserve-3d" }}
                    onMouseMove={onSidebarMove}
                    onMouseLeave={() => { sbX.set(0); sbY.set(0); }}
                    className="space-y-6 perspective-1000"
                >
                    {/* Profile Node Container */}
                    <div className="bg-[#0A0D1A]/60 backdrop-blur-2xl border border-[#00D4FF]/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,212,255,0.1)] relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00D4FF] to-transparent opacity-50" />
                        
                        <div className="h-28 relative overflow-hidden bg-gradient-to-br from-[#1A103C] to-[#0D1B2A]">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity className="w-full h-full text-[#8B5CF6]/10 animate-pulse stroke-[0.5]" />
                            </div>
                        </div>
                        
                        <div className="px-6 pb-6 relative flex flex-col items-center -mt-14">
                            <div className="relative p-1 rounded-full bg-gradient-to-tr from-[#00D4FF] to-[#8B5CF6] mb-4 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                                <Avatar className="w-24 h-24 border-4 border-[#03080F] bg-[#03080F]">
                                    <AvatarImage src={profile?.avatar_url || "https://i.pravatar.cc/150?u=user123"} />
                                    <AvatarFallback className="bg-[#03080F] text-white text-xl font-bold">{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#00FFB3] rounded-full border-2 border-[#03080F] shadow-[0_0_10px_#00FFB3]" />
                            </div>

                            <h2 className="text-2xl font-black uppercase tracking-widest text-[#E2E8F0] drop-shadow-md">{profile?.full_name}</h2>
                            <p className="text-[#00D4FF] font-mono text-xs uppercase tracking-[0.2em] mb-4">{profile?.username}</p>

                            <Badge className="bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/50 mb-6 py-1 px-4 font-bold uppercase tracking-widest text-[10px]">Level 7 clearance</Badge>

                            <div className="w-full space-y-3 font-mono text-xs text-white/60">
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
                                    <span className="flex items-center gap-2"><Map className="w-3 h-3 text-[#00D4FF]" /> Memory Shards</span>
                                    <span className="font-bold text-white text-sm bg-white/10 px-2 rounded">{itineraries.length}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
                                    <span className="flex items-center gap-2"><Languages className="w-3 h-3 text-[#8B5CF6]" /> Comms Logs</span>
                                    <span className="font-bold text-white text-sm bg-white/10 px-2 rounded">{translations.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Console */}
                    <div className="bg-[#0A0D1A]/60 backdrop-blur-2xl border border-[#8B5CF6]/20 rounded-3xl p-4 shadow-[0_0_50px_rgba(139,92,246,0.05)]">
                        <div className="space-y-2">
                            {[
                                { id: 'overview', icon: <Globe2 className="w-4 h-4" />, label: 'Command Hub' },
                                { id: 'itineraries', icon: <Server className="w-4 h-4" />, label: 'Memory Bank' },
                                { id: 'translations', icon: <Radio className="w-4 h-4" />, label: 'Comms Feed' },
                                { id: 'profile', icon: <Shield className="w-4 h-4" />, label: 'Security Uplink' },
                            ].map((btn) => (
                                <button
                                    key={btn.id}
                                    onClick={() => setActiveTab(btn.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                                        activeTab === btn.id 
                                        ? 'bg-gradient-to-r from-[#8B5CF6]/20 to-[#00D4FF]/20 text-white border border-white/20 shadow-inner' 
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span className={`${activeTab === btn.id ? 'text-[#00D4FF]' : 'text-white/30'}`}>{btn.icon}</span>
                                    {btn.label}
                                </button>
                            ))}
                            <div className="h-px bg-white/10 my-4 mx-2" />
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs text-[#FF0040]/70 hover:text-[#FF0040] hover:bg-[#FF0040]/10 transition-all"
                            >
                                <LogOut className="w-4 h-4" /> Disconnect
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <div className="relative min-h-[600px]">
                    <AnimatePresence mode="wait">
                        
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <motion.div 
                                key="overview"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40 drop-shadow-sm mb-8">
                                    Command Hub initialized.
                                </h1>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Quick Action Widget 1 */}
                                    <div className="bg-gradient-to-br from-[#0A0D1A]/80 to-[#1A103C]/80 backdrop-blur-xl border border-[#00D4FF]/30 rounded-3xl p-6 group cursor-pointer hover:shadow-[0_0_40px_rgba(0,212,255,0.2)] transition-all">
                                        <div className="w-12 h-12 rounded-2xl bg-[#00D4FF]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <Map className="w-6 h-6 text-[#00D4FF]" />
                                        </div>
                                        <h3 className="text-white text-xl font-black uppercase tracking-widest mb-2">Initialize Run</h3>
                                        <p className="text-white/40 font-mono text-sm leading-relaxed mb-6 h-10">Deploy AI to construct a new travel vector.</p>
                                        <Button className="w-full bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-[#03080F] font-black uppercase tracking-widest text-xs rounded-xl" onClick={() => router.push('/plan-trip')}>
                                            Deploy Agents
                                        </Button>
                                    </div>

                                    {/* Quick Action Widget 2 */}
                                    <div className="bg-gradient-to-bl from-[#0A0D1A]/80 to-[#0D1B2A]/80 backdrop-blur-xl border border-[#8B5CF6]/30 rounded-3xl p-6 group cursor-pointer hover:shadow-[0_0_40px_rgba(139,92,246,0.2)] transition-all">
                                        <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <Radio className="w-6 h-6 text-[#8B5CF6]" />
                                        </div>
                                        <h3 className="text-white text-xl font-black uppercase tracking-widest mb-2">Comms Uplink</h3>
                                        <p className="text-white/40 font-mono text-sm leading-relaxed mb-6 h-10">Access real-time holographic linguistic decoder.</p>
                                        <Button className="w-full bg-[#8B5CF6] hover:bg-[#8B5CF6]/80 text-white font-black uppercase tracking-widest text-xs rounded-xl" onClick={() => router.push('/translate')}>
                                            Establish Link
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ITINERARIES TAB */}
                        {activeTab === 'itineraries' && (
                            <motion.div 
                                key="itineraries"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                    <h1 className="text-4xl font-black uppercase tracking-tight text-white flex items-center gap-4">
                                        <Server className="w-8 h-8 text-[#00D4FF]" /> Memory Bank
                                    </h1>
                                    <Button className="bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF] hover:text-[#03080F] rounded-xl font-bold uppercase tracking-widest text-xs transition-colors" onClick={() => router.push('/plan-trip')}>
                                        New Upload
                                    </Button>
                                </div>

                                {itineraries.length === 0 ? (
                                    <div className="text-center py-20 bg-[#0A0D1A]/40 backdrop-blur-md rounded-3xl border border-dashed border-white/20">
                                        <Eye className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                        <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Core is empty</h3>
                                        <p className="text-white/40 font-mono text-sm">No memory shards detected in your partition.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {itineraries.map((it) => (
                                            <MemoryShard key={it.id} it={it} router={router} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TRANSLATIONS TAB */}
                        {activeTab === 'translations' && (
                            <motion.div 
                                key="translations"
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <h1 className="text-4xl font-black uppercase tracking-tight text-white flex items-center gap-4">
                                        <Radio className="w-8 h-8 text-[#8B5CF6]" /> Comms Feed
                                    </h1>
                                    <Button className="bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6] hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors" onClick={() => router.push('/translate')}>
                                        Active Channel
                                    </Button>
                                </div>

                                {translations.length === 0 ? (
                                    <div className="text-center py-20 bg-[#0A0D1A]/40 backdrop-blur-md rounded-3xl border border-dashed border-white/20">
                                        <Radio className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                        <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Signal lost</h3>
                                        <p className="text-white/40 font-mono text-sm">No incoming transmissions recorded.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {translations.map((t, idx) => (
                                            <motion.div 
                                                key={t.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="bg-[#0A0D1A]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-[#8B5CF6]/40 transition-colors group relative overflow-hidden"
                                            >
                                                {/* Scan line effect */}
                                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#8B5CF6]/50 to-transparent transform -translate-y-full group-hover:animate-[scan_2s_ease-in-out_infinite]" />

                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-4 border-b border-white/5">
                                                    <div className="flex items-center gap-3 font-mono text-xs uppercase font-bold tracking-widest">
                                                        <span className="text-white/40">{t.source_language}</span>
                                                        <MoreHorizontal className="w-4 h-4 text-[#8B5CF6]" />
                                                        <span className="text-[#00D4FF] bg-[#00D4FF]/10 px-2 py-1 rounded">{t.target_language}</span>
                                                    </div>
                                                    <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest mt-2 sm:mt-0">
                                                        {new Date(t.created_at).toLocaleDateString()} // {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                                                        <p className="text-sm text-white/70 leading-relaxed font-mono">{t.original_text}</p>
                                                    </div>
                                                    <div className="p-4 bg-[#8B5CF6]/5 rounded-xl border border-[#8B5CF6]/20 relative group/target">
                                                        <p className="text-sm text-[#00D4FF] leading-relaxed font-bold font-mono">"{t.translated_text}"</p>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(t.translated_text)}
                                                            className="absolute bottom-2 right-2 p-2 bg-[#00D4FF]/20 text-[#00D4FF] hover:bg-[#00D4FF] hover:text-[#03080F] rounded-lg opacity-0 group-hover/target:opacity-100 transition-all backdrop-blur-md border border-[#00D4FF]/30"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <motion.div 
                                key="profile"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <h1 className="text-4xl font-black uppercase tracking-tight text-white flex items-center gap-4 mb-8">
                                    <Shield className="w-8 h-8 text-white/50" /> Security Uplink
                                </h1>

                                <div className="bg-[#0A0D1A]/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B5CF6]/10 rounded-bl-[100px] border-b border-l border-[#8B5CF6]/20" />
                                    
                                    <h3 className="text-lg font-black uppercase tracking-widest text-[#E2E8F0] mb-8 pb-4 border-b border-white/5">Identity Matrix</h3>
                                    
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#00D4FF]">Authorized Designation</label>
                                                <Input defaultValue={profile?.full_name || ''} className="h-14 bg-black/50 border-white/10 text-white font-mono placeholder:text-white/20 focus-visible:ring-[#00D4FF] text-lg rounded-xl" />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">Network Alias</label>
                                                <Input defaultValue={profile?.username || ''} className="h-14 bg-black/50 border-white/10 text-white font-mono placeholder:text-white/20 focus-visible:ring-[#8B5CF6] text-lg rounded-xl" />
                                            </div>
                                            <div className="space-y-3 md:col-span-2">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Bio-Metric Data (Optional)</label>
                                                <Input defaultValue={profile?.bio || ''} className="h-14 bg-black/50 border-white/10 text-white font-mono placeholder:text-white/20 focus-visible:ring-white/30 text-lg rounded-xl" />
                                            </div>
                                        </div>
                                        <Button className="mt-8 rounded-xl bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-xs h-12 px-8 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-all float-right">
                                            Sync Parameters
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            
            <style jsx global>{`
                @keyframes gridMove {
                    0% { transform: perspective(1000px) rotateX(60deg) translateY(-200px) scale(2); }
                    100% { transform: perspective(1000px) rotateX(60deg) translateY(0px) scale(2); }
                }
                @keyframes scan {
                    0%, 100% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    99.9% { transform: translateY(100%); }
                }
            `}</style>
        </div>
    );
}
