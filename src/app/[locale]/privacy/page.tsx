import { Shield } from 'lucide-react';
import { Link } from '@/i18n/routing';

export const metadata = {
    title: 'Privacy Policy | iWillTravel',
    description: 'How iWillTravel protects your traveler profile, itineraries, and personal data.',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-200 py-20 px-4 font-body">
            <div className="container max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-glass-pill text-xs font-mono text-sky-300 mb-6">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Privacy & Data Stewardship</span>
                </div>

                <h1 className="font-heading text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
                    Privacy Policy
                </h1>
                <p className="text-sm text-slate-400 mb-10 font-mono">
                    Last updated: May 2026 · iWillTravel (iwilltravel.app)
                </p>

                <div className="apple-glass-card rounded-[28px] p-8 md:p-10 space-y-8 text-sm text-slate-300 leading-relaxed">
                    <section className="space-y-2.5">
                        <h2 className="text-lg font-semibold text-white">1. Data We Collect</h2>
                        <p>
                            When you use iWillTravel, we collect only the information needed to plan and save your journeys:
                            your account email and display name (via Supabase Authentication), trip preferences (destination,
                            dates, budget tier, pace, and interests), and saved itineraries or community field reports you
                            explicitly choose to publish.
                        </p>
                    </section>

                    <section className="space-y-2.5">
                        <h2 className="text-lg font-semibold text-white">2. How AI & Live Travel APIs Process Requests</h2>
                        <p>
                            To generate grounded itineraries, visa checks, and translations, destination queries—never your
                            private email or password—are sent to our AI orchestration providers (Google Gemini / OpenRouter),
                            Google Maps Platform (Places, Routes, Weather, Air Quality), and Amadeus travel inventory APIs.
                        </p>
                    </section>

                    <section className="space-y-2.5">
                        <h2 className="text-lg font-semibold text-white">3. Storage, Security & Row-Level Isolation</h2>
                        <p>
                            Your saved itineraries and profile settings are stored in Supabase Postgres protected by Row-Level
                            Security (RLS) policies so only your authenticated session can read, modify, or delete your private
                            trips. All traffic is encrypted over TLS.
                        </p>
                    </section>

                    <section className="space-y-2.5">
                        <h2 className="text-lg font-semibold text-white">4. No Sale of Personal Data</h2>
                        <p>
                            We do not sell, rent, or trade your personal information to data brokers or advertisers. You may
                            delete saved itineraries directly from your{' '}
                            <Link href="/dashboard" className="text-sky-300 hover:underline">Dashboard</Link> or request full
                            account deletion at any time by contacting{' '}
                            <a href="mailto:hello@iwilltravel.app" className="text-sky-300 hover:underline">hello@iwilltravel.app</a>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
