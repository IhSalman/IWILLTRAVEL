'use client';

import { usePathname, useRouter, Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, LogOut, ChevronDown, Menu, Star, ArrowRight,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const PRIMARY_LINKS = [
    { href: '/plan-trip', label: 'Plan a trip' },
    { href: '/discover', label: 'Destinations' },
    { href: '/blogs', label: 'Guides' },
    { href: '/pricing', label: 'Pricing' },
];

const TOOL_LINKS = [
    { href: '/visa-hub', label: 'Visa hub', note: 'Entry rules by passport' },
    { href: '/translate', label: 'Translate', note: 'Text, voice and menus' },
    { href: '/travel-research', label: 'Place research', note: 'Deep-dive any spot' },
    { href: '/community', label: 'Community', note: 'Notes from travellers' },
];

export function Wordmark({ className }: { className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-2 text-slate-100', className)}>
            <svg viewBox="-18 -10 32 20" className="h-3.5 w-5 text-sunrise-300 -rotate-12" fill="currentColor" aria-hidden="true">
                <path d="M 12 0 L -6 -2 L -10 -9 L -13 -9 L -10 -2 L -14 -1.5 L -16 -5 L -18 -5 L -17 0 L -18 5 L -16 5 L -14 1.5 L -10 2 L -13 9 L -10 9 L -6 2 Z" />
            </svg>
            <span className="font-heading text-[1.4rem] leading-none tracking-tight">
                iWill<em className="text-slate-400">Travel</em>
            </span>
        </span>
    );
}

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [toolsOpen, setToolsOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const toolsRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
            if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        setToolsOpen(false);
        setDropdownOpen(false);
    }, [pathname]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setDropdownOpen(false);
        router.push('/');
        router.refresh();
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const toolsActive = TOOL_LINKS.some(l => isActive(l.href));

    return (
        <header
            className={cn(
                'sticky top-0 z-50 w-full transition-[background-color,border-color] duration-300 border-b',
                scrolled ? 'bg-background/80 backdrop-blur-xl border-white/[0.07]' : 'bg-background/0 border-transparent'
            )}
        >
            <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                {/* Left: mobile menu + wordmark */}
                <div className="flex items-center gap-1">
                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <SheetTrigger asChild>
                            <button
                                type="button"
                                className="lg:hidden -ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-300 hover:bg-white/[0.06] hover:text-slate-100"
                                aria-label="Open menu"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] sm:w-[340px] flex flex-col bg-background border-r border-white/[0.08]">
                            <SheetHeader className="pb-6">
                                <SheetTitle className="text-left">
                                    <Wordmark />
                                </SheetTitle>
                            </SheetHeader>

                            <nav className="flex flex-col flex-1 overflow-y-auto">
                                {user && (
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setSheetOpen(false)}
                                        className={cn(
                                            'py-3 font-heading text-3xl transition-colors',
                                            isActive('/dashboard') ? 'text-sunrise-300' : 'text-slate-100 hover:text-sunrise-300'
                                        )}
                                    >
                                        My trips
                                    </Link>
                                )}
                                {PRIMARY_LINKS.map(({ href, label }) => (
                                    <Link
                                        key={href}
                                        href={href as any}
                                        onClick={() => setSheetOpen(false)}
                                        className={cn(
                                            'py-3 font-heading text-3xl transition-colors',
                                            isActive(href) ? 'text-sunrise-300' : 'text-slate-100 hover:text-sunrise-300'
                                        )}
                                    >
                                        {label}
                                    </Link>
                                ))}
                                <span className="eyebrow mt-8 mb-3">Tools</span>
                                {TOOL_LINKS.map(({ href, label }) => (
                                    <Link
                                        key={href}
                                        href={href as any}
                                        onClick={() => setSheetOpen(false)}
                                        className={cn(
                                            'py-2 text-sm transition-colors',
                                            isActive(href) ? 'text-sunrise-300' : 'text-slate-400 hover:text-slate-100'
                                        )}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </nav>

                            {!user ? (
                                <div className="grid grid-cols-2 gap-2 pt-6 border-t border-white/[0.08]">
                                    <Link href="/login" onClick={() => setSheetOpen(false)} className="btn-apple-glass h-11 rounded-full text-sm flex items-center justify-center">
                                        Sign in
                                    </Link>
                                    <Link href="/signup" onClick={() => setSheetOpen(false)} className="btn-apple-primary h-11 rounded-full text-sm flex items-center justify-center">
                                        Sign up
                                    </Link>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setSheetOpen(false);
                                        handleSignOut();
                                    }}
                                    className="pt-6 border-t border-white/[0.08] flex items-center gap-2 text-sm text-slate-400 hover:text-rose-300 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" /> Sign out
                                </button>
                            )}
                        </SheetContent>
                    </Sheet>

                    <Link href="/" aria-label="iWillTravel home">
                        <Wordmark />
                    </Link>
                </div>

                {/* Center: desktop navigation */}
                <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
                    {PRIMARY_LINKS.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href as any}
                            className={cn(
                                'relative px-3.5 py-2 text-[13px] transition-colors',
                                isActive(href) ? 'text-slate-100' : 'text-slate-400 hover:text-slate-100'
                            )}
                        >
                            {label}
                            {isActive(href) && (
                                <motion.span
                                    layoutId="nav-underline"
                                    className="absolute left-3.5 right-3.5 -bottom-0.5 h-px bg-sunrise-300"
                                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                                />
                            )}
                        </Link>
                    ))}

                    <div className="relative" ref={toolsRef}>
                        <button
                            type="button"
                            onClick={() => setToolsOpen(o => !o)}
                            aria-expanded={toolsOpen}
                            className={cn(
                                'flex items-center gap-1 px-3.5 py-2 text-[13px] transition-colors',
                                toolsActive || toolsOpen ? 'text-slate-100' : 'text-slate-400 hover:text-slate-100'
                            )}
                        >
                            Tools
                            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', toolsOpen && 'rotate-180')} />
                        </button>
                        <AnimatePresence>
                            {toolsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-2xl apple-liquid-glass p-2"
                                >
                                    {TOOL_LINKS.map(({ href, label, note }) => (
                                        <Link
                                            key={href}
                                            href={href as any}
                                            className="block rounded-xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors"
                                        >
                                            <span className={cn('block text-sm', isActive(href) ? 'text-sunrise-300' : 'text-slate-100')}>
                                                {label}
                                            </span>
                                            <span className="block text-xs text-slate-500">{note}</span>
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </nav>

                {/* Right: language + account */}
                <div className="flex items-center gap-2">
                    <LanguageSwitcher />

                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(o => !o)}
                                className="flex items-center gap-2 rounded-full border border-white/[0.1] py-1 pl-1 pr-2.5 text-xs text-slate-200 hover:border-white/25 transition-colors"
                            >
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sunrise-300 text-[11px] font-semibold text-background">
                                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                                </span>
                                <span className="hidden sm:inline max-w-[96px] truncate">
                                    {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                                </span>
                                <ChevronDown className={cn('h-3.5 w-3.5 text-slate-500 transition-transform', dropdownOpen && 'rotate-180')} />
                            </button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 4 }}
                                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                                        className="absolute right-0 mt-2 w-56 rounded-2xl apple-liquid-glass p-1.5 z-50"
                                    >
                                        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-100 hover:bg-white/[0.05]">
                                            <LayoutDashboard className="h-4 w-4 text-slate-400" /> My trips
                                        </Link>
                                        <Link href="/pricing" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-100 hover:bg-white/[0.05]">
                                            <span className="flex items-center gap-2.5">
                                                <Star className="h-4 w-4 text-slate-400" /> Plan
                                            </span>
                                            <span className="rounded-full border border-white/[0.12] px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                                                {user?.user_metadata?.plan || 'Free'}
                                            </span>
                                        </Link>
                                        <div className="my-1 border-t border-white/[0.07]" />
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[0.05] hover:text-rose-300"
                                        >
                                            <LogOut className="h-4 w-4" /> Sign out
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="hidden sm:flex items-center gap-1">
                            <Link href="/login" className="px-3 py-2 text-[13px] text-slate-400 hover:text-slate-100 transition-colors">
                                Sign in
                            </Link>
                            <Link
                                href="/plan-trip"
                                className="btn-apple-primary h-9 rounded-full px-4 text-[13px] inline-flex items-center gap-1.5"
                            >
                                Start planning <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
