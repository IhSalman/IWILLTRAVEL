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
import { z } from 'zod';

/**
 * Convert a Zod schema to a JSON Schema the model can be constrained with.
 * Returns null if the schema can't be represented (callers fall back to plain JSON mode).
 */
function toModelJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> | null {
    try {
        const { $schema: _drop, ...rest } = z.toJSONSchema(schema, { unrepresentable: 'any' }) as Record<string, unknown>;
        return rest;
    } catch {
        return null;
    }
}

// ─── Supported Models ─────────────────────────────────────────────────────────

export const SUPPORTED_MODELS = [
    'gemini-pro-latest',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'google/gemma-4-31b-it',
    'google/gemma-4-26b-a4b-it',
    'google/gemma-4-26b-a4b',
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
] as const;

export type SupportedModel = typeof SUPPORTED_MODELS[number];

// ─── Pricing Matrix ($ per 1M tokens) ─────────────────────────────────────────

export const MODEL_PRICING: Record<string, { input: number; output: number; thinking?: number }> = {
    'gemini-pro-latest':             { input: 1.25,  output: 10.00 },
    'gemini-flash-latest':           { input: 0.15,  output: 0.60  },
    'gemini-2.5-flash':              { input: 0.10,  output: 0.40  },
    'gemini-2.5-pro':                { input: 1.25,  output: 5.00  },
    'google/gemma-4-31b-it':         { input: 0.30,  output: 1.20  },
    'google/gemma-4-26b-a4b-it':     { input: 0.20,  output: 0.80  },
    'google/gemma-4-26b-a4b':        { input: 0.20,  output: 0.80  },
    'google/gemma-4-31b-it:free':    { input: 0.00,  output: 0.00  },
    'google/gemma-4-26b-a4b-it:free':{ input: 0.00,  output: 0.00  },
};

export const MODEL_INFO: Record<string, { label: string; description: string; tier: string }> = {
    'gemini-pro-latest':             { label: 'Gemini Pro',                 description: 'Highest quality reasoning', tier: 'Premium' },
    'gemini-flash-latest':           { label: 'Gemini Flash',               description: 'Balanced speed and quality', tier: 'Recommended' },
    'gemini-2.5-flash':              { label: 'Gemini 2.5 Flash',           description: 'Fast Gemini model', tier: 'Standard' },
    'gemini-2.5-pro':                { label: 'Gemini 2.5 Pro',             description: 'Flagship Gemini model', tier: 'Premium' },
    'google/gemma-4-31b-it':         { label: 'Gemma 4 31B (OpenRouter)',   description: 'Flagship open model for planning & narrative', tier: 'Premium' },
    'google/gemma-4-26b-a4b-it':     { label: 'Gemma 4 26B (OpenRouter)',   description: 'Fast MoE model for analysis & speed', tier: 'Standard' },
    'google/gemma-4-26b-a4b':        { label: 'Gemma 4 26B (OpenRouter)',   description: 'Fast MoE model', tier: 'Standard' },
    'google/gemma-4-31b-it:free':    { label: 'Gemma 4 31B Free',           description: 'Free tier Gemma 4', tier: 'Free' },
    'google/gemma-4-26b-a4b-it:free':{ label: 'Gemma 4 26B Free',           description: 'Free tier Gemma 4 MoE', tier: 'Free' },
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
    // 1. If OpenRouter API key is present, default to Gemma 4
    if (process.env.OPENROUTER_API_KEY) {
        return process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it';
    }

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

    const fallback = process.env.GEMINI_MODEL || 'gemini-flash-latest';
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

/**
 * Get Tiered Model based on agent role.
 * - 'creative' (Agent 8 Composer): Flagship model for long-form narrative synthesis
 * - 'planner' (Agent 2 Skeleton): Fast structured model for Truth Pool selection & geo-clustering
 * - 'analytical' (Co-Pilot, Parser, Sentinel): Fast low-latency model for intent & classification
 */
export async function getTieredModel(role: 'creative' | 'analytical' | 'planner'): Promise<string> {
    // If OpenRouter is configured, prioritize Gemma 4 models
    if (process.env.OPENROUTER_API_KEY) {
        if (role === 'analytical' || role === 'planner') {
            return process.env.OPENROUTER_MODEL_ANALYTICAL || 'google/gemma-4-26b-a4b-it';
        }
        return process.env.OPENROUTER_MODEL_CREATIVE || process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it';
    }

    if (role === 'creative') {
        return process.env.GEMINI_MODEL_PRO || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    } else {
        return process.env.GEMINI_MODEL_FLASH || 'gemini-2.5-flash';
    }
}

// ─── LLM Execution ────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Universal LLM generator with OpenRouter -> Gemini fallback.
 */
export async function generateContent(
    promptOrMessages: string | { role: string; content: string }[],
    options: {
        model?: string;
        role?: 'creative' | 'analytical' | 'planner';
        json?: boolean;
        /** Constrain output to this JSON Schema where the provider supports it (OpenRouter json_schema). */
        jsonSchema?: { name: string; schema: Record<string, unknown> };
        systemInstruction?: string;
        image?: { mimeType: string; data: string }; // base64
        modalities?: ('TEXT' | 'AUDIO')[];
        speechConfig?: { voiceName: string };
    } = {}
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number }; model: string; audio?: string }> {
    const messages = typeof promptOrMessages === 'string' 
        ? [{ role: 'user', content: promptOrMessages }]
        : promptOrMessages;
    
    const modelName = options.model || await getTieredModel(options.role || 'creative');
    const isOpenRouter = modelName.includes('/');

    // 1. Try OpenRouter if applicable
    if (isOpenRouter && process.env.OPENROUTER_API_KEY) {
        try {
            console.log(`[LLM] Attempting OpenRouter call with ${modelName}...`);
            
            let openRouterMessages: any[] = options.systemInstruction 
                ? [{ role: 'system', content: options.systemInstruction }, ...messages]
                : messages;

            // Handle image in OpenRouter (if provided)
            if (options.image) {
                openRouterMessages = [
                    ...(options.systemInstruction ? [{ role: 'system', content: options.systemInstruction }] : []),
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: typeof promptOrMessages === 'string' ? promptOrMessages : messages[messages.length - 1].content },
                            { type: 'image_url', image_url: { url: `data:${options.image.mimeType};base64,${options.image.data}` } }
                        ]
                    }
                ];
            }

            const callOpenRouter = (responseFormat: unknown) =>
                fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://iwilltravel.ai',
                        'X-Title': 'iWillTravel',
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: openRouterMessages,
                        response_format: responseFormat,
                    }),
                    signal: AbortSignal.timeout(60_000), // per call; retries × calls must fit the 300 s function limit
                });

            // Prefer schema-constrained output; it removes most JSON/shape retries.
            // strict:false so optional fields are allowed and unsupported keywords don't hard-fail.
            const schemaFormat = options.jsonSchema
                ? {
                      type: 'json_schema',
                      json_schema: { name: options.jsonSchema.name, strict: false, schema: options.jsonSchema.schema },
                  }
                : undefined;
            const plainFormat = options.json || options.jsonSchema ? { type: 'json_object' } : undefined;

            let response = await callOpenRouter(schemaFormat ?? plainFormat);
            if (!response.ok && schemaFormat && (response.status === 400 || response.status === 422)) {
                // Model/provider doesn't support json_schema → retry once in plain JSON mode.
                console.warn(`[LLM] ${modelName} rejected json_schema (${response.status}); retrying with json_object`);
                response = await callOpenRouter(plainFormat);
            }

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenRouter Error (${response.status}): ${error}`);
            }

            const data = await response.json();
            return {
                text: data.choices[0].message.content,
                usage: {
                    inputTokens: data.usage?.prompt_tokens || 0,
                    outputTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0
                },
                model: modelName
            };
        } catch (error) {
            console.warn(`[LLM] OpenRouter failed, falling back to Gemini:`, error);
            // Fall through to Gemini logic
        }
    }

    // 2. Gemini Fallback
    const geminiModel = (options.role === 'analytical' || options.role === 'planner')
        ? (process.env.GEMINI_MODEL_FLASH || 'gemini-2.5-flash')
        : (process.env.GEMINI_MODEL_PRO || process.env.GEMINI_MODEL || 'gemini-2.5-flash');
    console.log(`[LLM] Using Gemini (${geminiModel})...`);
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
        model: geminiModel,
        systemInstruction: options.systemInstruction,
    }, {
        apiVersion: 'v1beta'
    });

    const chat = model.startChat({
        history: messages.slice(0, -1).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        })),
    });

    const lastMessage = messages[messages.length - 1].content;
    let result;

    const generationConfig: any = {};
    if (options.json || options.jsonSchema) generationConfig.responseMimeType = 'application/json';
    if (options.modalities) generationConfig.responseModalities = options.modalities;
    if (options.speechConfig) {
        generationConfig.speechConfig = {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: options.speechConfig.voiceName },
            },
        };
    }

    if (options.image) {
        result = await model.generateContent({
            contents: [{ role: 'user', parts: [
                { inlineData: { mimeType: options.image.mimeType, data: options.image.data } },
                { text: lastMessage }
            ]}],
            generationConfig
        });
    } else {
        result = await model.generateContent({
            contents: chat.params?.history 
                ? [...(chat.params.history as any), { role: 'user', parts: [{ text: lastMessage }] }]
                : [{ role: 'user', parts: [{ text: lastMessage }] }],
            generationConfig
        });
    }
    
    const usage = extractTokens(result.response);
    const text = result.response.text?.() || '';
    
    // Extract audio if present
    let audio: string | undefined;
    if (options.modalities?.includes('AUDIO')) {
        const candidate = result.response.candidates?.[0];
        const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);
        audio = audioPart?.inlineData?.data;
    }

    return {
        text,
        usage,
        model: geminiModel,
        audio
    };
}

/**
 * Structured LLM generator with Zod runtime validation and self-healing retry loop
 * (Thesis Section 4.5, Figure 5: Error-Feedback Regeneration Loop).
 */
export async function generateStructuredWithRetry<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options: {
        model?: string;
        role?: 'creative' | 'analytical' | 'planner';
        systemInstruction?: string;
        maxRetries?: number;
        customValidator?: (data: T) => string | null;
    } = {}
): Promise<{
    data: T;
    usage: { inputTokens: number; outputTokens: number; totalTokens: number };
    model: string;
    attempts: number;
}> {
    const maxRetries = options.maxRetries ?? 2;
    const conversation: { role: string; content: string }[] = [
        { role: 'user', content: prompt },
    ];

    const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let lastError = 'Unknown schema validation failure';
    let lastModel = 'unknown';

    // Constrain generation to the same schema Zod validates against.
    const modelSchema = toModelJsonSchema(schema as z.ZodType<unknown>);

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        const res = await generateContent(conversation, {
            model: options.model,
            role: options.role || 'creative',
            json: true,
            ...(modelSchema ? { jsonSchema: { name: 'structured_output', schema: modelSchema } } : {}),
            systemInstruction: options.systemInstruction,
        });

        lastModel = res.model;
        totalUsage.inputTokens += res.usage.inputTokens;
        totalUsage.outputTokens += res.usage.outputTokens;
        totalUsage.totalTokens += res.usage.totalTokens;

        const cleaned = res.text
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        let rawJson: unknown;
        try {
            rawJson = JSON.parse(cleaned);
        } catch (parseErr: any) {
            lastError = `JSON syntax error: ${parseErr.message}`;
            console.warn(`[StructuredLLM] Attempt ${attempt} failed JSON.parse: ${lastError}`);
            conversation.push({ role: 'assistant', content: res.text });
            conversation.push({
                role: 'user',
                content: `Your output failed JSON parsing (${lastError}). Return ONLY a valid raw JSON object with no markdown fences or trailing text.`,
            });
            continue;
        }

        const parsed = schema.safeParse(rawJson);
        if (!parsed.success) {
            const issueSummary = parsed.error.issues
                .slice(0, 6)
                .map((iss) => `${iss.path.join('.') || 'root'}: ${iss.message}`)
                .join('; ');
            lastError = `Zod schema violation: ${issueSummary}`;
            console.warn(`[StructuredLLM] Attempt ${attempt} failed Zod validation: ${lastError}`);
            conversation.push({ role: 'assistant', content: cleaned });
            conversation.push({
                role: 'user',
                content: `Your JSON violated the required schema (${issueSummary}). Fix these exact fields and return ONLY the corrected raw JSON.`,
            });
            continue;
        }

        if (options.customValidator) {
            const domainErr = options.customValidator(parsed.data);
            if (domainErr) {
                lastError = `Domain constraint violation: ${domainErr}`;
                console.warn(`[StructuredLLM] Attempt ${attempt} failed domain validation: ${lastError}`);
                conversation.push({ role: 'assistant', content: cleaned });
                conversation.push({
                    role: 'user',
                    content: `Your JSON failed deterministic grounding check: ${domainErr}. Correct it strictly and return ONLY valid raw JSON.`,
                });
                continue;
            }
        }

        return {
            data: parsed.data,
            usage: totalUsage,
            model: lastModel,
            attempts: attempt,
        };
    }

    throw new Error(`[StructuredLLM] Exhausted ${maxRetries + 1} attempts. Last error: ${lastError}`);
}

/**
 * Universal LLM streamer with OpenRouter -> Gemini fallback.
 * Returns a ReadableStream of text chunks.
 */
export async function streamContent(
    promptOrMessages: string | { role: string; content: string }[],
    options: {
        model?: string;
        role?: 'creative' | 'analytical';
        systemInstruction?: string;
    } = {}
): Promise<{ stream: ReadableStream; model: string; getUsage: () => Promise<{ inputTokens: number; outputTokens: number; totalTokens: number }> }> {
    const messages = typeof promptOrMessages === 'string' 
        ? [{ role: 'user', content: promptOrMessages }]
        : promptOrMessages;

    const modelName = options.model || await getTieredModel(options.role || 'creative');
    const isOpenRouter = modelName.includes('/');

    // 1. Try OpenRouter Streaming
    if (isOpenRouter && process.env.OPENROUTER_API_KEY) {
        try {
            console.log(`[LLM] Attempting OpenRouter Stream with ${modelName}...`);
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: options.systemInstruction 
                        ? [{ role: 'system', content: options.systemInstruction }, ...messages]
                        : messages,
                    stream: true,
                }),
            });

            if (!response.ok) throw new Error(`OpenRouter Stream failed: ${response.status}`);

            const reader = response.body?.getReader();
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            
            let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

            const stream = new ReadableStream({
                async start(controller) {
                    if (!reader) return controller.close();
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            const chunk = decoder.decode(value);
                            const lines = chunk.split('\n').filter(l => l.trim().startsWith('data: '));
                            for (const line of lines) {
                                const dataStr = line.replace('data: ', '').trim();
                                if (dataStr === '[DONE]') continue;
                                try {
                                    const data = JSON.parse(dataStr);
                                    const text = data.choices[0]?.delta?.content || '';
                                    if (text) controller.enqueue(encoder.encode(text));
                                    if (data.usage) usage = { 
                                        inputTokens: data.usage.prompt_tokens, 
                                        outputTokens: data.usage.completion_tokens, 
                                        totalTokens: data.usage.total_tokens 
                                    };
                                } catch {}
                            }
                        }
                    } finally {
                        controller.close();
                    }
                }
            });

            return { stream, model: modelName, getUsage: async () => usage };
        } catch (err) {
            console.error(`[LLM] OpenRouter Stream failed, falling back to Gemini:`, err);
        }
    }

    // 2. Gemini Fallback Streaming
    const geminiModel = options.role === 'analytical' ? 'gemini-flash-latest' : 'gemini-pro-latest';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
        model: geminiModel,
        systemInstruction: options.systemInstruction,
    });

    const chat = model.startChat({
        history: messages.slice(0, -1).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        })),
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessageStream(lastMessage);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) controller.enqueue(encoder.encode(text));
            }
            controller.close();
        }
    });

    return { 
        stream, 
        model: geminiModel, 
        getUsage: async () => extractTokens(await result.response) 
    };
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
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gemini-flash-latest'];
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
    userId?: string | null;
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

        // Sanitize userId for Postgres UUID column (guests -> null)
        const validUserId = params.userId && params.userId !== 'guest' ? params.userId : null;

        const { error } = await supabase.from('ai_usage_logs').insert({
            user_id: validUserId,
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

// ─── Pipeline Run Logger ──────────────────────────────────────────────────────

interface LogPipelineRunParams {
    userId: string | null;
    destination: string;
    days: number;
    budget?: string;
    travelStyle?: string;
    totalMs: number;
    success: boolean;
    errorMessage?: string;
    agentLogs: Array<{ agent: string; durationMs: number; status: string; details?: string; timestamp: string }>;
    inputTokens?: number;
    outputTokens?: number;
    model?: string;
}

/**
 * Persist a full pipeline execution record (all 8 agent logs) to
 * `agent_pipeline_logs` for benchmarking and thesis evidence.
 * Fire-and-forget — never throws.
 */
export async function logPipelineRun(params: LogPipelineRunParams): Promise<void> {
    try {
        const supabase = createAdminClient();
        const { error } = await supabase.from('agent_pipeline_logs').insert({
            user_id:       params.userId,
            destination:   params.destination,
            days:          params.days,
            budget:        params.budget,
            travel_style:  params.travelStyle,
            total_ms:      params.totalMs,
            success:       params.success,
            error_message: params.errorMessage,
            agent_logs:    params.agentLogs,
            input_tokens:  params.inputTokens ?? 0,
            output_tokens: params.outputTokens ?? 0,
            model_used:    params.model,
        });

        if (error) {
            console.error('[Pipeline Log] Insert failed:', error.message);
        } else {
            console.log(`[Pipeline Log] Saved run for ${params.destination} (${params.totalMs}ms, ${params.agentLogs.length} agents)`);
        }
    } catch (err) {
        console.error('[Pipeline Log] Failed to persist:', err);
    }
}
