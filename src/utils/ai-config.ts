/**
 * Central AI Configuration & Cost Calculator
 * 
 * Single source of truth for:
 * - Active model selection (reads from Supabase `app_settings` or env fallback)
 * - Pricing per model (input / output token rates)
 * - Cost calculation utility
 * - Token usage logging helper
 */
import { createAdminClient } from '@/utils/supabase/admin';

// ─── Supported Models ─────────────────────────────────────────────────────────

export const SUPPORTED_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash-lite',
] as const;

export type SupportedModel = typeof SUPPORTED_MODELS[number];

// ─── Pricing Matrix ($ per 1M tokens) ─────────────────────────────────────────

export const MODEL_PRICING: Record<string, { input: number; output: number; thinking?: number }> = {
    'gemini-2.5-flash':      { input: 0.15,  output: 0.60,  thinking: 0.25 },
    'gemini-2.5-pro':        { input: 1.25,  output: 10.00, thinking: 1.25 },
    'gemini-2.0-flash':      { input: 0.10,  output: 0.40  }, // Deprecated June 2026
    'gemini-2.0-flash-lite': { input: 0.025, output: 0.10  },
};

export const MODEL_INFO: Record<string, { label: string; description: string; tier: string }> = {
    'gemini-2.5-flash':      { label: 'Gemini 2.5 Flash',      description: 'Best balance of speed and quality', tier: 'Recommended' },
    'gemini-2.5-pro':        { label: 'Gemini 2.5 Pro',        description: 'Highest quality, slower and more expensive', tier: 'Premium' },
    'gemini-2.0-flash-lite': { label: 'Gemini 2.0 Flash Lite', description: 'Ultra-cheap, lower quality', tier: 'Economy' },
};

// ─── In-memory cache to avoid hitting DB on every request ─────────────────────

let cachedModel: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Get the active AI model. Reads from `app_settings` table with 1-min cache.
 * Falls back to env `GEMINI_MODEL` or `gemini-2.5-flash`.
 */
export async function getActiveModel(): Promise<string> {
    const now = Date.now();
    if (cachedModel && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedModel;
    }

    try {
        const supabase = createAdminClient();
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'active_model')
            .single();

        if (data?.value) {
            const model = typeof data.value === 'string' ? data.value : JSON.parse(JSON.stringify(data.value));
            // Strip surrounding quotes from JSONB string values
            const cleaned = String(model).replace(/^"|"$/g, '');
            if (MODEL_PRICING[cleaned]) {
                cachedModel = cleaned;
                cacheTimestamp = now;
                return cleaned;
            }
        }
    } catch {
        // DB not available — fall through to env/default
    }

    const fallback = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    cachedModel = fallback;
    cacheTimestamp = now;
    return fallback;
}

/**
 * Invalidate the cached model selection (call after admin changes the model).
 */
export function invalidateModelCache(): void {
    cachedModel = null;
    cacheTimestamp = 0;
}

// ─── Cost Calculation ─────────────────────────────────────────────────────────

/**
 * Calculate the estimated cost given a model and token counts.
 */
export function calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gemini-2.5-flash'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
}

/**
 * Extract token metadata from a Gemini API response object.
 */
export function extractTokens(response: any): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
} {
    const meta = response?.usageMetadata;
    return {
        inputTokens: meta?.promptTokenCount ?? 0,
        outputTokens: meta?.candidatesTokenCount ?? 0,
        totalTokens: meta?.totalTokenCount ?? 0,
    };
}

// ─── Usage Logging Helper ─────────────────────────────────────────────────────

interface LogUsageParams {
    userId: string;
    featureType: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
    requestData?: Record<string, unknown>;
}

/**
 * Log AI token usage to `ai_usage_logs` with accurate cost calculation.
 * Uses admin client to bypass RLS.
 */
export async function logAiUsage(params: LogUsageParams): Promise<void> {
    try {
        const costEstimate = calculateCost(params.model, params.inputTokens, params.outputTokens);
        const supabase = createAdminClient();

        const { error } = await supabase.from('ai_usage_logs').insert({
            user_id: params.userId,
            feature_type: params.featureType,
            tokens_used: params.totalTokens,
            input_tokens: params.inputTokens,
            output_tokens: params.outputTokens,
            model_used: params.model,
            cost_estimate: costEstimate,
            request_data: params.requestData || {},
        });

        if (error) {
            console.error('[AI Config] Usage log insert failed:', error.message);
        } else {
            console.log(`[AI Config] Logged ${params.totalTokens} tokens ($${costEstimate.toFixed(6)}) for ${params.featureType}`);
        }
    } catch (err) {
        console.error('[AI Config] Failed to log AI usage:', err);
    }
}
