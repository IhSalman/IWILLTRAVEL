$chapter7 = @'

---

## 7. Ethics and Reliability

### 7.1 AI Ethics and Hallucination

The deployment of language model-based systems in consumer-facing applications raises ethical concerns that extend beyond technical performance. The primary concern in the context of travel planning is the risk of hallucination: a system that confidently presents incorrect information about venue addresses, operating hours, or transportation options may cause a user to arrive at a closed venue, follow incorrect directions, or make financial decisions based on false pricing data. These are not merely inconveniences; in travel contexts, they can result in missed transport connections, wasted money, or safety risks in unfamiliar locations.

The DGIS architecture attempts to address this risk through structural means: by retrieving factual operational data from the Google Places API rather than generating it from parametric model memory, the system separates facts (which must be verified) from prose (which can be generated). However, this separation is not complete. Agent 1 generates the list of place names using the LLM, and if the model names a venue that does not exist, the Places API lookup will return no result. In such cases, the system falls back to LLM-generated descriptive text, which may contain inaccuracies.

To mitigate remaining hallucination risk, the following practices are recommended and partially implemented:
- Activities for which no Google Places result was found should be visually flagged in the user interface as AI-generated and unverified.
- Users should be informed that itinerary data is sourced from a combination of AI generation and live API retrieval, and that opening hours and prices may have changed.
- The system should not claim certainty about information it cannot verify.

### 7.2 Data Privacy and GDPR

The DGIS system processes user-supplied input data including travel preferences, origin city, travel dates, and budget level. Under the General Data Protection Regulation (GDPR) (European Parliament, 2016), the following considerations apply:

**Data Minimisation.** The system collects only the data necessary to generate an itinerary. No biometric, health, or sensitive personal data is collected or required.

**Anonymous Guest Access.** The system supports guest usage without account creation. In guest mode, usage is tracked via client-side local storage rather than server-side user records, meaning no personal identifier is stored server-side.

**Purpose Limitation.** Input data is used exclusively for itinerary generation. It is not shared with third parties for advertising or profiling purposes.

**Third-Party API Transmission.** Destination names and activity names are transmitted to Google APIs (Places, Routes, Weather) as part of API requests. Users should be informed of this in the application privacy policy. These transmissions are covered by Google's API terms of service and privacy policy.

**Data Retention.** Generated itineraries are stored in the Supabase PostgreSQL database and associated with a user account where applicable. Users have the right to request deletion of their data under GDPR Article 17. This right should be implemented through a user-facing account deletion feature.

**No Sensitive Data Processing.** The system does not process special categories of personal data as defined in GDPR Article 9.

### 7.3 Transparency and Responsible Use

Academic and technical transparency requires that the limitations of the system be communicated clearly in both this thesis and in any production deployment:

1. The system is not an authoritative travel information service. It is an AI-assisted planning tool that supplements, but does not replace, official information sources such as venue websites, airline booking systems, and government travel advisories.

2. Pricing data for flights and hotels is sourced from third-party APIs and may not reflect current availability. Estimates labelled with isEstimate: true are statistically derived and should not be used for financial planning without independent verification.

3. The sustainability scoring (Agent 8) uses estimated transport distances and published emission factors. It is indicative, not certified, and should not be used for regulatory or compliance purposes.

4. The LLM components (Agents 1 and 9) may exhibit bias towards popular tourist destinations, activities associated with certain cultural contexts, or recommendations that reflect patterns in the training data. Users from diverse cultural backgrounds may find recommendations less relevant.

### 7.4 Research Reliability

The reliability of the findings presented in Chapter 6 is subject to several constraints:

**Reproducibility.** The monolithic LLM baseline uses a temperature of 0.7, meaning outputs are non-deterministic. Re-running the same prompt will produce different activity lists and different factual claims. The results reported represent a single execution. Future work should use temperature 0 and multiple independent runs to estimate variance.

**Construct Validity.** Field completeness as defined in this evaluation measures the presence of data, not its usefulness. A field may be present but incorrect (as demonstrated by the address mismatch case in Section 6.3), or present but irrelevant (opening hours for a public park that has no gating). The metric is a necessary but not sufficient indicator of itinerary quality.

**Internal Validity.** The use of Google Places as both data source and ground truth inflates the DGIS completeness score relative to an independent ground truth. This limitation is acknowledged in Section 6.4.

**External Validity.** The single-destination, single-execution design limits the generalisability of results. The findings suggest that the DGIS architecture has potential for improving factual completeness, but this should be interpreted as preliminary evidence rather than a definitive conclusion.

---

## 8. Conclusion

This thesis has presented the design, implementation, and preliminary evaluation of the Data-Grounded Itinerary System (DGIS), an eight-agent pipeline architecture for AI-assisted travel itinerary generation. The system was motivated by the well-documented tendency of large language models to generate factually incorrect operational details — addresses, opening hours, and ratings — with unwarranted confidence.

The central architectural contribution is the separation of factual data retrieval from linguistic generation. The Google Places API is used as a deterministic data source for venue-level facts, while the Gemini LLM is reserved for tasks where natural language generation provides genuine value: itinerary skeleton creation (Agent 1) and narrative composition (Agent 9). This design is consistent with the principles of modular software architecture (Parnas, 1972; Dijkstra, 1982) and with the Retrieval-Augmented Generation paradigm (Lewis et al., 2020).

The preliminary evaluation at Kuopio, Finland demonstrated that the DGIS pipeline produced measurably more complete factual data than a monolithic baseline: address presence increased from 44% to 100%, verified addresses from 22% to 100%, opening hours from 0% to 78%, and geographic coordinates from 0% to 100%. These results support the hypothesis that architectural separation of concerns, combined with deterministic API grounding, can improve the factual reliability of AI-generated travel content.

However, significant limitations apply. The evaluation covers a single destination and a single test run. The use of Google Places as both data source and ground truth creates a favourable bias. No user study was conducted. These limitations mean that the findings should be interpreted as preliminary evidence of the architecture's potential, not as definitive proof of superiority.

Future work should address these limitations through multi-destination evaluations, independent ground truth verification, controlled user studies measuring planning utility, and exploration of the latency-accuracy trade-off inherent in multi-phase API-grounded pipelines.

The broader implication of this work is that the reliability of AI-assisted information systems depends not only on the capability of the underlying language model, but on the architectural decisions that determine how and whether factual information is verified before it reaches the user.

---

## 9. References

Asai, A., Wu, Z., Wang, Y., Sil, A. and Hajishirzi, H. (2023) Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection. arXiv preprint arXiv:2310.11511. Available at: https://arxiv.org/abs/2310.11511 (Accessed: 1 May 2025).

Bang, Y., Cahyawijaya, S., Lee, N., Dai, W., Su, D., Wilie, B., Lovenia, H., Ji, Z., Yu, T., Chung, S., Do, Q.V., Xu, Y. and Fung, P. (2023) A Multitask, Multilingual, Multimodal Evaluation of ChatGPT on Reasoning, Hallucination, and Interactivity. arXiv preprint arXiv:2302.04023. Available at: https://arxiv.org/abs/2302.04023 (Accessed: 28 April 2025).

Brown, T., Mann, B., Ryder, N., Subbiah, M., Kaplan, J., Dhariwal, P., Neelakantan, A., Shyam, P., Sastry, G., Askell, A., Agarwal, S., Herbert-Voss, A., Krueger, G., Henighan, T., Child, R., Ramesh, A., Ziegler, D., Wu, J., Winter, C., Hesse, C., Chen, M., Sigler, E., Litwin, M., Gray, S., Chess, B., Clark, J., Berner, C., McCandlish, S., Radford, A., Sutskever, I. and Amodei, D. (2020) Language Models are Few-Shot Learners. Advances in Neural Information Processing Systems, 33, pp. 1877-1901. Available at: https://arxiv.org/abs/2005.14165 (Accessed: 30 April 2025).

Dijkstra, E.W. (1982) On the role of scientific thought. In: Selected Writings on Computing: A Personal Perspective. New York: Springer, pp. 60-66.

European Parliament (2016) Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016 on the protection of natural persons with regard to the processing of personal data and on the free movement of such data (General Data Protection Regulation). Official Journal of the European Union, L 119, pp. 1-88.

Google DeepMind (2024) Gemini: A Family of Highly Capable Multimodal Models. arXiv preprint arXiv:2312.11805. Available at: https://arxiv.org/abs/2312.11805 (Accessed: 1 May 2025).

Google Developers (2024) Places API (New) documentation. Available at: https://developers.google.com/maps/documentation/places/web-service/overview (Accessed: 28 April 2025).

Google Developers (2024) Routes API documentation. Available at: https://developers.google.com/maps/documentation/routes (Accessed: 28 April 2025).

Hickson, I. (2015) Server-Sent Events. W3C Recommendation. Available at: https://www.w3.org/TR/eventsource/ (Accessed: 2 May 2025).

Ji, Z., Lee, N., Frieske, R., Yu, T., Su, D., Xu, Y., Ishii, E., Bang, Y., Dai, W., Madotto, A. and Fung, P. (2023) Survey of Hallucination in Natural Language Generation. ACM Computing Surveys, 55(12), pp. 1-38. Available at: https://doi.org/10.1145/3571730 (Accessed: 27 April 2025).

Jonas, E., Schleier-Smith, J., Sreekanti, V., Tsai, C., Khandelwal, A., Pu, Q., Shankar, V., Carreira, J., Krauth, K., Yadwadkar, N., Gonzalez, J.E., Popa, R.A., Stoica, I. and Patterson, D.A. (2019) Cloud Programming Simplified: A Berkeley View on Serverless Computing. arXiv preprint arXiv:1902.03383. Available at: https://arxiv.org/abs/1902.03383 (Accessed: 2 May 2025).

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Kuttler, H., Lewis, M., Yih, W., Rocktaschel, T., Riedel, S. and Kiela, D. (2020) Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. Advances in Neural Information Processing Systems, 33, pp. 9459-9474. Available at: https://arxiv.org/abs/2005.11401 (Accessed: 29 April 2025).

Marcus, G. and Davis, E. (2019) Rebooting AI: Building Artificial Intelligence We Can Trust. New York: Pantheon Books.

Maynez, J., Narayan, S., Bohnet, B. and McDonald, R. (2020) On Faithfulness and Factuality in Abstractive Summarization. In: Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics, pp. 1906-1919. Available at: https://doi.org/10.18653/v1/2020.acl-main.173 (Accessed: 29 April 2025).

Nii, H.P. (1986) Blackboard Systems: The Blackboard Model of Problem Solving and the Evolution of Blackboard Architectures. AI Magazine, 7(2), pp. 38-53.

OpenAI (2023) GPT-4 Technical Report. arXiv preprint arXiv:2303.08774. Available at: https://arxiv.org/abs/2303.08774 (Accessed: 1 May 2025).

Parnas, D.L. (1972) On the Criteria to be Used in Decomposing Systems into Modules. Communications of the ACM, 15(12), pp. 1053-1058. Available at: https://doi.org/10.1145/361598.361623 (Accessed: 28 April 2025).

Vercel (2024) Vercel Functions documentation. Available at: https://vercel.com/docs/functions (Accessed: 2 May 2025).

Wooldridge, M. (2009) An Introduction to MultiAgent Systems. 2nd edn. Chichester: John Wiley and Sons.

Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K. and Cao, Y. (2023) ReAct: Synergizing Reasoning and Acting in Language Models. In: Proceedings of the 11th International Conference on Learning Representations (ICLR 2023). Available at: https://arxiv.org/abs/2210.03629 (Accessed: 30 April 2025).

Zod (2024) Zod: TypeScript-first schema validation with static type inference. Available at: https://zod.dev (Accessed: 2 May 2025).

---

## 10. Appendices

### Appendix A: Agent Coherence Checklist

The following checklist was applied manually to each agent during development to verify that the single-responsibility principle was maintained:

| Check | Description |
|-------|-------------|
| Single output type | Agent produces exactly one type of result object |
| No cross-agent reads | Agent does not read outputs from later-phase agents |
| No LLM in pure-code agents | Agents 4, 5, 6, and 8 contain no language model calls |
| Error handling present | All external calls wrapped in try-catch with defined fallback |
| Logging present | Agent logs start, completion, and key metrics to console |
| Types defined | All input and output types defined in types.ts |

### Appendix B: Sample Evaluation Prompt (Monolithic Baseline)

The following prompt was used in the evaluation test script (kuopio_detail_test.mjs) to generate the monolithic baseline itinerary:

```
Plan a 3-day trip to Kuopio Finland for a budget solo traveler.
For each activity provide name, address, opening_hours, cost_eur, description.
Return JSON only.

JSON format:
{
  "days": [
    {
      "day": 1,
      "activities": [
        {
          "time": "morning",
          "name": "Place Name",
          "address": "Street, City",
          "opening_hours": "Mon-Fri 10-18",
          "cost_eur": "5",
          "description": "Short description."
        }
      ]
    }
  ]
}
```

Model: gemini-2.5-flash | Temperature: 0.7 | Max output tokens: 3000

### Appendix C: DGIS Agent File Map

The following source files implement the DGIS pipeline:

| File | Agent | Lines |
|------|-------|-------|
| src/app/api/agent-itinerary/route.ts | Orchestrator | 288 |
| src/app/api/agent-itinerary/agents/agent1-planning.ts | Agent 1 | 112 |
| src/app/api/agent-itinerary/agents/agent2-research.ts | Agent 2 | 243 |
| src/app/api/agent-itinerary/agents/agent3-experience.ts | Agent 3 | 57 |
| src/app/api/agent-itinerary/agents/agent4-flights.ts | Agent 4 | 62 |
| src/app/api/agent-itinerary/agents/agent5-budget.ts | Agent 5 | 48 |
| src/app/api/agent-itinerary/agents/agent6-route.ts | Agent 6 | 30 |
| src/app/api/agent-itinerary/agents/agent8-sustainability.ts | Agent 8 | 122 |
| src/app/api/agent-itinerary/agents/agent9-composer.ts | Agent 9 | 330 |
| src/app/api/agent-itinerary/tools.ts | API Tools | 1321 |
| src/app/api/agent-itinerary/types.ts | Type Definitions | 209 |
| src/utils/ai-config.ts | Model Config | 162 |

'@
Add-Content -Path 'thesis_draft.md' -Value $chapter7 -Encoding UTF8
Write-Host "Chapters 7-10 done"
