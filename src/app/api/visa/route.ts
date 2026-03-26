import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '@/utils/auth';
import { getActiveModel, extractTokens, logAiUsage } from '@/utils/ai-config';

const ALLOWED_TYPES = new Set(['visa_lookup', 'denial_risk', 'passport_power', 'simplify', undefined]);
const MAX_RAW_TEXT = 5_000;

export async function POST(req: Request) {
  // Require authentication to protect Gemini API credits
  const authResult = await requireAuth();
  if ('error' in authResult) return authResult.error;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'placeholder_gemini_key') {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured correctly' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    const { source, destination, rawText, type, profile } = body;

    // Validate type against the allowlist
    if (type !== undefined && !ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
      model: activeModelName,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    let prompt = '';

    if (type === 'denial_risk' && profile) {
      prompt = `You are a world-class immigration attorney and visa risk analyst. A traveler has provided their profile for a visa risk assessment. Analyze it carefully and provide an honest risk assessment.

Traveler Profile:
- Nationality: ${profile.nationality || 'Not provided'}
- Destination: ${profile.destination || 'Not provided'}
- Employment Status: ${profile.employment || 'Not provided'}
- Property Owned in Home Country: ${profile.ownsProperty || 'No'}
- Previous Visa Denials: ${profile.previousDenials || 'None'}
- Travel History (countries visited): ${profile.travelHistory || 'Limited'}
- Purpose of Visit: ${profile.purpose || 'Tourism'}
- Monthly Income Level: ${profile.income || 'Not provided'}
- Family Ties in Home Country: ${profile.familyTies || 'Not specified'}

You must respond with a JSON object containing EXACTLY:
- riskLevel: One of "Low Risk", "Moderate Risk", "High Risk", "Very High Risk"
- riskScore: A number from 0-100 (100 = highest risk)
- riskColor: One of "green", "yellow", "orange", "red"
- summary: A 2-sentence summary of their overall position.
- topRiskFactors: An array of exactly 3 objects, each with:
  - factor: The specific risk factor
  - severity: "high" | "medium" | "low"
  - advice: One specific action they can take to mitigate this risk.
- strengths: An array of 2-3 strings describing what works in their favor.
- interviewTips: An array of exactly 3 practical tips for their specific profile for the visa interview.
- denialCodes: An array of 1-2 objects with:
  - code: The relevant law or denial code
  - explanation: Plain English meaning of this code.
  - howToAvoid: One concrete step to avoid triggering this.

Respond ONLY with valid JSON.`;

    } else if (source && destination) {
      prompt = `You are a world-leading visa information expert and immigration strategist. Provide comprehensive, actionable visa intelligence for a citizen of ${source} traveling to ${destination} for tourism or business.

You must respond with a JSON object containing EXACTLY these fields:
- status: One of "Visa Required", "Visa-Free", "e-Visa Available", "Visa on Arrival", "eTA Required", "Visa Required - Difficult"
- statusColor: One of "green", "blue", "yellow", "orange", "red"
- description: A 2-3 sentence expert overview of the exact visa policy.
- processingTime: Realistic processing time.
- estimatedCost: Visa cost with currency.
- maxStay: Maximum permitted stay.
- denialRate: Estimated overall visa refusal rate as a percentage string.
- officialLinks: An array of 1-3 official resources, each with title and url.
- expertTips: An array of 3-4 insider tips specific to this travel pair.
- requirements: An array of 4-6 document objects, each with title, desc, and weight ("critical" | "important" | "recommended").
- refusalAdvice: An object with commonReasons (3 items), topDocuments (3 items), reapplyNote (1 sentence).
- warningsAndAlerts: An array of 0-2 important travel warnings. Empty array if none.

Guidelines:
- NEVER invent fake URLs. Only include real, verifiable official URLs.
- If visa-free, still provide entry requirements and set cost to "Free".

Respond ONLY with valid JSON.`;

    } else if (rawText) {
      // Cap raw text to prevent DoS / excessive token consumption
      const truncatedText = String(rawText).substring(0, MAX_RAW_TEXT);
      prompt = `You are a visa information simplifier and immigration legal advisor. Take this complex visa policy text and convert it into simple, actionable guidance.

You must respond with a JSON object containing:
- status: A short summary of the visa status extracted from the text.
- description: A 2-3 sentence plain English summary of the key points.
- requirements: An array of 4-6 actionable requirements, each with:
  - title: Simple name of the requirement.
  - desc: Plain English explanation.
  - weight: "critical" | "important" | "recommended"

Use simple language (8th grade reading level). Respond ONLY with valid JSON.

Input Text:
${truncatedText}`;

    } else if (type === 'passport_power' && source) {
      prompt = `You are an expert in global mobility and passport rankings. Provide a passport power snapshot for a citizen of ${source}.

You must respond with a JSON object containing EXACTLY:
- passportRank: Approximate global passport rank.
- visaFreeCount: Approximate number of visa-free/on-arrival destinations (as a number).
- mobilityScore: A score from 0-100 representing global mobility.
- mobilityLabel: A short label like "Elite", "Strong", "Average", "Limited".
- topDestinations: An array of 5 top visa-free travel destinations with country and entryType ("Visa-Free" | "e-Visa" | "Visa on Arrival").
- challengingDestinations: An array of 3 countries that require a full visa.
- tip: One practical tip for this passport holder to maximize their travel.

Respond ONLY with valid JSON.`;

    } else {
      return NextResponse.json({ error: 'Missing search parameters or text' }, { status: 400 });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Log AI usage
    const tokens = extractTokens(response);
    logAiUsage({
      userId: authResult.user.id,
      featureType: 'visa',
      inputTokens: tokens.inputTokens,
      outputTokens: tokens.outputTokens,
      totalTokens: tokens.totalTokens,
      model: activeModelName,
    }).catch(() => {});

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      console.error('JSON Parse Error in visa route:', text);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
  } catch (error) {
    console.error('Visa hub error:', error);
    // Security: never leak internal error details to the client
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
