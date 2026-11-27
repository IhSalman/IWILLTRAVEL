'use client';

import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import {
    readCheckoutIntent,
    checkoutResumePath,
    checkoutIntentQuery,
    type CheckoutIntent,
} from '@/lib/checkout-client';
import { motion } from 'framer-motion';
import { Compass, Mail, Lock, User, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';

export default function SignupPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    // Paid plan chosen on the pricing page (?plan=pro&billing=monthly) — resumed after signup.
    const [checkoutIntent, setCheckoutIntent] = useState<CheckoutIntent | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        setCheckoutIntent(readCheckoutIntent(window.location.search));
    }, []);

    const afterAuthPath = checkoutIntent ? checkoutResumePath(checkoutIntent) : '/dashboard';
    const loginHref = checkoutIntent ? `/login${checkoutIntentQuery(checkoutIntent)}` : '/login';

    const passwordStrength =
        password.length === 0 ? 0 :
            password.length < 6 ? 1 :
                password.length < 10 ? 2 : 3;

    const strengthColors = ['', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400'];
    const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setIsLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
                emailRedirectTo: `${window.location.origin}${afterAuthPath}`,
            },
        });

        if (error) {
            setError(error.message);
            setIsLoading(false);
        } else if (data.session) {
            // Email confirmation disabled: user is signed in right away.
            router.push(afterAuthPath);
            router.refresh();
        } else {
            setSuccess(true);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0b0c0f] text-slate-100 font-body flex items-center justify-center px-4 py-16 relative overflow-x-clip">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-sky-500/[0.08] via-emerald-500/[0.03] to-transparent blur-3xl pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center apple-glass-card rounded-[28px] p-8 sm:p-10 relative z-10 space-y-5"
                >
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                        <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <h2 className="font-heading text-2xl font-semibold text-white">Verify Your Email</h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        We sent an activation link to <span className="text-white font-semibold font-mono">{email}</span>. Click it to activate your free traveler account.
                    </p>
                    <div className="pt-2">
                        <Link href={loginHref}>
                            <button className="w-full h-12 rounded-full btn-apple-primary text-sm">
                                Continue to Sign In
                            </button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-100 font-body flex items-center justify-center px-4 py-16 relative overflow-x-clip">
            {/* Ambient Lighting */}
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
                        Create Your Account
                    </h1>
                    <p className="text-xs text-slate-400">
                        Plan 2 complete AI itineraries every month, save trips, and unlock border & research tools.
                    </p>
                </div>

                {/* Card */}
                <div className="apple-glass-card rounded-[28px] p-7 sm:p-8 space-y-6">
                    <form onSubmit={handleSignup} className="space-y-4">
                        {error && (
                            <div className="flex items-start gap-2.5 text-xs text-rose-200 bg-rose-500/12 border border-rose-500/25 rounded-2xl p-3.5">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-rose-400" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs font-mono uppercase tracking-wider text-slate-300">Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Alex Rivera"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="pl-10 h-12 rounded-2xl bg-slate-950/70 border-white/12 text-white placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-sky-400/50"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-slate-300">Email Address</Label>
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
                            <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-slate-300">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="At least 6 characters"
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
                            {password.length > 0 && (
                                <div className="space-y-1 pt-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3].map(i => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-white/10'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-400">
                                        {strengthLabels[passwordStrength]} password strength
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm" className="text-xs font-mono uppercase tracking-wider text-slate-300">Confirm Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="confirm"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`pl-10 h-12 rounded-2xl bg-slate-950/70 border-white/12 text-white placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-sky-400/50 ${confirmPassword && confirmPassword !== password ? 'border-rose-500/60' : ''}`}
                                    required
                                />
                            </div>
                            {confirmPassword && confirmPassword !== password && (
                                <p className="text-[11px] font-mono text-rose-400">Passwords do not match</p>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                className="w-full h-12 rounded-full text-sm btn-apple-primary inline-flex items-center justify-center gap-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating Account…</>
                                ) : (
                                    <>Create Free Account <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>

                        <p className="text-[11px] text-center text-slate-500 pt-1">
                            By creating an account, you agree to our{' '}
                            <Link href="/terms" className="text-slate-300 hover:text-white underline underline-offset-2">Terms</Link>{' '}
                            and{' '}
                            <Link href="/privacy" className="text-slate-300 hover:text-white underline underline-offset-2">Privacy Policy</Link>.
                        </p>
                    </form>

                    {/* Divider */}
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/[0.08]" />
                        </div>
                        <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                            <span className="bg-[#121317] px-3">Already have an account?</span>
                        </div>
                    </div>

                    <Link href={loginHref} className="block">
                        <button
                            type="button"
                            className="w-full h-11 rounded-full text-xs font-medium btn-apple-glass"
                        >
                            Sign In Instead
                        </button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
