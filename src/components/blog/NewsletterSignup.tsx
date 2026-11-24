'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send, CheckCircle2, Compass } from 'lucide-react';
import { toast } from 'sonner';

export default function NewsletterSignup() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setSuccess(true);
                toast.success('Welcome to the inner circle! Check your inbox soon.');
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
        <section className="relative py-12 px-4 md:px-12 text-center bg-transparent">
            <div className="max-w-2xl mx-auto relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full card-3d-minimal text-[11px] font-mono uppercase tracking-wider text-slate-300">
                    <Compass className="w-3.5 h-3.5 text-slate-400" />
                    <span>The Travel Dispatch</span>
                </div>

                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-gradient-platinum leading-tight">
                    Insider Routes & Hidden Topography
                </h2>
                
                <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto font-light leading-relaxed">
                    Autonomous travel dossiers, flight pricing arbitrage, and unmapped locales delivered to your inbox weekly.
                </p>

                {!success ? (
                    <motion.form 
                        onSubmit={handleSubscribe}
                        className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-4"
                    >
                        <div className="relative flex-grow">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input 
                                type="email"
                                placeholder="Enter your email address..."
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11 pl-10 bg-slate-900/60 border-white/10 rounded-full text-slate-200 placeholder:text-slate-600 text-xs focus:border-white/20 focus:ring-0"
                            />
                        </div>
                        <Button 
                            disabled={loading}
                            className="h-11 px-6 rounded-full btn-3d-minimal text-xs font-medium inline-flex items-center justify-center gap-2 shrink-0"
                        >
                            {loading ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                    <Send className="w-4 h-4" />
                                </motion.div>
                            ) : (
                                <>
                                    Subscribe <Send className="w-3.5 h-3.5" />
                                </>
                            )}
                        </Button>
                    </motion.form>
                ) : (
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-3 py-4"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h3 className="font-serif text-xl font-normal text-slate-200">Subscription Confirmed</h3>
                        <p className="text-xs text-slate-400 font-light">You are registered in the dispatch queue.</p>
                    </motion.div>
                )}

                <div className="pt-6 flex flex-wrap justify-center gap-6 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70" /> Zero Noise</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70" /> Multi-Agent Intel</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70" /> Weekly Synthesis</span>
                </div>
            </div>
        </section>
    );
}
