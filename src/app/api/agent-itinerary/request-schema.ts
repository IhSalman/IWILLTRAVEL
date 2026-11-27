/** Shared validation for itinerary generation requests (SSE route and background jobs). */
import { z } from 'zod';

export const AgentRequestSchema = z.object({
    destination: z.string().min(2),
    days: z.number().int().min(1).max(30),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    budget: z.enum(['budget', 'moderate', 'luxury', 'custom']),
    travelStyle: z.enum(['relaxed', 'balanced', 'adventure', 'cultural']),
    travelerType: z.enum(['single', 'couple', 'family', 'friends']),
    interests: z.array(z.string()).default([]),
    transport: z.enum(['public', 'rental', 'walking']),
    originCity: z.string().optional(),
    includeFlights: z.boolean().optional().default(false),
    includeHotels: z.boolean().optional().default(false),
    customBudget: z.number().optional(),
    currency: z.string().optional().default('USD'),
});

export type AgentRequest = z.infer<typeof AgentRequestSchema>;
