import { GoogleGenerativeAI } from '@google/generative-ai';
import { googleTextSearch } from '../agent-itinerary/tools';
import { getActiveModel, extractTokens } from '@/utils/ai-config';

// Initialize Gemini
function getGemini() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not configured');
    return new GoogleGenerativeAI(key);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOG CONTENT AGENT (Automated Content Generation)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateAutomatedBlog(topic: string, category: 'country' | 'city' | 'wonder') {
    console.log(`[Blog Agent] Generating automated blog for: ${topic} (${category})...`);

    // 1. Research phase (optional but recommended for accuracy)
    const searchResults = await googleTextSearch(`comprehensive travel facts, history and hidden wonders of ${topic}`);
    const context = (searchResults || []).slice(0, 5).map((res: any) => `${res.name}: ${res.address}`).join('\n');

    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
        },
    });

    const prompt = `You are an elite Travel Blogger and SEO expert. Your goal is to write a highly immersive, detailed, and SEO-friendly travel blog post.
Target Topic: ${topic}
Category: ${category}
Research Context:
${context}

Your post should be approximately 1000-1500 words of deeply engaging content. Use professional, evocative, and inspiring travel writing style.

Return ONLY a JSON object with this EXACT structure:
{
  "title": "A catchy, SEO-optimized title",
  "slug": "url-friendly-slug-from-title",
  "excerpt": "A compelling 2-sentence meta description/summary",
  "content": "Full blog content in Markdown format. Include H2/H3 headers, bullet points, and immersive formatting.",
  "image_query": "A descriptive prompt to find or generate a hero image for this blog",
  "tags": ["travel", "adventure", "${topic.toLowerCase()}", "${category}"],
  "seoTitle": "SEO Title tag",
  "seoKeywords": "${topic}, travel guide, hidden gems ${topic}, visit ${topic}"
}

Guidelines:
- If category is 'wonder', focus on history and architectural significance.
- If category is 'country', provide a high-level guide covering culture, food, and top regions.
- If category is 'city', focus on local vibes, neighborhoods, and 'a perfect day' itinerary.
- Content must be original, vivid, and deeply informative.`;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const blogData = JSON.parse(text);
        console.log(`[Blog Agent] Successfully generated blog: ${blogData.title}`);
        return blogData;
    } catch (error: any) {
        console.error('[Blog Agent] Error:', error.message);
        throw new Error('Failed to generate automated blog content');
    }
}

export async function getTrendingTopic() {
    console.log('[Blog Agent] Suggesting a trending travel topic...');

    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: {
            responseMimeType: 'application/json',
        },
    });

    const prompt = `Suggest a trending, high-SEO travel topic for a blog post. 
Select something globally trending right now (e.g., a specific hidden gem in Japan, a new wonder, or a seasonal paradise).

Return ONLY JSON:
{
  "topic": "Specific Title/Topic",
  "category": "country" | "city" | "wonder"
}`;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        return JSON.parse(text);
    } catch (error) {
        return { topic: 'The Best Hidden Gems of Europe', category: 'country' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL INTELLIGENCE AGENT (Combined for Trends, News, Insights, Gems, Alerts)
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateGlobalIntelligence() {
    console.log('[Travel Intelligence] Generating Global Intelligence Dashboard...');

    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
        },
    });

    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `You are a world-class Global Travel Intelligence Agent. Today's date is ${currentDate}.
Your task is to analyze global travel patterns, recent news, and seasonal pricing to generate a comprehensive travel intelligence dashboard.

Return a highly structured JSON object matching exactly this schema:
{
  "trending": [
    {
      "destination": "City, Country",
      "score": 95, // 0-100 trend score
      "why": "Brief, compelling reason why it's trending right now (e.g. Northern Lights season)",
      "bestTime": "Month-Month",
      "budget": "Low" | "Medium" | "High"
    }
  ], // exactly 4 items
  "news": [
    {
      "title": "Headline of the travel news",
      "summary": "2-line summary of the news impact",
      "impact": "Good" | "Warning"
    }
  ], // exactly 3 items
  "insights": [
    {
      "title": "Insight title (e.g., Best cheap destinations this month)",
      "description": "Specific recommendations and tips"
    }
  ], // exactly 3 items
  "flightDeals": [
    {
      "route": "City → City",
      "price": "€X",
      "trend": "↓ X%",
      "bestDay": "Day of week"
    }
  ], // exactly 3 items (mocked realistic deals based on current season)
  "hiddenGems": [
    {
      "destination": "City/Region, Country",
      "description": "Why it's a hidden gem and what unique experience it offers"
    }
  ], // exactly 3 items
  "alerts": [
    {
      "title": "Alert Headline",
      "description": "Weather warnings, political issues, or safety alerts",
      "severity": "Low" | "Medium" | "High"
    }
  ] // 2 to 3 items
}

Make the data highly realistic, seasonally appropriate for ${currentDate}, and insightful for travelers. Do not use generic filler data.`;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(text);
        console.log('[Travel Intelligence] Successfully generated dashboard data');
        return parsed;
    } catch (error: any) {
        console.error('[Travel Intelligence] Error generating global intelligence:', error.message);
        throw new Error('Failed to generate travel intelligence');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION AGENT (Dynamic Search)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getRecommendations(budget: string, month: string, interests: string) {
    console.log('[Recommendation Agent] Searching targets for:', { budget, month, interests });

    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2048,
        },
    });

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
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        return JSON.parse(text);
    } catch (error: any) {
        console.error('[Recommendation Agent] Error:', error.message);
        throw new Error('Failed to generate recommendations');
    }
}
