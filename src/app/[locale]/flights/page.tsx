import type { Metadata } from 'next';
import FlightsExperience from '@/components/flights/FlightsExperience';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const title = 'Live Flight Tracker & Airport Map | iWillTravel';
    const description =
        'Track planes in real time on a live map. See flight routes, aircraft details, airport weather and arrivals and departures happening right now.';
    return {
        title,
        description,
        alternates: { canonical: `/${locale}/flights` },
        openGraph: { title, description, url: `/${locale}/flights` },
    };
}

export default function FlightsPage() {
    return (
        <main>
            <h1 className="sr-only">Live flight tracker and airport map</h1>
            <FlightsExperience />
        </main>
    );
}
