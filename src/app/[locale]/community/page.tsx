'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, MessageSquare, Share2, MapPin, Map, Plane, FileText, Lightbulb, Loader2, Sparkles, Heart, Globe, Navigation2, Compass } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// Ethereal Environment Background Component
const EtherealEnvironment = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#03080F]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(13,162,231,0.05),transparent_70%)]" />
        <motion.div
            className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-screen filter blur-[120px] bg-gradient-to-tr from-[#0da2e7]/10 via-transparent to-transparent"
            animate={{
                x: [0, 30, 0],
                y: [0, 50, 0],
                rotate: [0, 45, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
            className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[150px] bg-gradient-to-bl from-[#6366F1]/10 via-transparent to-transparent"
            animate={{
                x: [0, -50, 0],
                y: [0, -30, 0],
                rotate: [0, -45, 0],
            }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear', delay: 2 }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay" />
    </div>
);

// Premium Gallery Card Component
const PremiumGalleryCard = ({ post, index }: { post: any; index: number }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [localLikes, setLocalLikes] = useState<number>(post.likes || 0);

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLiked(!isLiked);
        setLocalLikes(prev => isLiked ? prev - 1 : prev + 1);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative group break-inside-avoid mb-8"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] group-hover:-translate-y-2">
                {/* Image / Gradient Section */}
                <div className="relative aspect-[4/5] overflow-hidden">
                    {post.image ? (
                        <img 
                            src={post.image} 
                            alt={post.location} 
                            className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#1a1c29] via-[#0a0c10] to-[#03080f] flex flex-col items-center justify-center p-8 text-center">
                            <Compass className="w-12 h-12 text-primary/20 mb-4 animate-pulse" />
                            <h3 className="text-xl font-medium text-white/40 tracking-widest uppercase">{post.location}</h3>
                        </div>
                    )}
                    
                    {/* Glass Overlay on Hover */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
                    
                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        <div className="glass-premium px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-white/80">
                            {post.category || 'Trip'}
                        </div>
                    </div>

                    {/* Interaction Buttons Overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center gap-4 transition-all duration-500 transform ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className={`rounded-full w-12 h-12 glass-premium hover:bg-white/20 border-white/20 transition-all ${isLiked ? 'text-[#FF007F] scale-110' : 'text-white'}`}
                            onClick={handleLike}
                        >
                            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                        </Button>
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="rounded-full w-12 h-12 glass-premium hover:bg-white/20 border-white/20 text-white"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8 border border-white/10 ring-2 ring-[#00D4FF]/20">
                                <AvatarImage src={post.author.avatar} />
                                <AvatarFallback className="bg-white/10 text-white text-xs">{post.author.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white/90">{post.author.name}</span>
                                <span className="text-[10px] text-white/40 uppercase tracking-tighter">{post.time}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-bold">
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-[#FF007F] fill-current' : ''}`} />
                            <span>{localLikes}</span>
                        </div>
                    </div>

                    <p className="text-sm text-white/70 leading-relaxed line-clamp-3 font-medium italic">
                        "{post.content}"
                    </p>

                    <div className="flex items-center gap-2 text-[#00D4FF] text-[10px] font-bold uppercase tracking-widest pt-2">
                        <MapPin className="w-3 h-3" />
                        <span>{post.location}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default function CommunityPage() {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState('All');
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Mouse tracking for 3D Wall perspective
    const containerRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth physics for mouse movement
    const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400 });
    const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400 });

    // Transform mouse position into 3D rotation angles
    const rotateX = useTransform(smoothY, [-0.5, 0.5], [5, -5]);
    const rotateY = useTransform(smoothX, [-0.5, 0.5], [-5, 5]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        // Calculate relative position -0.5 to 0.5
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    useEffect(() => {
        async function fetchPosts() {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('community_posts')
                    .select(`
                        id, post_type, destination_city, destination_country,
                        highlights, tip_text, visa_tips, helpful_count,
                        created_at, user_id,
                        profiles!user_id ( full_name, username, avatar_url )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    const formattedPosts = data.map((post: any) => {
                        let content = post.highlights || post.tip_text || post.visa_tips || 'Shared a new travel update.';
                        let location = 'Anywhere';
                        if (post.destination_city && post.destination_country) {
                            location = `${post.destination_city}, ${post.destination_country}`;
                        } else if (post.destination_city || post.destination_country) {
                            location = post.destination_city || post.destination_country;
                        }

                        const typeMap: Record<string, string> = {
                            'trip_experience': 'Trips',
                            'itinerary_snapshot': 'Itineraries',
                            'visa_experience': 'Visa Intel',
                            'micro_tip': 'Tips'
                        };

                        return {
                            id: post.id,
                            author: {
                                name: post.profiles?.full_name || 'Anonymous Traveler',
                                handle: post.profiles?.username || '@traveler',
                                avatar: post.profiles?.avatar_url || 'https://i.pravatar.cc/150?u=anon'
                            },
                            category: typeMap[post.post_type] || 'General',
                            location: location,
                            content: content,
                            likes: post.helpful_count || 0,
                            comments: 0,
                            time: new Date(post.created_at).toLocaleDateString(),
                            image: null, // Would be fetched if supported
                        };
                    });
                    setPosts(formattedPosts);
                }
            } catch (err) {
                console.error("Error fetching posts:", err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchPosts();
    }, [supabase]);

    const filteredPosts = activeTab === 'All'
        ? posts
        : posts.filter(post => post.category === activeTab);

    return (
        <div 
            className="relative min-h-screen pt-24 pb-20 overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            ref={containerRef}
        >
            <EtherealEnvironment />

            {/* Content Container */}
            <div className="container max-w-7xl mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="flex flex-col justify-center items-center text-center mb-16 relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-20 h-20 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                    >
                        <Plane className="w-10 h-10 text-white" />
                    </motion.div>
                    
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/40 drop-shadow-sm">
                        THE GLOBE <span className="font-light italic">WALL</span>
                    </h1>
                    <p className="text-lg text-white/50 max-w-2xl font-light tracking-wide mb-8">
                        Explore polaroid snapshots of journeys, insider visa intel, and raw itineraries from travelers worldwide.
                    </p>

                    <Button className="rounded-full px-8 h-14 bg-white text-black hover:bg-white/90 font-black tracking-widest uppercase text-sm shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-all">
                        <Sparkles className="w-4 h-4 mr-2" /> Share Snapshot
                    </Button>
                </div>

                {/* Cyber Filter Tabs */}
                <Tabs defaultValue="All" className="mb-12 flex justify-center" onValueChange={setActiveTab}>
                    <div className="p-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md inline-flex overflow-x-auto max-w-full custom-scrollbar">
                        <TabsList className="bg-transparent h-12 flex items-center gap-1 shrink-0 p-0">
                            {[
                                { id: 'All', icon: null },
                                { id: 'Trips', icon: <Plane className="w-4 h-4 group-data-[state=active]:text-[#FF007F] transition-colors" /> },
                                { id: 'Itineraries', icon: <Map className="w-4 h-4 group-data-[state=active]:text-[#00D4FF] transition-colors" /> },
                                { id: 'Visa Intel', icon: <FileText className="w-4 h-4 group-data-[state=active]:text-[#00FFB3] transition-colors" /> },
                                { id: 'Tips', icon: <Lightbulb className="w-4 h-4 group-data-[state=active]:text-[#FFD700] transition-colors" /> }
                            ].map((tab) => (
                                <TabsTrigger 
                                    key={tab.id}
                                    value={tab.id} 
                                    className="group rounded-full px-6 h-full data-[state=active]:bg-white/10 data-[state=active]:shadow-inner font-bold tracking-widest uppercase text-[10px] text-white/50 data-[state=active]:text-white transition-all flex items-center gap-2"
                                >
                                    {tab.icon}
                                    {tab.id}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </Tabs>

                {/* 3D Floating Grid Container */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-white/50" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Developing Polaroids...</span>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-32">
                        <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                            <MessageSquare className="w-10 h-10 text-white/20" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 text-white">The board is empty</h3>
                        <p className="text-white/40 mb-8 font-light">Add the first memory to this category.</p>
                    </div>
                ) : (
                    <motion.div 
                        className="w-full transform-style-3d perspective-[2000px]"
                        style={{ rotateX, rotateY }}
                    >
                        {/* CSS Columns for Masonry Layout */}
                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8 pb-32">
                            <AnimatePresence>
                                {filteredPosts.map((post, index) => (
                                    <PremiumGalleryCard 
                                        key={post.id} 
                                        post={post} 
                                        index={index} 
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
            `}</style>
        </div>
    );
}
