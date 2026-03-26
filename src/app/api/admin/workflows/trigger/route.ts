import { NextResponse } from 'next/server';
import { createClient as createSsrClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/workflows/trigger — Trigger admin workflows
 * Body: { "workflow": "blog-generation" | "travel-intelligence" | "newsletter", ...params }
 */
export async function POST(req: Request) {
    const supabase = await createSsrClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { workflow, topic, category } = body;

    if (!workflow) {
        return NextResponse.json({ error: 'workflow is required' }, { status: 400 });
    }

    try {
        switch (workflow) {
            case 'blog-generation': {
                const { generateAutomatedBlog, getTrendingTopic } = await import('@/app/api/travel-intelligence/agents');
                let finalTopic = topic;
                let finalCategory = category;
                if (!finalTopic || !finalCategory) {
                    const suggestion = await getTrendingTopic();
                    finalTopic = suggestion.topic;
                    finalCategory = suggestion.category;
                }
                const blogData = await generateAutomatedBlog(finalTopic, finalCategory);

                const { createAdminClient } = await import('@/utils/supabase/admin');
                const admin = createAdminClient();
                const { data, error } = await admin.from('blogs').insert([{
                    title: blogData.title,
                    slug: blogData.slug,
                    excerpt: blogData.excerpt,
                    content: blogData.content,
                    category: finalCategory,
                    status: 'published',
                    image_url: `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200&query=${encodeURIComponent(blogData.image_query)}`,
                    metadata: { seoTitle: blogData.seoTitle, seoKeywords: blogData.seoKeywords, tags: blogData.tags },
                }]).select().single();

                if (error) return NextResponse.json({ error: error.message }, { status: 500 });
                return NextResponse.json({ success: true, workflow, result: { title: blogData.title, id: data?.id } });
            }

            case 'travel-intelligence': {
                const { generateGlobalIntelligence } = await import('@/app/api/travel-intelligence/agents');
                const intelligence = await generateGlobalIntelligence();
                return NextResponse.json({ success: true, workflow, result: intelligence });
            }

            default:
                return NextResponse.json({ error: `Unknown workflow: ${workflow}` }, { status: 400 });
        }
    } catch (err: any) {
        console.error(`[Admin Workflow] ${workflow} failed:`, err.message);
        return NextResponse.json({ error: err.message || 'Workflow failed' }, { status: 500 });
    }
}
