import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';

export async function GET(req: Request) {
  try {
    // Authenticate the user
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    const url = new URL(req.url);
    const category = url.searchParams.get('category') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // Mocked dynamic travel news to ensure the app functions and looks premium
    const baseNews = [
      {
        title: "Japan Expands e-Visa Program for More Countries",
        description: "Travelers can now enjoy a smoother entry into Japan as the government rolls out its streamlined e-Visa program to 15 new nations.",
        url: "https://example.com",
        imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
        publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        source: "Global Mobility News"
      },
      {
        title: "Top 10 Hidden Gems in Europe for 2026",
        description: "Skip the crowds in Paris and Rome. Here are the most breathtaking, underrated towns in Europe you need to visit this year.",
        url: "https://example.com",
        imageUrl: "https://images.unsplash.com/photo-1516483638261-f40af5ff0b44?w=800&q=80",
        publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        source: "Wanderlust Weekly"
      },
      {
        title: "Digital Nomad Visas: The Ultimate Guide",
        description: "From Spain to Indonesia, find out which countries are offering the best digital nomad visas and what you need to apply.",
        url: "https://example.com",
        imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
        publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        source: "Nomad Life"
      },
      {
        title: "Airlines Introduce New Premium Economy Standards",
        description: "Long-haul flights are getting an upgrade as major airlines unveil wider seats, better meals, and upgraded amenities in Premium Economy.",
        url: "https://example.com",
        imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80",
        publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        source: "Aviation Daily"
      },
      {
        title: "Sustainable Travel: Eco-Friendly Resorts Leading the Way",
        description: "Discover resorts that run entirely on renewable energy and give back to their local communities without sacrificing luxury.",
        url: "https://example.com",
        imageUrl: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80",
        publishedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        source: "EcoTravel"
      }
    ];

    // Filter by category if needed, or just return the limit
    let articles = baseNews;
    if (category !== 'all') {
      articles = baseNews.filter(n => 
        n.title.toLowerCase().includes(category.toLowerCase()) || 
        n.description.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    // Fallback if filter is too strict
    if (articles.length === 0) articles = baseNews;

    return NextResponse.json({ articles: articles.slice(0, limit) });
  } catch (error) {
    console.error('Travel news route error:', error);
    return NextResponse.json({ error: 'Failed to fetch travel news' }, { status: 500 });
  }
}
