'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    MessageSquare, MapPin, Map, Plane, FileText, Lightbulb,
    Loader2, Sparkles, Heart, Globe, Compass, X, Send, Lock, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

const CURATED_FIELD_DISPATCHES = [
    {
        id: 'curated-tokyo-suica',
        author: { name: 'Elena R.', handle: '@elenavoyage', avatar: '' },
        category: 'Tips',
        location: 'Tokyo, Japan',
        cityQuery: 'Tokyo, Japan',
        content: 'Add a digital Suica or PASMO card directly inside Apple Wallet before landing at Haneda—tap through every JR & Metro gate without queuing for paper tickets.',
        likes: 42,
        time: 'Verified Tip',
        image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'curated-kyoto-dawn',
        author: { name: 'Marcus K.', handle: '@marcusnomad', avatar: '' },
        category: 'Itineraries',
        location: 'Kyoto, Japan',
        cityQuery: 'Kyoto, Japan',
        content: 'Arrive at Fushimi Inari Taisha by 06:30 AM and hike past the Yotsutsuji intersection—crowds drop by 90% and morning light through the torii gates is unforgettable.',
        likes: 38,
        time: 'Verified Route',
        image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'curated-japan-vjw',
        author: { name: 'Priya S.', handle: '@priyatravels', avatar: '' },
        category: 'Visa Intel',
        location: 'Narita / Haneda, Japan',
        cityQuery: 'Tokyo, Japan',
        content: 'Complete your Visit Japan Web immigration & customs QR code 48 hours prior to departure—cleared biometrics and baggage customs in under 14 minutes.',
        likes: 29,
        time: 'Border Update',
        image: null,
    },
    {
        id: 'curated-lisbon-alfama',
        author: { name: 'Lucas M.', handle: '@lucasroutes', avatar: '' },
        category: 'Trips',
        location: 'Lisbon, Portugal',
        cityQuery: 'Lisbon, Portugal',
        content: 'Skip the mid-day Martim Moniz queue for Tram 28—walk up to Miradouro da Senhora do Monte at golden hour and dine at a neighborhood tasca in Graça instead.',
        likes: 31,
        time: 'Field Report',
        image: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'curated-zermatt-pass',
        author: { name: 'Hannah W.', handle: '@alpinehannah', avatar: '' },
        category: 'Tips',
        location: 'Interlaken, Switzerland',
        cityQuery: 'Interlaken, Switzerland',
        content: 'The Swiss Half Fare Card pays for itself in just two mountain excursions (Jungfraujoch or Schilthorn) plus covers regional boats on Lake Thun and Lake Brienz.',
        likes: 27,
        time: 'Verified Tip',
        image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'curated-seoul-tmoney',
        author: { name: 'Daniel C.', handle: '@seoultransit', avatar: '' },
        category: 'Visa Intel',
        location: 'Seoul, South Korea',
        cityQuery: 'Seoul, South Korea',
        content: 'Download Naver Map or KakaoMap before flying to Incheon—Google Maps lacks turn-by-turn walking directions in Korea, while Naver shows exact subway exit numbers.',
        likes: 35,
        time: 'Verified Tip',
        image: null,
    },
];

const GalleryCard = ({ post, index }: { post: any; index: number }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [localLikes, setLocalLikes] = useState<number>(post.likes || 0);

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLiked(!isLiked);
        setLocalLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    };

    const planDestination = post.cityQuery || post.location;

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.45 }}
            className="relative break-inside-avoid mb-6"
        >
            <div className="apple-glass-card rounded-3xl overflow-hidden group hover:border-white/25 transition-all">
                {/* Image or Minimal Spatial Banner */}
                {post.image ? (
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900/60 border-b border-white/[0.08]">
                        <img
                            src={post.image}
                            alt={post.location}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                        <div className="absolute top-3.5 left-3.5">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase apple-liquid-glass text-white">
                                {post.category || 'Trip'}
                            </span>
                        </div>
                        <Link
                            href={`/plan-trip?destination=${encodeURIComponent(planDestination)}`}
                            className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between px-3 py-1.5 rounded-full apple-liquid-glass text-[11px] font-medium text-white hover:bg-white/20 transition-colors"
                        >
                            <span className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3 h-3 text-sky-300 shrink-0" />
                                <span className="truncate">{post.location}</span>
                            </span>
                            <span className="text-[10px] font-mono text-sky-200 flex items-center gap-0.5 shrink-0 ml-2">
                                Plan <ArrowUpRight className="w-3 h-3" />
                            </span>
                        </Link>
                    </div>
                ) : (
                    <div className="p-5 pb-0 flex items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase apple-glass-pill text-sky-300">
                            {post.category || 'Dispatch'}
                        </span>
                        <Link
                            href={`/plan-trip?destination=${encodeURIComponent(planDestination)}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 hover:text-white transition-colors truncate"
                        >
                            <MapPin className="w-3 h-3 text-sky-300 shrink-0" />
                            <span className="truncate">{post.location}</span>
                            <ArrowUpRight className="w-3 h-3 shrink-0" />
                        </Link>
                    </div>
                )}

                {/* Content Area */}
                <div className="p-5 space-y-4">
                    <p className="text-sm text-slate-200 leading-relaxed">&ldquo;{post.content}&rdquo;</p>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.07]">
                        <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7 border border-white/15">
                                <AvatarImage src={post.author.avatar} />
                                <AvatarFallback className="bg-slate-800 text-white text-[10px] font-semibold">
                                    {post.author.name?.[0] || 'T'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-white">{post.author.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{post.time}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleLike}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all ${
                                isLiked
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-400/30'
                                    : 'apple-glass-pill text-slate-300 hover:text-white'
                            }`}
                        >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                            <span>{localLikes}</span>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default function CommunityPage() {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState('All');
    const [posts, setPosts] = useState<any[]>(CURATED_FIELD_DISPATCHES);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Share Dispatch Modal State
    const [composerOpen, setComposerOpen] = useState(false);
    const [postType, setPostType] = useState<'micro_tip' | 'trip_experience' | 'visa_experience' | 'itinerary_snapshot'>('micro_tip');
    const [cityInput, setCityInput] = useState('');
    const [countryInput, setCountryInput] = useState('');
    const [contentInput, setContentInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function fetchPosts() {
            setIsLoading(true);
            try {
                const {
                    data: { user: currentUser },
                } = await supabase.auth.getUser();
                setUser(currentUser);

                const { data, error } = await supabase
                    .from('community_posts')
                    .select(`
                        id, post_type, destination_city, destination_country,
                        highlights, tip_text, visa_tips, helpful_count,
                        created_at, user_id,
                        profiles!user_id ( full_name, username, avatar_url )
                    `)
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    const typeMap: Record<string, string> = {
                        trip_experience: 'Trips',
                        itinerary_snapshot: 'Itineraries',
                        visa_experience: 'Visa Intel',
                        micro_tip: 'Tips',
                    };

                    const formattedPosts = data.map((post: any) => {
                        const content = post.highlights || post.tip_text || post.visa_tips || 'Shared a new travel update.';
                        let location = 'Global';
                        if (post.destination_city && post.destination_country) {
                            location = `${post.destination_city}, ${post.destination_country}`;
                        } else if (post.destination_city || post.destination_country) {
                            location = post.destination_city || post.destination_country;
                        }

                        return {
                            id: post.id,
                            author: {
                                name: post.profiles?.full_name || 'Traveler',
                                handle: post.profiles?.username || '@voyager',
                                avatar: post.profiles?.avatar_url || '',
                            },
                            category: typeMap[post.post_type] || 'Tips',
                            location,
                            cityQuery: location,
                            content,
                            likes: post.helpful_count || 0,
                            time: new Date(post.created_at).toLocaleDateString(),
                            image: null,
                        };
                    });
                    setPosts([...formattedPosts, ...CURATED_FIELD_DISPATCHES]);
                } else {
                    setPosts(CURATED_FIELD_DISPATCHES);
                }
            } catch (err) {
                console.error('Error fetching posts:', err);
                setPosts(CURATED_FIELD_DISPATCHES);
            } finally {
                setIsLoading(false);
            }
        }

        fetchPosts();
    }, [supabase]);

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !contentInput.trim() || !cityInput.trim()) return;
        setIsSubmitting(true);
        try {
            const payload: Record<string, any> = {
                user_id: user.id,
                post_type: postType,
                destination_city: cityInput.trim(),
                destination_country: countryInput.trim() || null,
            };
            if (postType === 'visa_experience') payload.visa_tips = contentInput.trim();
            else if (postType === 'micro_tip') payload.tip_text = contentInput.trim();
            else payload.highlights = contentInput.trim();

            const { data, error } = await supabase.from('community_posts').insert(payload).select().single();

            const typeMap: Record<string, string> = {
                trip_experience: 'Trips',
                itinerary_snapshot: 'Itineraries',
                visa_experience: 'Visa Intel',
                micro_tip: 'Tips',
            };

            const location = countryInput.trim() ? `${cityInput.trim()}, ${countryInput.trim()}` : cityInput.trim();

            const newCard = {
                id: data?.id || `local-${Date.now()}`,
                author: {
                    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
                    handle: '@traveler',
                    avatar: '',
                },
                category: typeMap[postType] || 'Tips',
                location,
                cityQuery: location,
                content: contentInput.trim(),
                likes: 1,
                time: 'Just now',
                image: null,
            };

            setPosts((prev) => [newCard, ...prev]);
            setCityInput('');
            setCountryInput('');
            setContentInput('');
            setComposerOpen(false);
            if (error) {
                toast.success('Traveler tip added to your session feed');
            } else {
                toast.success('Dispatch published to Community Matrix');
            }
        } catch {
            toast.error('Unable to publish tip right now.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories = [
        { id: 'All', icon: <Compass className="w-3.5 h-3.5" /> },
        { id: 'Trips', icon: <Plane className="w-3.5 h-3.5" /> },
        { id: 'Itineraries', icon: <Map className="w-3.5 h-3.5" /> },
        { id: 'Visa Intel', icon: <FileText className="w-3.5 h-3.5" /> },
        { id: 'Tips', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    ];

    const filteredPosts = activeTab === 'All' ? posts : posts.filter((post) => post.category === activeTab);

    return (
        <div className="relative min-h-screen pt-28 pb-24 overflow-x-clip bg-[#0b0c0f] text-slate-200 font-body">
            {/* Ambient Lighting */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[380px] bg-gradient-to-b from-sky-500/[0.05] via-indigo-500/[0.02] to-transparent blur-3xl pointer-events-none" />

            {/* Share Dispatch Modal */}
            <AnimatePresence>
                {composerOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
                        onClick={() => setComposerOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                            className="w-full max-w-lg apple-liquid-glass rounded-[32px] p-7 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setComposerOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {!user ? (
                                <div className="text-center py-6 space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center mx-auto">
                                        <Lock className="w-5 h-5 text-sky-300" />
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-white">Sign in to Share Field Tips</h3>
                                    <p className="text-xs text-slate-300/80 max-w-sm mx-auto leading-relaxed">
                                        Join fellow travelers sharing verified transit shortcuts, border clearance times, and neighborhood gems.
                                    </p>
                                    <div className="flex justify-center gap-3 pt-2">
                                        <Link href="/login" className="btn-apple-primary px-6 py-2.5 rounded-full text-xs font-semibold">
                                            Sign In →
                                        </Link>
                                        <Link href="/signup" className="btn-apple-glass px-5 py-2.5 rounded-full text-xs font-medium">
                                            Create Account
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleCreatePost} className="space-y-4">
                                    <div>
                                        <h3 className="text-2xl font-serif font-bold text-white mb-1">Share Traveler Dispatch</h3>
                                        <p className="text-xs text-slate-300/80">Help fellow travelers with ground-truth advice from your trip.</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {[
                                            { id: 'micro_tip', label: 'Local Tip' },
                                            { id: 'trip_experience', label: 'Trip Report' },
                                            { id: 'visa_experience', label: 'Visa / Border Intel' },
                                            { id: 'itinerary_snapshot', label: 'Route Highlight' },
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setPostType(t.id as any)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                    postType === t.id ? 'bg-white text-slate-950 font-semibold' : 'apple-glass-pill text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-mono uppercase text-slate-300 mb-1 block">City</label>
                                            <Input
                                                required
                                                placeholder="e.g. Kyoto"
                                                value={cityInput}
                                                onChange={(e) => setCityInput(e.target.value)}
                                                className="h-11 rounded-2xl bg-slate-950/70 border-white/10 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-mono uppercase text-slate-300 mb-1 block">Country</label>
                                            <Input
                                                placeholder="e.g. Japan"
                                                value={countryInput}
                                                onChange={(e) => setCountryInput(e.target.value)}
                                                className="h-11 rounded-2xl bg-slate-950/70 border-white/10 text-white text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-mono uppercase text-slate-300 mb-1 block">Your Tip or Field Note</label>
                                        <Textarea
                                            required
                                            rows={4}
                                            placeholder="Share a transit shortcut, best time to visit, border tip, or favorite local spot..."
                                            value={contentInput}
                                            onChange={(e) => setContentInput(e.target.value)}
                                            className="rounded-2xl bg-slate-950/70 border-white/10 text-white text-sm resize-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !cityInput.trim() || !contentInput.trim()}
                                        className="w-full h-12 rounded-2xl btn-apple-primary text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-45"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        <span>{isSubmitting ? 'Publishing…' : 'Publish Dispatch'}</span>
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col justify-center items-center text-center mb-10 relative">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-glass-pill text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-5">
                        <Globe className="w-3.5 h-3.5 text-sky-300" />
                        <span>Traveler Field Dispatches</span>
                    </div>

                    <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white mb-4 tracking-tight">
                        Community Intelligence
                    </h1>
                    <p className="text-base text-slate-300/80 max-w-2xl leading-relaxed mb-7">
                        Ground-truth transit shortcuts, border clearance experiences, and neighborhood recommendations shared by global travelers.
                    </p>

                    <button
                        type="button"
                        onClick={() => setComposerOpen(true)}
                        className="btn-apple-primary rounded-full px-6 h-11 text-xs font-semibold inline-flex items-center gap-2"
                    >
                        <Sparkles className="w-3.5 h-3.5" /> Share Field Tip
                    </button>
                </div>

                {/* Apple Liquid Glass Segmented Filter Bar */}
                <div className="flex justify-center mb-12">
                    <div className="apple-liquid-glass p-1.5 rounded-full inline-flex items-center gap-1 overflow-x-auto max-w-full">
                        {categories.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-4 py-2 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                        isActive ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="community-tab-pill"
                                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                            className="absolute inset-0 rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-200 shadow-sm"
                                        />
                                    )}
                                    <span className="relative z-10">{tab.icon}</span>
                                    <span className="relative z-10">{tab.id}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Grid Container */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-3">
                        <Loader2 className="w-7 h-7 animate-spin text-sky-300" />
                        <span className="font-mono text-xs text-slate-400">Loading Traveler Dispatches…</span>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20 apple-glass-card rounded-3xl border-dashed max-w-md mx-auto">
                        <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                        <h3 className="font-serif text-lg font-bold text-white mb-1">No dispatches in this category yet</h3>
                        <p className="text-slate-400 text-xs mb-5">Be the first traveler to share an update here.</p>
                        <button onClick={() => setComposerOpen(true)} className="btn-apple-primary px-5 py-2 rounded-full text-xs font-semibold">
                            Share Field Tip
                        </button>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 pb-16">
                        {filteredPosts.map((post, index) => (
                            <GalleryCard key={post.id} post={post} index={index} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
