'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send, CheckCircle2, MapPin, Download, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export function JapanLeadMagnet() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            const res = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, lead_magnet: 'japan_7_day' }),
            });

            if (res.ok) {
                setSuccess(true);
                toast.success('Awesome! Your guide is ready.');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Something went wrong.');
            }
        } catch (error) {
            toast.error('Failed to subscribe. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="relative py-24 px-4 overflow-hidden" style={{ background: '#0b0c0f' }}>
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: 'radial-gradient(circle at 80% 50%, rgba(236,72,153,0.08) 0%, transparent 60%)' }} />
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: 'radial-gradient(circle at 20% 50%, rgba(243,184,127,0.05) 0%, transparent 60%)' }} />

            <div className="max-w-5xl mx-auto relative z-10 bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-md overflow-hidden">
                <div className="grid md:grid-cols-2 gap-10 items-center">
                    {/* Left: Copy */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6"
                            style={{ background: 'rgba(236,72,153,0.15)', color: '#F472B6', border: '1px solid rgba(236,72,153,0.3)' }}
                        >
                            <MapPin className="w-3.5 h-3.5" /> Free Insider Guide
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight text-white"
                        >
                            The Ultimate 7-Day <br />
                            <span style={{ background: 'linear-gradient(90deg, #F472B6, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Japan Itinerary
                            </span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-slate-300 text-lg mb-8"
                        >
                            Skip the tourist traps. Get our highly optimized guide for Tokyo, Kyoto, & Osaka, including hidden spots, budget tips, and transit hacks.
                        </motion.p>

                        <ul className="space-y-3 mb-8">
                            {['Tokyo hidden alleys & food guide', 'Kyoto temple routing (avoid crowds)', 'Osaka street food map', 'Bullet train (JR Pass) strategy'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-300 text-sm font-medium">
                                    <CheckCircle2 className="w-5 h-5 text-pink-400 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right: Form / Success state */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-indigo-500/20 blur-3xl -z-10 rounded-full" />
                        
                        <div className="bg-[#0b0c0f]/80 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                            <AnimatePresence mode="wait">
                                {!success ? (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onSubmit={handleSubscribe}
                                        className="flex flex-col gap-4"
                                    >
                                        <div className="text-center mb-4">
                                            <h3 className="text-xl font-bold text-white mb-2">Where should we send it?</h3>
                                            <p className="text-sm text-slate-400">Join 12,000+ smart travelers. Unsubscribe anytime.</p>
                                        </div>

                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-pink-400 transition-colors" />
                                            <Input
                                                type="email"
                                                placeholder="Your best email address"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="h-14 pl-12 bg-white/5 border-white/20 focus:border-pink-400/50 focus:ring-pink-400/20 rounded-xl text-white placeholder:text-slate-400 text-base"
                                            />
                                        </div>
                                        
                                        <Button
                                            disabled={loading}
                                            className="h-14 w-full text-base font-bold rounded-xl relative overflow-hidden group shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all"
                                            style={{ background: 'linear-gradient(135deg, #EC4899, #6366F1)', color: 'white', border: 'none' }}
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                {loading ? (
                                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                                        <Send className="w-5 h-5" />
                                                    </motion.div>
                                                ) : (
                                                    <>
                                                        Get The Guide Now <Send className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                    </>
                                                )}
                                            </span>
                                        </Button>
                                    </motion.form>
                                ) : (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-6 flex flex-col items-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">You're in!</h3>
                                        <p className="text-slate-400 text-sm mb-6 max-w-[250px] mx-auto">
                                            We've added you to the list. You can view the full guide right now.
                                        </p>
                                        <Link href="/blogs/japan-7-day-itinerary">
                                            <Button 
                                                className="h-12 px-6 rounded-xl font-bold text-slate-900 bg-white hover:bg-slate-100 transition-colors"
                                            >
                                                <Download className="w-4 h-4 mr-2" /> Read The Guide
                                            </Button>
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
