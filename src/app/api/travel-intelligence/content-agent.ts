import { GoogleGenerativeAI } from '@google/generative-ai';
import { createAdminClient } from '@/utils/supabase/admin';
import { getActiveModel } from '@/utils/ai-config';

function getGemini() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not configured');
    return new GoogleGenerativeAI(key);
}

async function getJsonModel() {
    const activeModelName = await getActiveModel();
    return getGemini().getGenerativeModel({
        model: activeModelName,
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
    });
}

/** Safely parse JSON from an LLM response, stripping markdown fences. */
function safeParseLLM(raw: string): any {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
}

/** Build a safe loremflickr URL from a query, with fallback. */
function flickrUrl(query: string | undefined | null, w: number, h: number, fallbackCity: string): string {
    const safeQuery = (query || fallbackCity).replace(/[^a-zA-Z0-9, ]/g, '').replace(/\s+/g, ',').substring(0, 80);
    return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(safeQuery)}/all`;
}

/** Extract place names from an itinerary object (tolerant of different shapes). */
function extractPlaceNames(itinerary: any): string[] {
    try {
        if (itinerary?.days && Array.isArray(itinerary.days)) {
            return itinerary.days
                .flatMap((d: any) => (d.activities || []).map((a: any) => (typeof a === 'string' ? a : a?.title || a?.name || '')))
                .filter(Boolean)
                .slice(0, 8);
        }
        return [];
    } catch { return []; }
}

// ---------------------------------------------------------
// 1. SEO BLOG WRITER AGENT
// ---------------------------------------------------------
async function seoWriterAgent(city: string, contentAngle: string, input: any, itinerary: any) {
    console.log(`[SEO Writer Agent] Drafting core content for ${city}...`);
    const places = extractPlaceNames(itinerary);
    const prompt = `You are the SEO Blog Writer Agent for iWillTravel.
Task: Create a structured, highly engaging travel blog draft based on raw itinerary data.

City: ${city}
Angle: ${contentAngle}
Overview: ${typeof itinerary?.overview === 'string' ? itinerary.overview : JSON.stringify(itinerary?.overview || 'No overview').substring(0, 500)}
Key Places: ${JSON.stringify(places)}

Return ONLY JSON matching exactly:
{
  "introduction": "Engaging intro paragraph (150-250 words). Who should visit, why it is popular.",
  "places": [
    {
      "name": "Exact Place Name",
      "description": "2-3 lines engaging description.",
      "map_link": "https://www.google.com/maps/search/?api=1&query=[PLACE_NAME]+${city}"
    }
  ],
  "itinerary": "Detailed day-by-day suggested itinerary based on real data. Use markdown formatting."
}`;
    const jsonModel = await getJsonModel();
    const result = await jsonModel.generateContent(prompt);
    return safeParseLLM(result.response.text());
}

// ---------------------------------------------------------
// 2. IMAGE AGENT
// ---------------------------------------------------------
async function imageAgent(draft: any, city: string) {
    console.log(`[Image Agent] Generating precise image queries for ${city}...`);
    const placeNames = (draft.places || []).map((p: any) => p.name).filter(Boolean).join(', ');
    const prompt = `You are the Image Processing Agent.
Task: Generate precise, highly-descriptive image search queries and ALT text for a travel blog.

City: ${city}
Places mentioned: ${placeNames || city}

IMPORTANT: image_query values must be simple comma-separated keywords. Example: "rome,colosseum" or "tokyo,shibuya". No special characters, no long sentences.

Return ONLY a JSON matching exactly:
{
  "hero_image_query": "${city.toLowerCase()},skyline",
  "hero_alt": "${city} skyline view",
  "places": [
    {
      "name": "Exact place name matching input",
      "image_query": "${city.toLowerCase()},placename",
      "alt": "[PLACE_NAME] in ${city}"
    }
  ],
  "food_image_query": "${city.toLowerCase()},food",
  "food_alt": "${city} local food"
}`;
    const jsonModel = await getJsonModel();
    const result = await jsonModel.generateContent(prompt);
    return safeParseLLM(result.response.text());
}

// ---------------------------------------------------------
// 3. DATA ENRICHMENT AGENT
// ---------------------------------------------------------
async function dataEnrichmentAgent(city: string) {
    console.log(`[Data Enrichment Agent] Enriching metadata for ${city}...`);
    const prompt = `You are the Data Enrichment Agent.
Task: Enhance a travel blog with highly useful, realistic travel insights.

City: ${city}

Return ONLY a JSON matching exactly:
{
  "budget": "Realistic daily costs breakdown and money-saving guide for this city.",
  "weather": "Best time to visit and weather overview throughout the year.",
  "food": "Must-try local dishes and food experiences.",
  "tips": [
    "Tip 1 (e.g. transport apps to use)",
    "Tip 2 (e.g. local customs or safety)",
    "Tip 3 (e.g. things to avoid)"
  ]
}`;
    const jsonModel3 = await getJsonModel();
    const result = await jsonModel3.generateContent(prompt);
    return safeParseLLM(result.response.text());
}

// ---------------------------------------------------------
// 4. SEO OPTIMIZATION AGENT
// ---------------------------------------------------------
async function seoOptimizationAgent(city: string, contentAngle: string, _draft: any) {
    console.log(`[SEO Optimization Agent] Polishing SEO metadata for ${city}...`);
    const prompt = `You are the AI SEO Optimization Agent for the travel platform iWillTravel.

Your task is to generate:
- A high-ranking SEO title
- A clean, optimized URL slug
- A 140-160 chars meta description

Both title and URL must be perfectly aligned for Google ranking for the target: ${city}.

STEP 1: DEFINE PRIMARY KEYWORD
Format: "[City/Country] Travel Guide"

STEP 2: GENERATE SEO TITLE
Format (STRICT): [City/Country] Travel Guide: Best Places, Itinerary & Budget Tips | iWillTravel
Allowed Variation: "Travel Tips" instead of Budget. Add year (2026) for popular cities.

STEP 3: GENERATE SEO URL (SLUG)
RULES:
- Use lowercase only
- Use hyphens (-)
- Remove unnecessary words
- DO NOT include "iwilltravel"
- Keep it short
FORMAT: [primary-keyword-with-hyphens] (e.g. nepal-travel-guide. DO NOT include leading slashes or /blog/)

IMPORTANT RULES - DO NOT:
- Add branding in URL
- Use long or messy slugs
- Use underscores (_)
- Repeat keywords

Return ONLY a JSON matching exactly:
{
  "title": "[SEO Title]",
  "slug": "[slug-here]",
  "excerpt": "140-160 chars meta description naturally including keywords.",
  "seoTitle": "[SEO Title]",
  "seoKeywords": "${city}, travel guide, best places, itinerary"
}`;
    const jsonModel4 = await getJsonModel();
    const result = await jsonModel4.generateContent(prompt);
    return safeParseLLM(result.response.text());
}

// ---------------------------------------------------------
// 5. UPDATE AGENT
// ---------------------------------------------------------
async function blogUpdateAgent(existingBlog: any, itinerary: any) {
    console.log(`[Blog Update Agent] Merging new itinerary data into existing blog ${existingBlog.slug}...`);
    const newPlaces = extractPlaceNames(itinerary);
    const prompt = `You are the Blog Update Agent.
Task: You have an existing JSON structured blog. A user just generated a new itinerary for the same city.
Merge the new places into the existing places array without deleting old valuable data.

Existing Data snippet: ${JSON.stringify(existingBlog.content).substring(0, 1500)}
New Places: ${JSON.stringify(newPlaces)}

Return ONLY JSON matching the EXACT same schema as the existing blog content, but with the new places added into the 'places' array (with map_link and image_url) if they are unique.

{
    "introduction": "...",
    "places": [{ "name": "...", "description": "...", "map_link": "...", "image_url": "..." }],
    "itinerary": "...",
    "budget": "...",
    "weather": "...",
    "food": "...",
    "food_image_url": "...",
    "tips": ["..."]
}`;
    const jsonModel5 = await getJsonModel();
    const result = await jsonModel5.generateContent(prompt);
    return safeParseLLM(result.response.text());
}

// ---------------------------------------------------------
// MAIN ORCHESTRATOR
// ---------------------------------------------------------
export async function processItineraryToBlog(itinerary: any, input: any) {
    const city = input?.destination;
    if (!city) {
        console.error('[Main Orchestrator] No destination found in input. Aborting.');
        return;
    }
    console.log(`[Main Orchestrator] Triggered for ${city}...`);
    
    const supabase = createAdminClient();

    // STEP 1: Check Database for recent blogs
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    let recentBlogs: any[] = [];
    try {
        const { data } = await supabase
            .from('blogs')
            .select('*')
            .ilike('metadata->>seoKeywords', `%${city}%`)
            .gte('created_at', threeDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(1);
        recentBlogs = data || [];
    } catch (dbErr: any) {
        console.error('[Main Orchestrator] DB query error:', dbErr.message);
    }

    try {
        // ─── UPDATE PATH ───
        if (recentBlogs.length > 0) {
            console.log(`[Main Orchestrator] Blog found for ${city}. Routing to Update Agent...`);
            const existingBlog = recentBlogs[0];
            let parsedContent: any;
            try { parsedContent = JSON.parse(existingBlog.content); } catch { parsedContent = { existing_text: existingBlog.content }; }
            
            try {
                const updatedContent = await blogUpdateAgent({ ...existingBlog, content: parsedContent }, itinerary);
                updatedContent.is_structured_json = true;

                const { error: updateError } = await supabase
                    .from('blogs')
                    .update({ content: JSON.stringify(updatedContent) })
                    .eq('id', existingBlog.id);

                if (updateError) console.error('[Main Orchestrator] Update Failed:', updateError.message);
                else console.log(`[Main Orchestrator] Successfully updated blog: ${existingBlog.slug}`);
            } catch (updateErr: any) {
                console.error('[Main Orchestrator] Update Agent crashed:', updateErr.message);
            }
            return;
        }

        // ─── CREATE PATH ───
        console.log(`[Main Orchestrator] No recent blog found for ${city}. Starting Creation Pipeline...`);
        const contentAngle = 'Travel Guide';

        // 1. Writer Agent
        let draft: any;
        try {
            draft = await seoWriterAgent(city, contentAngle, input, itinerary);
            console.log(`[Main Orchestrator] Writer Agent returned ${draft?.places?.length || 0} places.`);
        } catch (err: any) {
            console.error('[Main Orchestrator] Writer Agent FAILED:', err.message);
            // Provide a minimal fallback draft
            draft = {
                introduction: `Discover the best of ${city} with our comprehensive travel guide.`,
                places: extractPlaceNames(itinerary).map(name => ({
                    name,
                    description: `A popular attraction in ${city}.`,
                    map_link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + city)}`
                })),
                itinerary: `Explore ${city} over ${input.days || 3} unforgettable days.`
            };
        }
        
        // 2 & 3. Image & Enrichment (Parallel, with individual error handling)
        let images: any = {};
        let enrichment: any = {};

        const [imgResult, enrichResult] = await Promise.allSettled([
            imageAgent(draft, city),
            dataEnrichmentAgent(city)
        ]);

        if (imgResult.status === 'fulfilled') {
            images = imgResult.value;
            console.log('[Main Orchestrator] Image Agent succeeded.');
        } else {
            console.error('[Main Orchestrator] Image Agent FAILED:', imgResult.reason?.message);
            images = { hero_image_query: city, hero_alt: `${city} view`, places: [], food_image_query: `${city},food`, food_alt: `${city} food` };
        }

        if (enrichResult.status === 'fulfilled') {
            enrichment = enrichResult.value;
            console.log('[Main Orchestrator] Enrichment Agent succeeded.');
        } else {
            console.error('[Main Orchestrator] Enrichment Agent FAILED:', enrichResult.reason?.message);
            enrichment = { budget: 'Budget information unavailable.', weather: 'Check local forecasts.', food: 'Explore local cuisine.', tips: ['Research before you go.'] };
        }

        // 4. SEO Optimizer Agent
        let seo: any;
        try {
            seo = await seoOptimizationAgent(city, contentAngle, draft);
            console.log(`[Main Orchestrator] SEO Agent returned slug: ${seo?.slug}`);
        } catch (err: any) {
            console.error('[Main Orchestrator] SEO Agent FAILED:', err.message);
            const fallbackSlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-travel-guide';
            seo = {
                title: `${city} Travel Guide: Best Places, Itinerary & Budget Tips | iWillTravel`,
                slug: fallbackSlug,
                excerpt: `Discover the best places to visit in ${city}. Your ultimate travel guide with itinerary and budget tips.`,
                seoTitle: `${city} Travel Guide | iWillTravel`,
                seoKeywords: `${city}, travel guide, best places, itinerary`
            };
        }

        console.log(`[Main Orchestrator] All agents completed. Assembling final payload...`);

        // ─── Assemble Data ───
        const heroUrl = flickrUrl(images.hero_image_query, 1200, 800, city);

        // Merge images into places
        const finalPlaces = (draft.places || []).map((place: any) => {
            const imgMatch = (images.places || []).find((i: any) => i.name === place.name) || (images.places || [])[0] || {};
            return {
                ...place,
                image_url: flickrUrl(imgMatch.image_query, 800, 600, city),
                alt: imgMatch.alt || place.name || city
            };
        });

        const structuredContent = {
            is_structured_json: true,
            introduction: draft.introduction || '',
            places: finalPlaces,
            itinerary: draft.itinerary || '',
            budget: enrichment.budget || '',
            weather: enrichment.weather || '',
            food: enrichment.food || '',
            food_image_url: flickrUrl(images.food_image_query, 800, 600, city),
            tips: enrichment.tips || []
        };

        // ─── Deduplicate slug ───
        let finalSlug = seo.slug || city.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-travel-guide';
        // Strip any leading slashes or /blog/ prefix the LLM might add
        finalSlug = finalSlug.replace(/^\/?(blog\/)?/i, '').replace(/^-|-$/g, '');

        const { data: existingSlug } = await supabase
            .from('blogs')
            .select('id')
            .eq('slug', finalSlug)
            .limit(1);

        if (existingSlug && existingSlug.length > 0) {
            finalSlug = `${finalSlug}-${Date.now().toString(36)}`;
            console.log(`[Main Orchestrator] Slug collision detected. Using: ${finalSlug}`);
        }

        // STEP 5: Store & Publish
        const { error: insertError } = await supabase
            .from('blogs')
            .insert([{
                title: seo.title || `${city} Travel Guide | iWillTravel`,
                slug: finalSlug,
                excerpt: seo.excerpt || `Discover ${city} with our AI-curated travel guide.`,
                content: JSON.stringify(structuredContent),
                category: 'city',
                status: 'published',
                published_at: new Date().toISOString(),
                image_url: heroUrl,
                metadata: {
                    seoTitle: seo.seoTitle || seo.title,
                    seoKeywords: seo.seoKeywords || `${city}, travel guide`,
                    intent_type: contentAngle
                }
            }]);

        if (insertError) {
            console.error('[Main Orchestrator] DB Insert Error:', insertError.message);
        } else {
            console.log(`[Main Orchestrator] Blog successfully assembled and published! Slug: ${finalSlug}`);
        }

    } catch (error: any) {
        console.error('[Main Orchestrator] Pipeline Failed:', error.message);
    }
}
