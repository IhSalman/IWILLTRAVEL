'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, MessageSquare, Share2, MapPin, Map, Plane, FileText, Lightbulb, Loader2, Sparkles, Heart } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// Aurora Background component
const AuroraBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#03080F]">
        <motion.div
            className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[100px] bg-gradient-to-tr from-[#FF007F]/20 to-[#FF8C00]/20"
            animate={{
                x: [0, 50, 0],
                y: [0, 30, 0],
                scale: [1, 1.1, 1],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
            className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[120px] bg-gradient-to-bl from-[#00D4FF]/20 to-[#6366F1]/20"
            animate={{
                x: [0, -40, 0],
                y: [0, -40, 0],
                scale: [1, 1.2, 1],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
    </div>
);

// Polaroid Post Component
const PolaroidCard = ({ post, index, onLike }: { post: any; index: number; onLike?: (id: any) => void }) => {
    const [likeBursts, setLikeBursts] = useState<number[]>([]);
    const [localLikes, setLocalLikes] = useState<number>(post.likes);
    const [isHovered, setIsHovered] = useState(false);

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        const id = Date.now();
        setLikeBursts((prev: number[]) => [...prev, id]);
        setLocalLikes((prev: number) => prev + 1);
        onLike && onLike(post.id);
        
        setTimeout(() => {
            setLikeBursts((prev: number[]) => prev.filter(b => b !== id));
        }, 1500);
    };

    // Calculate a random slight rotation for the polaroid based on index to make it look scattered
    const baseRotation = (index % 5 - 2) * 3; // -6 to +6 degrees

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, rotateZ: baseRotation - 10 }}
            animate={{ opacity: 1, y: 0, rotateZ: baseRotation }}
            whileHover={{ scale: 1.05, rotateZ: 0, zIndex: 50, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative transform-style-3d group perspective-1000 w-full mb-8 inline-block"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The Polaroid */}
            <div className="bg-[#fcfcfc] p-4 pb-6 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/50 transition-shadow duration-500 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative z-10 before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-tr before:from-transparent before:via-white/20 before:to-transparent before:pointer-events-none before:opacity-0 group-hover:before:opacity-100 before:transition-opacity">
                
                {/* Image Area - Either an actual image or a colorful gradient placeholder based on location */}
                <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden relative mb-4 shadow-inner">
                    {post.image ? (
                        <img src={post.image} alt="Travel" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#1a1c29] to-[#0a0c10]">
                            {/* Abstract landscape representation */}
                            <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                            <MapPin className="w-12 h-12 text-white/20 mb-4" />
                            <h3 className="text-xl font-bold text-white/50 uppercase tracking-widest">{post.location}</h3>
                        </div>
                    )}
                    
                    {/* Hover Overlay for Interactions */}
                    <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center gap-4 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="rounded-full w-12 h-12 bg-white/20 hover:bg-[#FF007F]/80 border border-white/30 text-white shadow-xl transition-all hover:scale-110"
                            onClick={handleLike}
                        >
                            <Heart className={`w-5 h-5 ${likeBursts.length > 0 ? 'fill-current text-white' : ''}`} />
                        </Button>
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="rounded-full w-12 h-12 bg-white/20 hover:bg-[#00D4FF]/80 border border-white/30 text-white shadow-xl transition-all hover:scale-110"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Like Bursts Animation container */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
                        <AnimatePresence>
                            {likeBursts.map(id => (
                                <motion.div
                                    key={id}
                                    initial={{ scale: 0, opacity: 1, y: 0 }}
                                    animate={{ 
                                        scale: [1, 1.5, 2, 2.5], 
                                        opacity: [1, 0.8, 0],
                                        y: -100,
                                        x: (Math.random() - 0.5) * 100
                                    }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="absolute"
                                >
                                    <Heart className="w-12 h-12 text-[#FF007F] fill-current filter drop-shadow-[0_0_10px_rgba(255,0,127,0.8)]" />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Polaroid Text Area */}
                <div className="space-y-3 px-2">
                    <p className="font-mono text-gray-800 font-medium leading-relaxed min-h-[60px] text-sm">
                        "{post.content.length > 120 ? post.content.substring(0, 120) + '...' : post.content}"
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                        <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8 ring-2 ring-gray-100 shadow-sm">
                                <AvatarImage src={post.author.avatar} />
                                <AvatarFallback className="bg-gray-200 text-gray-800 text-xs font-bold">{post.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900">{post.author.name}</span>
                                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">{post.time}</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF007F] px-2 py-0.5 rounded-sm bg-[#FF007F]/10">
                                {post.category}
                            </span>
                            <div className="flex items-center gap-1 mt-1 text-gray-400 text-[10px] font-bold">
                                <Heart className="w-3 h-3" /> {localLikes}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Vintage tape top center */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/40 backdrop-blur-md rotate-[-2deg] shadow-sm border border-white/20" />
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
                        profiles ( full_name, username, avatar_url )
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
            <AuroraBackground />

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
                                    <PolaroidCard 
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
