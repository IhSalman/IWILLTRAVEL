import { NextRequest, NextResponse } from 'next/server';
import { generateAutomatedBlog, getTrendingTopic } from '../../travel-intelligence/agents';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * ADMIN ONLY API: Triggers AI Blog Generation
 * Can be called with a body: { "topic": "...", "category": "..." }
 * If no body, it suggests a trending topic via AI first.
 */
export async function POST(req: NextRequest) {
    try {
        let { topic, category } = await req.json().catch(() => ({}));

        // 1. If no topic/category provided, get a trending one
        if (!topic || !category) {
            const suggestion = await getTrendingTopic();
            topic = suggestion.topic;
            category = suggestion.category;
        }

        console.log(`[Admin Blog] Triggering generation for: ${topic} (${category})`);

        // 2. Generate content using the Blog Agent
        const blogData = await generateAutomatedBlog(topic, category);

        // 3. Save to Supabase
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('blogs')
            .insert([{
                title: blogData.title,
                slug: blogData.slug,
                excerpt: blogData.excerpt,
                content: blogData.content,
                category: category,
                status: 'published',
                image_url: `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200&query=${encodeURIComponent(blogData.image_query)}`,
                metadata: {
                    seoTitle: blogData.seoTitle,
                    seoKeywords: blogData.seoKeywords,
                    tags: blogData.tags
                }
            }])
            .select()
            .single();

        if (error) {
            console.error('[Admin Blog] Supabase Error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 4. (Future) Trigger Newsletter Broadcast here
        // await triggerNewsletterBroadcast(data.id);

        return NextResponse.json({ 
            success: true, 
            message: `Successfully generated blog: ${blogData.title}`,
            blog: data 
        });

    } catch (error: any) {
        console.error('[Admin Blog] Internal Error:', error.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
