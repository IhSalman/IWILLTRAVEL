'use client';

import { usePathname, useRouter, Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plane, Compass, Users, FileText, Languages, LayoutDashboard, LogOut, ChevronDown, Menu, Search, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations('Navbar');
    const [user, setUser] = useState<any>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setDropdownOpen(false);
        router.push('/');
        router.refresh();
    };

    const links = [
        { href: '/discover', label: t('links.discover'), icon: Compass },
        { href: '/plan-trip', label: t('links.planTrip'), icon: Plane },
        { href: '/travel-research', label: t('links.travelResearch'), icon: Search },
        { href: '/blogs', label: t('links.blogs'), icon: FileText },
        { href: '/community', label: t('links.community'), icon: Users },
        { href: '/visa-hub', label: t('links.visaHub'), icon: FileText },
        { href: '/translate', label: t('links.translate'), icon: Languages },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center space-x-2">
                    {/* Side Menu Toggle - visible on all screens */}
                    <div className="flex items-center">
                        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:mr-2">
                                    <Menu className="h-6 w-6" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] sm:w-[400px] flex flex-col">
                                <SheetHeader>
                                    <SheetTitle className="text-left font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent inline-block">
                                        iWillTravel
                                    </SheetTitle>
                                </SheetHeader>
                                <nav className="flex flex-col space-y-4 mt-8 flex-1">
                                    {user && (
                                        <Link
                                            href="/dashboard"
                                            className={cn(
                                                "flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
                                                pathname === "/dashboard"
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                            onClick={() => setSheetOpen(false)}
                                        >
                                            <LayoutDashboard className="h-5 w-5" />
                                            <span>{t('dashboard')}</span>
                                        </Link>
                                    )}
                                    {links.map(({ href, label, icon: Icon }) => {
                                        const isActive = pathname.startsWith(href);
                                        return (
                                            <Link
                                                key={href}
                                                href={href as any}
                                                className={cn(
                                                    "flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
                                                    isActive
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                                onClick={() => setSheetOpen(false)}
                                            >
                                                <Icon className="h-5 w-5" />
                                                <span>{label}</span>
                                            </Link>
                                        );
                                    })}
                                    {user && (
                                        <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-2">
                                            <Link
                                                href="/pricing"
                                                onClick={() => setSheetOpen(false)}
                                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted text-foreground text-base border-transparent border transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Star className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                                                    <span className="font-semibold text-amber-500">Subscription</span>
                                                </div>
                                                <div className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                                                    {user?.user_metadata?.plan || 'Free'}
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    setSheetOpen(false);
                                                    handleSignOut();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive text-base font-medium transition-all"
                                            >
                                                <LogOut className="h-5 w-5" />
                                                {t('signOut')}
                                            </button>
                                        </div>
                                    )}
                                </nav>
                                {!user && (
                                    <div className="grid grid-cols-2 gap-3 pt-6 border-t mt-auto">
                                        <Link href="/login" className="w-full" onClick={() => setSheetOpen(false)}>
                                            <Button variant="outline" className="w-full rounded-xl">{t('logIn')}</Button>
                                        </Link>
                                        <Link href="/signup" className="w-full" onClick={() => setSheetOpen(false)}>
                                            <Button className="w-full rounded-xl bg-primary">{t('signUp')}</Button>
                                        </Link>
                                    </div>
                                )}
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link href="/" className="flex items-center space-x-2 transition-transform hover:scale-105 active:scale-95">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <Plane className="h-6 w-6 text-primary" strokeWidth={2.5} />
                        </div>
                        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent hidden sm:inline-block">
                            iWillTravel
                        </span>
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center space-x-1">
                    {links.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href as any}
                                className={cn(
                                    "flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center space-x-2 md:space-x-4">
                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(o => !o)}
                                className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
                            >
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                                </div>
                                <span className="hidden sm:inline max-w-[100px] truncate">
                                    {user.user_metadata?.full_name || user.email}
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-card border border-border/50 rounded-2xl shadow-xl p-1.5 z-50">
                                    <Link href="/dashboard" onClick={() => setDropdownOpen(false)}>
                                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-muted text-sm cursor-pointer">
                                            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                                            {t('dashboard')}
                                        </div>
                                    </Link>
                                    <Link href="/pricing" onClick={() => setDropdownOpen(false)}>
                                        <div className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl hover:bg-amber-500/10 text-sm cursor-pointer group transition-colors">
                                            <div className="flex items-center gap-2.5 text-amber-500 font-medium">
                                                <Star className="h-4 w-4 fill-amber-500/20" />
                                                Subscription
                                            </div>
                                            <div className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                                {user?.user_metadata?.plan || 'Free'}
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="my-1 border-t border-border/50" />
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-destructive text-sm"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        {t('signOut')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="hidden sm:flex items-center space-x-2">
                            <Link href="/login">
                                <Button variant="ghost" className="rounded-full">{t('logIn')}</Button>
                            </Link>
                            <Link href="/signup">
                                <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">{t('signUp')}</Button>
                            </Link>
                        </div>
                    )}
                    <LanguageSwitcher />
                </div>
            </div>
        </header>
    );
}
