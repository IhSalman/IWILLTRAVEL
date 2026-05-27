$chapter5 = @'

---

## 5. Implementation

### 5.1 Technology Stack

The following technologies were used in the implementation of DGIS:

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Web framework | Next.js 14 (App Router) | Serverless API routes; built-in streaming support |
| Language | TypeScript | Static typing reduces integration errors across agents |
| LLM provider | Google Gemini API | Gemini 2.5 Flash provides strong JSON generation; configurable via admin |
| Place data | Google Places API (New) | Structured, verified venue data with field mask cost control |
| Routing data | Google Routes API | Real walking and transit times between activity locations |
| Geocoding fallback | Nominatim (OpenStreetMap) | Free, no-key geocoding for coordinates not returned by Places API |
| Input validation | Zod | Runtime schema enforcement with structured error output |
| Database | Supabase (PostgreSQL) | Auth, itinerary storage, usage logging, cache |
| Deployment | Vercel | Serverless functions with 300s timeout on Pro plan |
| Flight data | Travelpayouts, Amadeus, Kiwi | Tiered fallback for real flight pricing |

### 5.2 Agent Implementation Details

#### 5.2.1 Model Configuration

Both LLM agents (Agent 1 and Agent 9) call the same getActiveModel() function, which reads the configured model name from the Supabase app_settings table, with a one-minute in-memory cache to minimise database reads. If the database is unavailable, the system falls back to the GEMINI_MODEL environment variable, and if that is absent, to gemini-2.5-flash. This design means the same model is used across both LLM agents; there is no per-agent model routing. All non-LLM agents (2 through 8) do not invoke the language model.

The responseMimeType parameter is set to application/json for both LLM agent calls, instructing the Gemini API to enforce JSON output format and reducing the need for post-hoc parsing. A maxOutputTokens value of 16,384 is set to accommodate full itinerary responses.

#### 5.2.2 Google Places API Integration

The googlePlaceDetails() function in tools.ts implements the two-step Places API (New) workflow:

Step 1: Text Search POST request to places.googleapis.com/v1/places:searchText with the activity name and city, requesting only id, displayName, and location fields. This retrieves the Place ID at minimal API cost.

Step 2: Place Details GET request to places.googleapis.com/v1/places/{placeId} with a comprehensive field mask covering displayName, formattedAddress, location, rating, userRatingCount, editorialSummary, photos, currentOpeningHours, priceLevel, and types.

The field mask is critical for cost control. The Google Places API (New) charges per field category requested; by specifying only the required fields, the per-request cost is minimised.

**Table 2: Google Places API Field Mask Configuration**

| Field Group | Fields Requested | Purpose |
|-------------|-----------------|---------|
| Identity | id, displayName | Place ID resolution |
| Location | formattedAddress, location | Address and coordinates |
| Quality | rating, userRatingCount | Factual rating data |
| Operations | currentOpeningHours | Weekly opening schedule |
| Content | editorialSummary, photos | Narrative and imagery |
| Classification | priceLevel, primaryType, types | Categorisation |

#### 5.2.3 Streaming Implementation

The pipeline returns a ReadableStream with the following event types:

- log events: emitted after each agent completes, containing agent name, duration in milliseconds, status (success or error), and optional detail string.
- result event: emitted once with the complete FinalItinerary JSON object.
- error event: emitted if a fatal pipeline error occurs.

This allows the client to display progressive agent status updates while the pipeline executes, improving perceived responsiveness. The encoder is a TextEncoder instance used to convert string events to Uint8Array chunks for the stream controller.

#### 5.2.4 Token Usage Logging

After the pipeline completes, token usage metadata from both LLM agent calls (Agent 1 and Agent 9) is extracted from the Gemini API response using the extractTokens() utility function, which reads the usageMetadata field of the response object. These token counts, along with the model name and a per-token cost estimate, are written to the ai_usage_logs table in Supabase. This logging is asynchronous and non-blocking; a failure in logging does not affect the pipeline result.

### 5.3 Error Handling and Fallback Behaviour

The pipeline implements a three-tier fallback strategy for external data:

1. Primary source: Live API call (Google Places, Travelpayouts, Amadeus, Kiwi)
2. Secondary source: Alternative provider in the tiered fallback chain
3. Tertiary source: Statistically estimated values (clearly labelled with isEstimate: true) or empty values

For place details, if the Google Places API returns no result for an activity, the placeDetails entry for that activity is omitted from the research object. Agent 9 handles this gracefully by falling back to LLM-generated descriptive text for activities without verified API data.

For geographic coordinates specifically, a two-level fallback is implemented: Google Places is queried first; if no coordinates are returned, Nominatim is queried with a 3-second timeout and a 300ms inter-request delay to respect the Nominatim usage policy.

'@
Add-Content -Path 'thesis_draft.md' -Value $chapter5 -Encoding UTF8
Write-Host "Chapter 5 done"
