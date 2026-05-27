import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { ClarityAnalytics } from '@/components/analytics/ClarityAnalytics';
import { GlobalErrorBoundary } from '@/components/layout/ErrorBoundary';

const interClass = "font-satoshi";

export const viewport: Viewport = {
    themeColor: '#0da2e7',
};

export async function generateMetadata({
    params
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Metadata' });

    return {
        metadataBase: new URL('https://www.iwilltravel.app'),
        title: t('title'),
        description: t('description'),
        manifest: '/manifest.json',
        alternates: {
            canonical: '/',
        },
    };
}

export default async function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Ensure that the incoming `locale` is valid
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    // Providing all messages to the client
    // side is the easiest way to get started
    const messages = await getMessages();

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'iWillTravel',
        url: 'https://www.iwilltravel.app',
        description: 'Agentic AI Travel Planner & Discovery Tool',
    };

    return (
        <html lang={locale}>
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <script
                    // @ts-ignore - custom optimization attributes
                    nowprocket=""
                    data-noptimize="1"
                    data-cfasync="false"
                    data-wpfc-render="false"
                    seraph-accel-crit="1"
                    data-no-defer="1"
                    dangerouslySetInnerHTML={{
                        __html: `(function () {
                            var script = document.createElement("script");
                            script.async = 1;
                            script.src = 'https://tp-em.com/NTE1NDYz.js?t=515463';
                            document.head.appendChild(script);
                        })();`,
                    }}
                />
            </head>
            <body className={interClass} suppressHydrationWarning>
                <NextIntlClientProvider messages={messages}>
                    <GlobalErrorBoundary>
                        <div className="relative flex min-h-screen flex-col bg-background selection:bg-primary/30">
                            <Navbar />
                            <main className="flex-1">{children}</main>
                            <Footer />
                        </div>
                    </GlobalErrorBoundary>
                </NextIntlClientProvider>
                <SpeedInsights />
                <Analytics />
                <ClarityAnalytics />
            </body>
        </html>
    );
}
