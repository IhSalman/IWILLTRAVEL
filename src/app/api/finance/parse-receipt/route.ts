/**
 * POST /api/finance/parse-receipt
 * ─────────────────────────────────────────────────────────────
 * Finance Auditor Agent — Pillar III of the 2026 Superapp
 *
 * Uses Centralized LLM Vision to extract structured expense data from
 * a photo of any travel receipt (restaurants, hotels, taxis…)
 * then converts to the user's home currency via Fixer/exchangerate.host.
 *
 * Output: { merchant, date, amount, currency, category, converted_amount, home_currency }
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { generateContent, logAiUsage } from '@/utils/ai-config';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BASE64_LENGTH = 14_000_000; // ~10 MB

// ── Currency Conversion ──────────────────────────────────────

async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount;

  try {
    // Uses exchangerate.host — completely free, no API key required
    const res = await fetch(
      `https://api.exchangerate.host/convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result ?? null;
  } catch {
    return null;
  }
}

// ── Route Handler ────────────────────────────────────────────

export async function POST(req: Request) {
  const authResult = await requireAuth();
  if ('error' in authResult) return authResult.error;

  try {
    const { imageBase64, mimeType, homeCurrency = 'USD' } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 });
    }

    const safeMime = typeof mimeType === 'string' ? mimeType.toLowerCase() : 'image/jpeg';
    if (!ALLOWED_MIME_TYPES.has(safeMime)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    if (typeof imageBase64 === 'string' && imageBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 400 });
    }

    const safeHomeCurrency = typeof homeCurrency === 'string'
      ? homeCurrency.trim().replace(/[^A-Z]/gi, '').substring(0, 3).toUpperCase()
      : 'USD';

    // ── LLM Vision Receipt Extraction ──
    const prompt = `You are a financial data extraction AI. Analyze this travel receipt image.
Extract the following fields and return ONLY valid JSON, no markdown, no explanation:
{
  "merchant": "name of the business",
  "date": "YYYY-MM-DD or null",
  "amount": <number, the total amount paid>,
  "currency": "3-letter ISO currency code (e.g. USD, EUR, JPY)",
  "category": "one of: Food, Transport, Accommodation, Activities, Shopping, Other",
  "line_items": [{"description": "...", "price": <number>}],
  "tip": <number or null>,
  "tax": <number or null>,
  "confidence": "high | medium | low"
}
If you cannot determine a field, use null. Always provide a best-guess for currency based on symbols ($ → USD, € → EUR, £ → GBP, ¥ → JPY).`;

    const { text, usage, model } = await generateContent(prompt, {
      role: 'analytical',
      json: true,
      image: { mimeType: safeMime, data: imageBase64 }
    });

    // Log usage (non-blocking)
    logAiUsage({
      userId: authResult.user.id,
      featureType: 'receipt-ocr',
      ...usage,
      model,
    }).catch(() => {});

    // ── Parse and Validate AI Response ──
    let extracted: Record<string, any> = {};
    try {
      const json = text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
      extracted = JSON.parse(json);
    } catch {
      return NextResponse.json({ error: 'Could not parse receipt data', raw: text }, { status: 422 });
    }

    // ── Currency Conversion ──
    const amount = typeof extracted.amount === 'number' ? extracted.amount : null;
    const fromCurrency = typeof extracted.currency === 'string' ? extracted.currency : 'USD';

    let convertedAmount: number | null = null;
    if (amount !== null) {
      convertedAmount = await convertCurrency(amount, fromCurrency, safeHomeCurrency);
    }

    return NextResponse.json({
      ...extracted,
      converted_amount: convertedAmount,
      home_currency: safeHomeCurrency,
    });
  } catch (error) {
    console.error('[FinanceAuditor] Error:', error);
    return NextResponse.json({ error: 'Unexpected error processing receipt' }, { status: 500 });
  }
}
