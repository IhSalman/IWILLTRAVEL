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
        <section className="relative py-16 px-4 md:px-12 text-center bg-transparent">
            
            <div className="max-w-3xl mx-auto relative z-10 space-y-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-blue-200 text-sm font-bold tracking-widest uppercase mb-4"
                >
                    <Compass className="w-4 h-4" /> The Travel Dispatch
                </motion.div>

                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                    Insider Itineraries & <span className="text-blue-400">Hidden Gems</span>
                </h2>
                
                <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                    Join thousands of smart travelers. Get weekly AI-curated travel reports, destination deep-dives, and exclusive tips delivered to your inbox.
                </p>

                {!success ? (
                    <motion.form 
                        onSubmit={handleSubscribe}
                        className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto mt-10"
                    >
                        <div className="relative flex-grow group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                            <Input 
                                type="email"
                                placeholder="Enter your email address..."
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-14 pl-12 bg-white/10 border-white/20 focus:border-blue-400/50 focus:ring-blue-400/20 rounded-2xl text-white placeholder:text-slate-400 transition-all text-base"
                            />
                        </div>
                        <Button 
                            disabled={loading}
                            className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/50 group transition-all"
                        >
                            {loading ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                    <Send className="w-5 h-5" />
                                </motion.div>
                            ) : (
                                <>
                                    Subscribe <Send className="w-5 h-5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </motion.form>
                ) : (
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-6"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-white tracking-tight">Subscription Confirmed</h3>
                        <p className="text-slate-400">You're officially on the list. Check your inbox.</p>
                    </motion.div>
                )}

                <div className="pt-10 flex flex-wrap justify-center gap-6 md:gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Spam</span>
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> AI Insights</span>
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Weekly Drop</span>
                </div>
            </div>
        </section>
    );
}
