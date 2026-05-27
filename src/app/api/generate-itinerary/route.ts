import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCache, setCache } from '@/utils/cache'
import { generateContent, logAiUsage } from '@/utils/ai-config'
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
    const planResult = await requirePlan('itinerary', { days: undefined });
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

    // Re-check with actual days
    const dayCheck = await requirePlan('itinerary', { days: data.days });
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

    const placeContext = data.placeResearch ? `
REAL DATA FROM GOOGLE PLACES:
- Rating: ${data.placeResearch.rating}/5 (${data.placeResearch.totalRatings} reviews)
- Summary: ${data.placeResearch.summary}
- Nearby Restaurants: ${data.placeResearch.nearbyRestaurants?.map((r: any) => r.name).join(', ')}
- Top Attractions: ${data.placeResearch.nearbyAttractions?.map((a: any) => a.name).join(', ')}
Use this real data to make recommendations more specific and accurate.
` : ''

    const systemPrompt = `You are iWillTravel, an expert travel planner. Generate a professional, research-driven JSON travel plan.

TRAVELER PROFILE: ${travelerPersona} ${budgetContext} ${styleContext}
Interests: ${data.interests.join(', ') || 'General sightseeing'}. Accommodation: ${data.accommodation}. Transport: ${data.transport}.
DESTINATION: ${data.city.name}, ${data.city.country} — ${data.days} days.
${placeContext}

Return ONLY a valid JSON object matching this EXACT structure:
{
  "title": "Evocative trip title",
  "overview": "2-3 sentence overview",
  "bestTimeToVisit": "Best months to visit",
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
      "areaFocus": "Main neighbourhood",
      "difficulty": "high|medium|low",
      "pace": "easy|moderate|packed",
      "activities": [
        {
          "time": "Morning|Late Morning|Afternoon|Early Evening|Evening|Late Evening",
          "title": "Activity Name",
          "description": "2-3 sentences.",
          "duration": "2 hours",
          "cost": "€15",
          "tip": "Insider tip",
          "transportNote": "How to get there"
        }
      ],
      "dayResources": {
        "whereToEat": [{ "label": "...", "url": "https://..." }],
        "experiences": [{ "label": "...", "url": "https://..." }],
        "transportTip": "Transport note."
      }
    }
  ],
  "budgetBreakdown": {
    "totalEstimate": "€X–€Y",
    "savingTips": ["Tip 1", "Tip 2", "Tip 3"]
  }
}

Rules:
- Activities per day: 4-6 for Packed, 3-4 for Moderate, 2-3 for Relaxed
- Do NOT name specific restaurants or hotels
- Return ONLY valid JSON, no markdown`

    console.log('Generating itinerary for:', data.city.name)

    const { text: rawContent, usage, model } = await generateContent(systemPrompt, {
        role: 'creative',
        json: true
    });

    let itinerary: any
    try {
      itinerary = JSON.parse(rawContent)
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          itinerary = JSON.parse(jsonMatch[0])
        } catch {
          throw new Error('AI returned invalid JSON format')
        }
      } else {
        throw new Error('AI returned invalid JSON format')
      }
    }

    if (!itinerary || !itinerary.days || !Array.isArray(itinerary.days)) {
      throw new Error('AI returned an incomplete itinerary structure')
    }

    // 6. Log Usage
    await logAiUsage({
      userId: user?.id || 'guest',
      featureType: 'itinerary',
      ...usage,
      model,
      requestData: { city: data.city.name, days: data.days, budget: data.budget },
    })

    // 7. Deduct usage / credits
    if (user) {
      if (useCredits || dayCheck.useCredits) {
        await deductCredits(user.id, 1);
      } else {
        await deductUsage(user.id, 'itinerary');
      }
    }

    await setCache(cacheKey, itinerary);
    return NextResponse.json({ itinerary })

  } catch (error) {
    console.error('Generate Itinerary Error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
