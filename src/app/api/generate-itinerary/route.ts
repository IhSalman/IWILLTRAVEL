import { NextResponse } from 'next/server'
import { z } from 'zod'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getCache, setCache } from '@/utils/cache'
import { getActiveModel, extractTokens, logAiUsage } from '@/utils/ai-config'
import { requirePlan } from '@/utils/require-plan'
import { deductUsage, deductCredits } from '@/utils/usage'
import crypto from 'node:crypto'

// Input Validation Schema
const ItinerarySchema = z.object({
  city: z.object({
    id: z.string(),
    name: z.string().min(1).max(200),
    country: z.string()
  }),
  days: z.number().int().min(1).max(30),
  budget: z.enum(['budget', 'moderate', 'luxury']),
  travelStyle: z.enum(['relaxed', 'balanced', 'adventure', 'cultural']),
  travelerType: z.enum(['single', 'couple', 'family']),
  nationality: z.string().max(100).optional(),
  interests: z.array(z.string().max(50)).max(8).optional().default([]),
  accommodation: z.enum(['hostel', 'hotel', 'airbnb']).optional().default('hotel'),
  transport: z.enum(['public', 'rental', 'premium']).optional().default('public'),
  dietaryPrefs: z.array(z.string()).max(6).optional().default([]),
  accessibilityNeeds: z.array(z.string()).max(4).optional().default([]),
  startTimePreference: z.enum(['early', 'balanced', 'late']).optional().default('balanced'),
  specialRequests: z.string().max(500).optional().default(''),
  placeResearch: z.any().optional()
})

export async function POST(req: Request) {
  try {
    // 1. Authenticate + Plan Validation
    const planResult = await requirePlan('itinerary', { days: undefined }); // days checked after parse
    if ('error' in planResult) return planResult.error;
    const { user, plan, useCredits } = planResult;

    // 2. Validate Input
    const body = await req.json()
    const result = ItinerarySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input.', details: result.error.format() }, { status: 400 })
    }
    const data = result.data

    // 2.5. Cache Check
    const cacheKeyObj = {
      city: data.city.name,
      country: data.city.country,
      days: data.days,
      budget: data.budget,
      style: data.travelStyle,
      type: data.travelerType,
      interests: [...data.interests].sort(),
      accommodation: data.accommodation,
      transport: data.transport
    };
    const hash = crypto.createHash('sha256').update(JSON.stringify(cacheKeyObj)).digest('hex');
    const cacheKey = `itinerary_${hash}`;
    const cachedItinerary = await getCache(cacheKey);

    if (cachedItinerary) {
      return NextResponse.json({ itinerary: cachedItinerary });
    }

    // 2.1 Plan-based day limit check
    if (data.days > plan.limits.maxItineraryDays) {
      return NextResponse.json(
        { error: `Your ${plan.plan} plan supports up to ${plan.limits.maxItineraryDays}-day itineraries. Upgrade your plan or use credits.`, upgradeRequired: true, limitReached: true },
        { status: 429 }
      )
    }

    // Re-check with actual days (requirePlan was called without days for auth)
    const { requirePlan: requirePlanFn } = await import('@/utils/require-plan');
    const dayCheck = await requirePlanFn('itinerary', { days: data.days });
    if ('error' in dayCheck) return dayCheck.error;

    // 4. Build Persona & Context
    const travelerPersona = {
      single: 'Solo traveler seeking adventure, flexibility, budget-friendly options, social experiences, and safety tips.',
      couple: 'Couple traveling together seeking romantic activities, scenic spots, premium dining, relaxed pace, and intimate experiences.',
      family: 'Family with children seeking kid-friendly activities, safe neighborhoods, comfortable pace, and activities for different age groups.'
    }[data.travelerType]

    const budgetContext = {
      budget: 'Budget-conscious traveler: Focus on affordable accommodations, street food, free attractions, public transport.',
      moderate: 'Moderate budget: Mix of affordable and mid-range options, occasional splurges on key experiences.',
      luxury: 'Luxury traveler: Premium accommodations, fine dining, private tours, first-class transport.'
    }[data.budget]

    const styleContext = {
      relaxed: 'Relaxed pace: Maximum 2-3 activities per day, plenty of rest time, no rushing.',
      balanced: 'Balanced pace: Good mix of activities and downtime, 3-4 activities per day.',
      adventure: 'Adventure-focused: Active experiences, outdoor activities, unique thrills.',
      cultural: 'Cultural immersion: Museums, historical sites, local traditions, authentic experiences.'
    }[data.travelStyle]

    // 5. AI Generation
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const activeModelName = await getActiveModel()
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: activeModelName,
      generationConfig: { responseMimeType: 'application/json' }
    })

    const placeContext = data.placeResearch ? `
REAL DATA FROM GOOGLE PLACES:
- Rating: ${data.placeResearch.rating}/5 (${data.placeResearch.totalRatings} reviews)
- Summary: ${data.placeResearch.summary}
- Nearby Restaurants: ${data.placeResearch.nearbyRestaurants?.map((r: any) => r.name).join(', ')}
- Top Attractions: ${data.placeResearch.nearbyAttractions?.map((a: any) => a.name).join(', ')}
Use this real data to make recommendations more specific and accurate.
` : ''

    const systemPrompt = `You are WanderPlan AI, an expert travel planner with deep destination knowledge. Generate a professional, research-driven JSON travel plan.

TRAVELER PROFILE: ${travelerPersona} ${budgetContext} ${styleContext}
Interests: ${data.interests.join(', ') || 'General sightseeing'}. Accommodation: ${data.accommodation}. Transport: ${data.transport}.
Dietary: ${data.dietaryPrefs.join(', ') || 'None'}. Accessibility: ${data.accessibilityNeeds.join(', ') || 'None'}.
Start Time Preference: ${data.startTimePreference}. Special Requests: ${data.specialRequests || 'None'}
DESTINATION: ${data.city.name}, ${data.city.country} — ${data.days} days.
${placeContext}

Return ONLY a valid JSON object matching this EXACT structure (no markdown, no extra text):
{
  "title": "Evocative trip title",
  "overview": "2-3 sentence destination overview tailored to the traveler profile",
  "bestTimeToVisit": "Best season/months to visit and why",
  "whyThisPlan": ["Reason 1", "Reason 2", "Reason 3", "Reason 4"],
  "travelTips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5"],
  "localCustoms": ["Custom 1", "Custom 2", "Custom 3"],
  "safetyAdvice": ["Safety tip 1", "Safety tip 2", "Safety tip 3"],
  "budgetTips": ["Tip 1", "Tip 2", "Tip 3"],
  "realityCheck": {
    "crowds": { "level": "high|medium|low", "description": "..." },
    "physical": { "level": "high|medium|low", "description": "..." },
    "weather": ["Main weather characteristic", "What to pack"]
  },
  "days": [
    {
      "day": 1,
      "theme": "Theme for the day",
      "areaFocus": "Main neighbourhood covered",
      "difficulty": "high|medium|low",
      "pace": "easy|moderate|packed",
      "activities": [
        {
          "time": "Morning|Late Morning|Afternoon|Early Evening|Evening|Late Evening",
          "title": "Activity Name",
          "description": "2-3 sentences tailored to the traveler profile.",
          "duration": "2 hours",
          "cost": "€15 per person",
          "tip": "Expert insider tip",
          "transportNote": "How to get there from previous stop"
        }
      ],
      "dayResources": {
        "whereToEat": [{ "label": "...", "url": "https://..." }],
        "experiences": [{ "label": "...", "url": "https://..." }],
        "transportTip": "Practical transport note for this area."
      }
    }
  ],
  "budgetBreakdown": {
    "totalEstimate": "€X–€Y per person for entire trip",
    "savingTips": ["Tip 1", "Tip 2", "Tip 3"]
  }
}

Rules:
- Activities per day: 4-6 for Packed, 3-4 for Moderate, 2-3 for Relaxed
- time field MUST be one of: "Morning", "Late Morning", "Afternoon", "Early Evening", "Evening", "Late Evening"
- Include a "Lunch Break" or "Rest" activity slot at midday
- Cost must be specific (e.g. "Free", "€12", "$25-30")
- Duration must be specific (e.g. "1.5 hours", "45 minutes")
- Do NOT name specific restaurants or hotels anywhere in the JSON
- Do NOT include markdown code blocks in your response`

    console.log('Generating itinerary for:', data.city.name)

    // Run AI generation — keep resultAI in outer scope for token logging
    let rawContent: string
    let tokenMeta = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

    try {
      const resultAI = await model.generateContent(systemPrompt)
      const responseAI = resultAI.response
      rawContent = responseAI.text()
      tokenMeta = extractTokens(responseAI)
      console.log('AI Response received, length:', rawContent.length)
    } catch (aiError) {
      const message = aiError instanceof Error ? aiError.message : 'Check model availability'
      console.error('Gemini API Error details:', aiError)
      throw new Error(`Gemini AI Error: ${message}`)
    }

    let itinerary: any
    try {
      itinerary = JSON.parse(rawContent)
    } catch {
      console.error('Initial JSON Parse Error, attempting recovery...')
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          itinerary = JSON.parse(jsonMatch[0])
        } catch {
          console.error('Recovery failed. Raw AI Content:', rawContent)
          throw new Error('AI returned invalid JSON format')
        }
      } else {
        console.error('Raw AI Content:', rawContent)
        throw new Error('AI returned invalid JSON format')
      }
    }

    if (!itinerary || !itinerary.days || !Array.isArray(itinerary.days)) {
      console.error('Invalid itinerary structure:', itinerary)
      throw new Error('AI returned an incomplete itinerary structure')
    }

    // 6. Log Usage with accurate cost calculation
    await logAiUsage({
      userId: user.id,
      featureType: 'itinerary',
      inputTokens: tokenMeta.inputTokens,
      outputTokens: tokenMeta.outputTokens,
      totalTokens: tokenMeta.totalTokens,
      model: activeModelName,
      requestData: { city: data.city.name, days: data.days, budget: data.budget },
    })

    // 7. Deduct usage / credits
    if (useCredits || dayCheck.useCredits) {
      await deductCredits(user.id, 1);
    } else {
      await deductUsage(user.id, 'itinerary');
    }

    await setCache(cacheKey, itinerary);

    return NextResponse.json({ itinerary })

  } catch (error) {
    console.error('Generate Itinerary Error:', error)
    // Security: never leak internal error details to the client
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
