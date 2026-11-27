'use client';

import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import {
    readCheckoutIntent,
    checkoutResumePath,
    checkoutIntentQuery,
    type CheckoutIntent,
} from '@/lib/checkout-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Mail, Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { useLocale } from 'next-intl';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetMode, setResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const router = useRouter();
    const locale = useLocale();
    const supabase = createClient();
    // Paid plan chosen on the pricing page — resume checkout after login.
    const [checkoutIntent, setCheckoutIntent] = useState<CheckoutIntent | null>(null);

    useEffect(() => {
        setCheckoutIntent(readCheckoutIntent(window.location.search));
    }, []);

    const signupHref = checkoutIntent ? `/signup${checkoutIntentQuery(checkoutIntent)}` : '/signup';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            setIsLoading(false);
        } else {
            router.push(checkoutIntent ? checkoutResumePath(checkoutIntent) : '/dashboard');
            router.refresh();
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address first.');
            return;
        }
        setIsLoading(true);
        setError('');

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/${locale}/dashboard`,
        });

        setIsLoading(false);
        if (error) {
            setError(error.message);
        } else {
            setResetSent(true);
        }
    };

    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-100 font-body flex items-center justify-center px-4 py-16 relative overflow-x-clip">
            {/* Ambient Spatial Lighting */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[820px] h-[380px] bg-gradient-to-b from-sky-500/[0.08] via-indigo-500/[0.03] to-transparent blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md relative z-10"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 rounded-2xl apple-liquid-glass flex items-center justify-center mb-4 text-sky-300">
                        <Compass className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <h1 className="font-heading text-3xl font-semibold text-white mb-2 tracking-tight">
                        {resetMode ? 'Reset Your Password' : 'Welcome Back'}
                    </h1>
                    <p className="text-xs text-slate-400">
                        {resetMode
                            ? 'Enter your email and we will send a secure recovery link.'
                            : 'Sign in to access your saved itineraries and AI travel workspace.'}
                    </p>
                </div>

                {/* Glass Card */}
                <div className="apple-glass-card rounded-[28px] p-7 sm:p-8 space-y-6">
                    <AnimatePresence mode="wait">
                        {resetMode ? (
                            <motion.form
                                key="reset"
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                                onSubmit={handlePasswordReset}
                                className="space-y-4"
                            >
                                {error && (
                                    <div className="flex items-start gap-2.5 text-xs text-rose-200 bg-rose-500/12 border border-rose-500/25 rounded-2xl p-3.5">
                                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-rose-400" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {resetSent ? (
                                    <div className="flex items-start gap-3 text-xs text-emerald-200 bg-emerald-500/12 border border-emerald-500/25 rounded-2xl p-4">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                                        <div>
                                            <p className="font-semibold text-white mb-1">Recovery link dispatched</p>
                                            <p className="text-slate-300 leading-relaxed">
                                                Check <span className="font-mono text-white">{email}</span> for instructions to set a new password.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="reset-email" className="text-xs font-mono uppercase tracking-wider text-slate-300">
                                            Email Address
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="reset-email"
                                                type="email"
                                                placeholder="you@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-10 h-12 rounded-2xl bg-slate-950/70 border-white/12 text-white placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-sky-400/50"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {!resetSent && (
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 rounded-full text-sm btn-apple-primary inline-flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Sending Link…</>
                                        ) : (
                                            <>Send Recovery Link <ArrowRight className="w-4 h-4" /></>
                                        )}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setResetMode(false);
                                        setResetSent(false);
                                        setError('');
                                    }}
                                    className="w-full h-10 rounded-full text-xs text-slate-300 hover:text-white inline-flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="login"
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12 }}
                                onSubmit={handleLogin}
                                className="space-y-4"
                            >
                                {error && (
                                    <div className="flex items-start gap-2.5 text-xs text-rose-200 bg-rose-500/12 border border-rose-500/25 rounded-2xl p-3.5">
                                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-rose-400" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-slate-300">
                                        Email Address
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 h-12 rounded-2xl bg-slate-950/70 border-white/12 text-white placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-sky-400/50"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-slate-300">
                                            Password
                                        </Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setResetMode(true);
                                                setError('');
                                            }}
                                            className="text-[11px] font-medium text-sky-300 hover:text-sky-200 transition-colors"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 h-12 rounded-2xl bg-slate-950/70 border-white/12 text-white placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-sky-400/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(s => !s)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        className="w-full h-12 rounded-full text-sm btn-apple-primary inline-flex items-center justify-center gap-2"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Signing In…</>
                                        ) : (
                                            <>Sign In <ArrowRight className="w-4 h-4" /></>
                                        )}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Divider */}
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/[0.08]" />
                        </div>
                        <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                            <span className="bg-[#121317] px-3">New to iWillTravel?</span>
                        </div>
                    </div>

                    <Link href={signupHref} className="block">
                        <button
                            type="button"
                            className="w-full h-11 rounded-full text-xs font-medium btn-apple-glass"
                        >
                            Create a Free Account (2 Trips / Month)
                        </button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
