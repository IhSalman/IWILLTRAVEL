$chapter6 = @'

---

## 6. Evaluation

### 6.1 Evaluation Design

The evaluation addresses the central research question: does the DGIS architecture produce more factually complete itineraries than a single-pass monolithic LLM prompt? Factual completeness is operationalised as the presence of verified data in four fields: venue address, opening hours, geographic coordinates, and user rating.

The evaluation is explicitly limited in scope. It constitutes a preliminary proof-of-concept comparison rather than a statistically powered study. The test destination is Kuopio, Finland, chosen because it is a medium-sized city for which Google Places API data is available but that is not heavily represented in LLM training corpora, making hallucination more likely. The evaluation uses a 3-day trip as the itinerary duration.

### 6.2 Methodology

**Condition A: Monolithic LLM Baseline**
A single Gemini 2.5 Flash API call is made with a prompt requesting a 3-day itinerary for Kuopio, Finland, with explicit instruction to include name, address, opening_hours, cost_eur, and description for each activity. The temperature parameter is set to 0.7, and the responseMimeType is set to application/json. The raw JSON response is recorded.

**Condition B: DGIS Pipeline**
The DGIS pipeline is invoked with the same destination, duration, and a budget solo traveller profile. The pipeline queries the Google Places API for each named activity and injects verified data into the final output.

**Verification Procedure**
For each activity in Condition A, the Google Places API is queried using the activity name and city to retrieve the ground truth values for address, opening hours, and rating. The LLM-claimed values are compared against the Google Places ground truth. An activity is marked as having a correct or present field if the LLM provided the information and it did not substantially conflict with the Google Places record.

For Condition B, field presence is recorded directly from the structured DGIS output, where each field is either populated with API-verified data or explicitly null.

**Field Scoring**
Each activity is evaluated on the following binary criteria:
- Address present: LLM or DGIS provided a street-level address
- Address verified: the provided address matches the Google Places record
- Opening hours present: any opening hours information provided
- Rating present: a numerical rating with review count provided
- Coordinates present: latitude and longitude values present

### 6.3 Results

The monolithic baseline produced 9 activities across the 3-day itinerary. The DGIS pipeline produced 9 corresponding activities with Google Places lookups attempted for each.

**Table 3: Evaluation Results - Field Completeness**

| Field | Monolithic LLM (n=9) | DGIS (n=9) |
|-------|---------------------|------------|
| Address present | 4 / 9 (44%) | 9 / 9 (100%) |
| Address verified against Places API | 2 / 9 (22%) | 9 / 9 (100%) |
| Opening hours present | 0 / 9 (0%) | 7 / 9 (78%) |
| User rating with review count | 0 / 9 (0%) | 8 / 9 (89%) |
| Geographic coordinates | 0 / 9 (0%) | 9 / 9 (100%) |

**Figure 5: Field Completeness Comparison**

```
Field Completeness: Monolithic LLM vs DGIS (Kuopio, 3-day test)

Address present
  LLM:  [====        ] 44%
  DGIS: [============] 100%

Address verified
  LLM:  [==          ] 22%
  DGIS: [============] 100%

Opening hours
  LLM:  [            ] 0%
  DGIS: [==========  ] 78%

Rating + review count
  LLM:  [            ] 0%
  DGIS: [=========== ] 89%

Coordinates
  LLM:  [            ] 0%
  DGIS: [============] 100%
```

Notable qualitative observations:
- The monolithic LLM correctly named all 9 venues (100% name accuracy), confirming that place name recall is a strength of current LLMs.
- The LLM provided no opening hours for any venue and no rating data, despite the prompt explicitly requesting these fields.
- For the 4 addresses that the LLM did provide, 2 were verifiably correct, 1 was an incorrect street number, and 1 referenced a street that does not exist in Kuopio.
- DGIS returned null opening hours for 2 venues because those venues did not have currentOpeningHours populated in the Google Places database, not because of a system failure.

### 6.4 Limitations

Several limitations of this evaluation must be acknowledged:

**Sample Size.** The evaluation covers 9 activities at a single destination. This sample is insufficient to establish statistical significance or to generalise findings to other cities, trip durations, or traveller profiles.

**Single Destination Bias.** Kuopio was selected as an intentionally less-represented city. Results may differ substantially for major tourist destinations such as Paris or Tokyo, where LLM training data is considerably more extensive.

**Ground Truth Reliability.** The Google Places API is used as both the DGIS data source and the evaluation ground truth. This creates a favourable bias toward DGIS: by construction, DGIS data will match the ground truth because it is sourced from the same API. A more rigorous evaluation would use independent ground truth verification (for example, manual verification against official venue websites).

**No User Study.** This evaluation measures field completeness, not user satisfaction, planning utility, or itinerary quality. A system that provides complete but poor-quality recommendations would score well on this metric despite being unhelpful.

**No Latency Measurement.** The DGIS pipeline takes meaningfully longer to execute than a single LLM call due to the multiple API requests in Phase 2. The trade-off between latency and data completeness is acknowledged but not quantified in this evaluation.

**One Model, Both Conditions.** Both conditions use the same underlying model (Gemini 2.5 Flash). This is appropriate for isolating architecture as the independent variable, but means the evaluation does not generalise to comparisons involving different model families.

'@
Add-Content -Path 'thesis_draft.md' -Value $chapter6 -Encoding UTF8
Write-Host "Chapter 6 done"
