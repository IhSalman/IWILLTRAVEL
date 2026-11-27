# iWillTravel: Pricing Plan and Unit Economics

_Prepared 2026-11-27. The numbers come from `scripts/pricing-model.mjs`. Change its inputs and run it again when real usage data comes in._

**Target:** at least **40% net margin**, measured as (revenue after VAT − Stripe fees − every API cost − fixed infrastructure − the cost of free users) ÷ revenue after VAT.

---

## 1. TL;DR

| | Now | Recommended |
|---|---|---|
| Free | 2 trips/mo, any length | **1 trip/mo, up to 3 days, "lite" mode (cached data only)**. Guests see Day 1 only |
| Trip Pass (new) | — | **€5.99 one-off**: 1 full trip up to 21 days, PDF, alerts for 2 flights, 30 days of access |
| Starter → "Traveler" | €6/mo, unlimited trips | **€7.99/mo · €59/yr**: 5 trips/mo (up to 14 days each), 5 tracked flights |
| Pro | €12/mo, unlimited | **€16.99/mo · €119/yr**: 10 trips/mo fair use, 25 active flights, 3 aircraft-watch airports, 30 voice plays |
| Credit packs | €2 = 50 trips | **Remove.** Sell Trip Pass bundles instead (3 for €14.99) |
| Enterprise | custom | from **€299/mo** + **€0.60 per itinerary** over the included amount |

Expected margin with these prices and the cost fixes in §7: **about 34% at launch** (50 paying users, where fixed costs dominate), **45% at 500 paying users** and **47% at 3,000**. That holds as long as each paying user brings no more than about 10 active free users.

---

## 2. Problems found in the code (fix before you grow)

1. **Credit packs lose money.** In `src/utils/plan-limits.ts`, `CREDIT_PACKS` sells 50 credits for €2. `deductCredits(user.id, 1)` charges **1 credit per itinerary**, and an itinerary costs about $0.90. So the €2 pack can burn **about €27 of Google API calls**, and the €10 "Expert" pack about **€215**. This is the biggest leak.
2. **"Unlimited itineraries" on Starter and Pro.** A power user who makes 30 ten-day trips in a month costs about €40–50 against €5–10 of revenue. Every AI travel product puts a fair-use cap on this.
3. **The cost logging is wrong.** In `src/utils/ai-config.ts`, `MODEL_PRICING` lists Gemma 4 31B at $0.30/$1.20 per 1M tokens. OpenRouter currently charges about **$0.10/$0.34**. It also lists Gemini 2.5 Flash at $0.10/$0.40, but the fallback path really costs more. So `ai_usage_logs.cost_estimate` overstates LLM cost and **does not record Google Maps cost at all**, even though Maps is about 95% of variable cost.
4. **VAT.** EU consumer prices must include VAT, so €12 shown means about €10 actually earned at 20% VAT. Every margin in this document is calculated on the ex-VAT amount. Use Stripe Tax (+0.5%) or a merchant of record (Paddle or Lemon Squeezy, about 5% + €0.50, which handles VAT for you).

---

## 3. Unit prices used (checked November 2026)

| Service | What we call | Price | Free per month |
|---|---|---|---|
| Google Places **Text Search Enterprise** (rating, priceLevel, openingHours in the field mask) | Agent 1 discovery, Agent 5 area search | $35 / 1k | 1,000 |
| Google Places **Text Search Pro** (`id,displayName,location`) | ID lookup inside `googlePlaceDetails` | $32 / 1k | 5,000 |
| Google **Place Details Enterprise + Atmosphere** (`reviews`, `editorialSummary`) | Agent 3 and Agent 8 enrichment | $25 / 1k | 1,000 |
| Google Place Photos | `/api/place-photo`, PDF | $7 / 1k | 1,000 |
| Google Routes `computeRoutes` (Essentials) | Agent 8 transit legs | $5 / 1k | 10,000 |
| Google Geocoding | tools.ts | $5 / 1k | 10,000 |
| Google Maps JS (dynamic map) | `RoadmapMap.tsx` | $7 / 1k loads | 10,000 |
| Static Maps | PDF | $2 / 1k | 10,000 |
| OpenRouter Gemma 4 31B | creative agent | ~$0.10 in / $0.34 out per 1M | — |
| AeroDataBox via API.Market | flight alerts, airport boards | Pro $5 (6k units) · Ultra $30 (60k) · Mega $150 (600k) | 600 units on trial |
| Resend | email | $20 for 50k emails | 3k |
| ElevenLabs | `/api/tts` | ~$0.03–0.07 per play | — |
| Stripe | cards + Billing | ~2.2% blended + €0.25, plus 0.7% Billing | — |

Google bills each request at the **highest SKU among the fields you ask for**. One `reviews` field moves the whole Place Details call from $20 to $25.

---

## 4. What one itinerary costs

**How many calls a trip makes, counted from the code:**
- Agent 1: about 6 Text Searches (4 fixed queries plus interest hints)
- Agent 3: 1 Place Details per activity (about 4 per day), plus a billed ID lookup whenever Agent 1 had no `placeId`, plus 1 geocode
- Agent 5: 2 Text Searches per unique neighbourhood (about 0.6 per day)
- Agent 8: Place Details for swapped venues, up to 10 geocode fallbacks, and 1 `computeRoutes` per leg (about 3 per day)
- Viewing the trip: about 4 photos per day and about 3 map loads
- LLM (Agent 2 skeleton + Agent 8 narrative + retries): about 40k tokens in and 15k out, roughly **$0.02**. The LLM is almost free. **Google is the cost.**

Formula: `trip cost ≈ $0.02 LLM + ($0.24 + $0.23 × days) × (1 − cache hit rate)`

| Trip length | Cold, today | Warm, today (35% cache) | Warm, after §7 fixes (40% cache) |
|---|---|---|---|
| 3 days | $0.94 | $0.62 | $0.44 |
| 5 days | $1.39 | **$0.91** | **$0.62** |
| 10 days | $2.53 | $1.65 | $1.07 |
| Free "lite" 3 days (80% cache, pre-warmed cities) | | | **$0.16** |

**Google's free monthly calls** (1,000 Enterprise calls per SKU) cover your first **~50 trips each month**, so early costs will look lower than this table. The plan does not count on them.

## 5. What flight alerts cost

The polling cadence in `src/lib/flight-status/diff.ts` is: every 6 h when departure is more than 24 h away → hourly from 24 h to 3 h → every 10 min from 3 h before departure until landing.

- One flight tracked for 7 days ≈ 81 status calls × 2 units ≈ **160 units**
- On Ultra ($30 / 60k units): **about $0.08 per tracked flight**, so **$0.10** is used to leave headroom. Ultra covers about 370 flights per month. Mega covers about 3,700 at about $0.04 each.
- Aircraft watch (scheduled mode reads the board every 3 h): about 960 units per airport per month ≈ **$0.50 per airport per month**, shared by everyone watching that airport. Live mode uses free adsb.lol.
- Alert emails: $0.0004 each, which is negligible.

**Rule:** move up an AeroDataBox plan when usage reaches 70% of the current one. Never let tracking start without a logged-in paid user (this is already the case, see `flight-alerts-decisions`).

## 6. Fixed monthly costs

| Item | Launch | ~500 paying | ~3,000 paying |
|---|---|---|---|
| Vercel Pro + usage (300 s agent functions) | $20 | $50 | $150 |
| Supabase Pro + compute | $25 | $35 | $100 |
| Resend | $0 (free tier) | $20 | $20 |
| AeroDataBox | $5 | $30 | $150 |
| ElevenLabs | $5 | $22 | $22 |
| Fixer, domain, mail, monitoring | $10 | $20 | $30 |
| Background jobs (weekly eval of 5 trips, daily SEO guide, trip-monitor cron) | $15 | $20 | $30 |
| **Total** | **~$90** | **~$200** | **~$500** |

---

## 7. Cost cuts to make first (~30% lower cost per trip)

1. **Make the ID lookup free.** In `googlePlaceDetailsUncached` (`src/app/api/agent-itinerary/tools.ts`), the search mask `places.id,places.displayName,places.location` is billed as Pro at $32/1k. A mask of only `places.id` is the free *IDs Only* SKU. Use the location from the Details call instead. Saves about $0.03 per day of trip.
2. **Drop `reviews` and `editorialSummary` from the Details mask** ($25 → $20). Load them only when a user opens a venue card, through a separate on-demand call.
3. **Reuse Agent 1's pool in Agent 5.** Only run area searches when the pool has fewer than about 8 venues near that neighbourhood.
4. **Pre-warm the cache for the top 200 cities.** The `seo-guides` cron already visits these cities. Store the results under the same `gts:`/`gpd:` cache keys so free and lite trips hit the cache about 80% of the time.
5. **Make free trips lite.** Use only the cached pool, skip Routes (use straight-line distance with a walking estimate), and load photos only for the first 2 days.
6. **Log Google spend per run.** Count calls by SKU in `tools.ts`, write them to `agent_pipeline_logs`, and fix `MODEL_PRICING`. Then re-run this model with real numbers.

---

## 8. Margin by plan (after the §7 fixes, VAT removed)

| Plan and usage | Price | After VAT | Stripe | API cost | Profit | Margin |
|---|---|---|---|---|---|---|
| Free user (1 lite trip) | €0 | — | — | €0.14 | −€0.14 | — |
| Trip Pass (10-day trip, 2 flights) | €5.99 | €4.99 | €0.42 | €1.12 | €3.45 | **69%** |
| Traveler monthly, typical (2 trips × 6 days, 2 flights) | €7.99 | €6.66 | €0.48 | €1.42 | €4.76 | **71%** |
| Traveler monthly, at the cap (5 × 12 days, 5 flights) | €7.99 | €6.66 | €0.48 | €5.94 | €0.24 | 4% |
| Traveler yearly (€59) | €4.92 | €4.10 | €0.16 | €0.76 | €3.17 | **77%** |
| Pro monthly, typical (4 × 7 days, 6 flights, 1 airport) | €16.99 | €14.16 | €0.74 | €4.21 | €9.21 | **65%** |
| Pro monthly, at the cap (10 × 10 days, 25 flights, 3 airports) | €16.99 | €14.16 | €0.74 | €14.23 | −€0.81 | −6% |
| Pro yearly (€119) | €9.92 | €8.26 | €0.31 | €2.41 | €5.55 | **67%** |
| _For comparison: today's Pro €12, typical, no fixes_ | €12 | €10.00 | €0.60 | €5.62 | €3.78 | 38% |
| _For comparison: today's €2 credit pack (50 trips)_ | €2 | €1.67 | €0.31 | €26.87 | −€25.51 | −1530% |

The caps are where a plan only breaks even. Typical users make the money. That is the point of a fair-use cap: it protects you from the 3–5% of heavy users without the cap feeling stingy.

## 9. Whole-business check: does it reach 40%?

Plan mix assumed: 40% Traveler monthly, 20% Traveler yearly, 20% Pro monthly, 20% Pro yearly. 8% of users sit at the cap. Each paying user brings 10 active free users.

| Stage | Paying users | Active free users | Trip Passes per month | Revenue after VAT | Profit | **Margin** |
|---|---|---|---|---|---|---|
| Launch | 50 | 500 | 20 | €498 | €169 | 34% |
| Growth | 500 | 5,000 | 150 | €4,732 | €2,129 | **45%** |
| Scale | 3,000 | 30,000 | 800 | €27,895 | €13,041 | **47%** |
| Scale, free users 2.5× more active | 3,000 | 75,000 | 800 | €27,895 | €6,793 | 24% ⚠ |

**Free usage decides the margin.** Keep it below **15% of revenue after VAT**. If it goes higher, tighten free first (for example 1 lite trip every 2 months, or require email verification) before you touch paid prices.

**Break-even:** about 25 paying users cover the launch fixed costs. You pass 40% at about 150–200 paying users.

---

## 10. Marketing and pricing plan

**Positioning: "Your AI trip planner and flight tracker in one."**
- Anchor on what it replaces: TripIt Pro ($49/yr) + Wanderlog Pro (~$40/yr) + a Flighty-style tracker (~$60/yr) ≈ **$150/yr**. **Pro at €119/yr is cheaper than the three together.** Show this comparison on `/pricing`.
- Charge by **trips**, which is what travellers think in. Don't charge by credits or tokens.

**Design the tiers so Pro is the easy pick**
- Three cards: **Free · Traveler · Pro ("Most popular", highlighted)**, with Trip Pass as a line underneath ("Just one trip? €5.99").
- Default the toggle to **yearly** and label it "2 months free +". Yearly is 38–42% cheaper than monthly, and yearly users also bring the best margin (fewer Stripe €0.25 fixed fees, less churn between trips).
- Write prices as €7.99 / €16.99 and **show the VAT-inclusive price**.

**Travel is seasonal, so price for that**
- Most people plan 2–4 trips a year, so monthly subscribers cancel between trips. The **Trip Pass** captures those users (Flighty now sells a $4.99/week pass for the same reason), and the yearly plan holds on to frequent travellers.
- After a Trip Pass trip ends, send a "credit €5.99 toward a yearly plan" email (the `trip-emails` cron already exists).

**Launch offers**
- **Founding member:** the first 200 Pro yearly users pay €79/yr, with that price locked for life. Cap it publicly ("143 left").
- **Pro trial:** 7 days with a card required, **limited to 2 trips and 3 flights** so trials can't run up costs.
- Never offer a free trial of unlimited trips.

**Upgrade prompts (place them where the user hits a limit)**
- Free users see "Day 2–3 preview locked" and "Export PDF". Upsell the Trip Pass first, then Traveler.
- A Traveler user's 6th tracked flight → upsell Pro.
- A 15-day trip → "Traveler covers up to 14 days. Pro covers 21."

**Things not to do**
- No discounts based on purchasing power (PPP) on monthly plans. Google charges in USD whatever the user's country, so a 50% PPP price wipes out the margin. If you add PPP, apply it only to yearly plans with lower caps.
- No lifetime deals (AppSumo and similar): API costs never stop.

**Pricing experiments, once you have ~500 paying users**
1. Pro €16.99 against €14.99 (watch conversion × margin, not conversion alone).
2. Traveler with 5 trips against 3 trips.
3. Trip Pass €5.99 against €7.99.
Run each for at least 2 weeks or 300 checkout views.

---

## 11. Numbers to watch on the admin dashboard

| Metric | Target |
|---|---|
| Google + LLM cost per trip (5 days) | ≤ $0.65 |
| Cache hit rate for Places | ≥ 40% paid, ≥ 80% free |
| Free cost as % of revenue after VAT | ≤ 15% |
| Variable cost per paying user | ≤ 30% of their revenue after VAT |
| AeroDataBox units used | < 70% of the plan |
| Share of users at the cap | ≤ 5% (if higher, the cap is too generous or the price too low) |
| Free → paid conversion | 2–4% |

## 12. Assumptions to check

- **AeroDataBox units per flight-status call:** assumed to be 2. Check this on the API.Market dashboard after a day of real polling.
- **Exchange rate:** assumed $1 = €0.87.
- **VAT:** assumed 20% average. VAT depends on the customer's country (DE 19%, FR 20%, NL 21%).
- **Stripe fees:** assumed a mix of EEA and international cards (~2.2%).
- **Trip length and activity count:** assumed about 4 activities per day. Replace with real averages from `agent_pipeline_logs`.
- **Cache hit rates:** estimates for now. Measure them once step 6 of §7 ships.

Sources: [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing), [Places (New) SKU details](https://developers.google.com/maps/billing-and-pricing/sku-details/places), [March 2025 free-cap change](https://developers.google.com/maps/billing-and-pricing/march-2025), [OpenRouter Gemma 4 31B](https://openrouter.ai/google/gemma-4-31b-it), [AeroDataBox pricing](https://aerodatabox.com/pricing/), [TripIt pricing](https://www.tripit.com/uhp/pricing), [Flighty pricing](https://flighty.com/pricing), [Wanderlog price reference](https://www.endlesstravelplans.com/guides/planning-tools/wanderlog-alternatives-family-trip-planning).
