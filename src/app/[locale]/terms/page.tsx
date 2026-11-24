import { FileText } from 'lucide-react';
import { Link } from '@/i18n/routing';

export const metadata = {
    title: 'Terms of Service | iWillTravel',
    description: 'Terms and conditions for using the iWillTravel AI travel intelligence platform.',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-200 py-20 px-4 font-body">
            <div className="container max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-glass-pill text-xs font-mono text-amber-200 mb-6">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Platform Terms</span>
                </div>

                <h1 className="font-heading text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
                    Terms of Service
                </h1>
                <p className="text-sm text-slate-400 mb-10 font-mono">
                    Last updated: May 2026 · iWillTravel (iwilltravel.app)
                </p>

                <div className="apple-glass-card rounded-[28px] p-8 md:p-10 space-y-8 text-sm text-slate-300 leading-relaxed">
                    <section className="space-y-2.5">
                        <h2 className="text-lg font-semibold text-white">1. Travel Intelligence & Verification</h2>
                        <p>
                            iWillTravel uses an autonomous 8-agent pipeline grounded in Google Places, Google Routes, and
                            Amadeus live data to help travelers plan trips, research destinations, decode visa policies, and
                            translate local dialects. Because border regulations, airline schedules, and venue hours can change
                            rapidly, travelers should always verify critical entry requirements and bookings with official
                            embassies, airlines, and hotels prior to departure.
                        </p>
                    </section>

                    <section className="space-y-2.5">
                        <h2 className="text-lg font-semibold text-white">2. Accounts, Plans & Fair Usage</h2>
                        <p>
                            Free, Starter, and Pro tiers include monthly itinerary and AI tool quotas as published on our{' '}
                            <Link href="/pricing" className="text-sky-300 hover:underline">Pricing</Link> page. Automated
                            scraping, abusive API probing, or sharing credentials to bypass rate limits is prohibited.
                        </p>
                    </section>

                    <section className="space-y-2.5">
                        <h2 className="text-lg font-semibold text-white">3. Community Contributions</h2>
                        <p>
                            You retain ownership of itineraries and community travel reports you create. By posting to the
                            public Traveler Community, you grant iWillTravel permission to display that post to other travelers
                            on the platform.
                        </p>
                    </section>

                    <section className="space-y-2.5">
                        <h2 className="text-lg font-semibold text-white">4. Contact</h2>
                        <p>
                            Questions regarding billing, enterprise licensing, or these terms can be sent to{' '}
                            <a href="mailto:hello@iwilltravel.app" className="text-sky-300 hover:underline">hello@iwilltravel.app</a>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
