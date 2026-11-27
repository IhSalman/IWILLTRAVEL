import { googleTextSearch } from '../agent-itinerary/tools';
import { generateContent } from '@/utils/ai-config';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Robustly parses JSON from LLM responses even if they contain code blocks or minor formatting issues.
 */
function safeJsonParse(text: string) {
    try {
        // 1. Remove markdown code blocks
        let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        
        // 2. Try standard parse
        return JSON.parse(cleaned);
    } catch (e) {
        // 3. Last-ditch effort: try to extract the first { and last }
        try {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                const inner = text.substring(start, end + 1);
                return JSON.parse(inner);
            }
        } catch (innerError) {
            console.error('[Safe JSON Parse] Failed to parse despite cleaning:', innerError);
        }
        throw e;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOG CONTENT AGENT (Automated Content Generation)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateAutomatedBlog(topic: string, category: 'country' | 'city' | 'wonder') {
    console.log(`[Blog Agent] Generating automated blog for: ${topic} (${category})...`);

    // 1. Research phase (optional but recommended for accuracy)
    const searchResults = await googleTextSearch(`comprehensive travel facts, history and hidden wonders of ${topic}`);
    const context = (searchResults || []).slice(0, 5).map((res: any) => `${res.name}: ${res.address}`).join('\n');

    // Use universal utility

    const prompt = `You are an elite Travel Blogger and Technical SEO expert. Your goal is to write a highly immersive, deep-dive travel blog post that is specifically engineered to outrank competitors on Google.
Target Topic: ${topic}
Category: ${category}
Research Context:
${context}

Your post MUST be approximately 1000-1200 words. It must act as a comprehensive, high-value guide. Use an authoritative and professional travel writing style.

You MUST structure the content using strict Markdown formatting:
- Start with an engaging introduction.
- Use multiple H2 (##) and H3 (###) headers.
- Use bullet points for readability.
- Mandatorily include a "Frequently Asked Questions (FAQ)" section at the very end with 3-5 questions.

CRITICAL: Since this will be parsed as JSON, ensure you ESCAPE all double quotes (e.g. \") within the content string. Do not use literal newlines unless they are escaped as \n.

Return ONLY a JSON object with this EXACT structure:
{
  "title": "A highly clickable, SEO-optimized title (50-60 characters)",
  "slug": "url-friendly-slug-with-primary-keywords",
  "excerpt": "A compelling 140-160 character meta description summarizing the massive value of the guide.",
  "content": "Full 1000+ word blog content in strict Markdown format, including H2/H3 headers and the mandatory FAQ section.",
  "image_query": "A highly specific, comma-separated descriptive prompt to find a hero image (e.g., 'tokyo,shibuya,night')",
  "tags": ["travel", "in-depth guide", "${topic.toLowerCase()}", "${category}"],
  "seoTitle": "Primary Keyword | Secondary Keyword | Brand",
  "seoKeywords": "${topic}, travel guide, hidden gems ${topic}, visit ${topic}, budget for ${topic}"
}

Guidelines:
- If category is 'wonder', focus heavily on history, architectural significance, and optimal viewing times.
- If category is 'country', provide a high-level guide covering culture, local customs, food, safety, and top regions.
- If category is 'city', focus heavily on local vibes, neighborhoods, transport hacks, and a realistic daily budget.
- Content MUST be original, highly informative, and directly answer user search intents.`;

    try {
        const { text } = await generateContent(prompt);
        const blogData = safeJsonParse(text);
        console.log(`[Blog Agent] Successfully generated blog: ${blogData.title}`);
        return blogData;
    } catch (error: any) {
        console.error('[Blog Agent] Error:', error.message);
        throw new Error('Failed to generate automated blog content');
    }
}

export async function getTrendingTopic() {
    console.log('[Blog Agent] Suggesting a trending travel topic...');

    // Use universal utility

    const prompt = `Suggest a trending, high-SEO travel topic for a blog post. 
Select something globally trending right now (e.g., a specific hidden gem in Japan, a new wonder, or a seasonal paradise).

Return ONLY JSON:
{
  "topic": "Specific Title/Topic",
  "category": "country" | "city" | "wonder"
}`;

    try {
        const { text } = await generateContent(prompt);
        return safeJsonParse(text);
    } catch (error) {
        return { topic: 'The Best Hidden Gems of Europe', category: 'country' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL INTELLIGENCE AGENT (Combined for Trends, News, Insights, Gems, Alerts)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateGlobalIntelligence() {
    console.log('[Travel Intelligence] Generating Global Intelligence Dashboard...');

    try {
        // Use universal utility

        const currentDate = new Date().toISOString().split('T')[0];
        const prompt = `You are a world-class Global Travel Intelligence Agent. Today's date is ${currentDate}.
Your task is to analyze global travel patterns, recent news, and seasonal pricing to generate a comprehensive travel intelligence dashboard.

Return a highly structured JSON object matching exactly this schema:
{
  "trending": [{ "destination": "City, Country", "score": 95, "why": "...", "bestTime": "Month-Month", "budget": "Low" }],
  "news": [{ "title": "...", "summary": "...", "impact": "Good" }],
  "insights": [{ "title": "...", "description": "..." }],
  "flightDeals": [{ "route": "City -> City", "price": "€X", "trend": "down X%", "bestDay": "Tuesday" }],
  "hiddenGems": [{ "destination": "...", "description": "..." }],
  "alerts": [{ "title": "...", "description": "...", "severity": "Low" }]
}

Rules: trending=4 items, news=3 items, insights=3 items, flightDeals=3 items, hiddenGems=3 items, alerts=2-3 items.
budget must be Low/Medium/High. impact must be Good/Warning. severity must be Low/Medium/High.
Make data highly realistic and seasonally appropriate for ${currentDate}. Return ONLY the JSON object, no markdown.`

        const { text } = await generateContent(prompt);
        const parsed = safeJsonParse(text);
        
        // Basic validation of keys
        if (!parsed.trending) throw new Error('Invalid AI response structure');

        console.log('[Travel Intelligence] Successfully generated dashboard data');
        // News, fares and advisories need real, dated sources. An LLM can only invent them,
        // so only inspirational sections (suggestions, hidden gems, tips) are returned.
        return {
            ...parsed,
            news: [],
            flightDeals: [],
            alerts: [],
        };
    } catch (error: any) {
        console.error('[Travel Intelligence] Generation failed:', error.message);
        // Show empty sections rather than made-up data.
        return { trending: [], news: [], insights: [], flightDeals: [], hiddenGems: [], alerts: [] };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION AGENT (Dynamic Search)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getRecommendations(budget: string, month: string, interests: string) {
    console.log('[Recommendation Agent] Searching targets for:', { budget, month, interests });

    // Use universal utility

    const prompt = `You are an AI Travel Advisor. Provide 3 highly personalized destination recommendations based on these constraints:
- Budget: ${budget}
- Preferred Month: ${month}
- Key Interests: ${interests}

Return ONLY valid JSON matching exactly this schema:
{
  "recommendations": [
    {
      "destination": "City, Country",
      "matchScore": 98, // 0-100 how well it matches
      "reason": "1-2 sentence explanation of why this is the perfect destination for them right now",
      "estimatedCost": "€X",
      "weather": "e.g., 20°C, Sunny"
    }
  ]
}`;

    try {
        const { text } = await generateContent(prompt);
        return safeJsonParse(text);
    } catch (error: any) {
        console.error('[Recommendation Agent] Error:', error.message);
        throw new Error('Failed to generate recommendations');
    }
}

