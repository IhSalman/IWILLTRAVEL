# DGIS: Architectural Diagrams

This document contains the core architectural diagrams for the Data-Grounded Itinerary System (DGIS). These diagrams are written in **Mermaid.js** format and can be rendered directly in GitHub, VS Code, or exported to SVG/PNG for inclusion in the final thesis presentation.

---

## 1. Multi-Agent Pipeline Architecture
This diagram illustrates the 8-agent sequential and parallel flow, showing how data is passed from initial planning to the final verified output.

```mermaid
graph TD
    User([User Prompt]) --> A1[Agent 1: Discovery]
    A1 <--> |Tool Call| Google[Google Places API]
    A1 --> |Verified Venues| A2[Agent 2: Planning]
    A2 --> |Skeleton| A3[Agent 3: Research]
    A3 --> |Market Data| A4[Agent 4: Finance]
    A4 --> |Audit Results| A5[Agent 5: Experience]
    A5 --> |Cultural Data| A6[Agent 6: Logistics]
    A6 --> |Routes| A7[Agent 7: Sustainability]
    A7 --> |ESG Scores| A8[Agent 8: Composer]
    
    A8 --> DB[(Supabase JSONB)]
    A8 --> Client([React Frontend])
    
    style Google fill:#4285F4,color:white
    style DB fill:#3ECF8E,color:black
    style A2 fill:#f9f,stroke:#333,stroke-width:2px
```

---

## 2. Server-Sent Events (SSE) Streaming Lifecycle
This sequence diagram shows how the system maintains a persistent connection to prevent serverless timeouts while providing real-time feedback to the user.

```mermaid
sequenceDiagram
    autonumber
    participant Client as React Client
    participant API as Vercel Edge API
    participant Pipeline as Agent Pipeline
    participant DB as Supabase
    
    Client->>API: POST /api/agent-itinerary
    Note over API: Initialize SSE Connection
    API-->>Client: 200 OK (Connection: keep-alive)
    
    API->>Pipeline: executeItineraryPipeline()
    
    rect rgb(240, 240, 240)
        Note over Pipeline: Agent 1: Discovery
        Pipeline-->>API: Log: Verified Places
        API-->>Client: event: log (Agent 1)
    end
    
    rect rgb(220, 240, 220)
        Note over Pipeline: Agents 2-7: Sequential Enrichment
        Pipeline-->>API: Logs for Planning, Research, Audit, etc.
        API-->>Client: event: log (Agents 2, 3, 4, 5, 6, 7)
    end
    
    rect rgb(240, 240, 240)
        Note over Pipeline: Agent 8: Final Synthesis
        Pipeline-->>API: Final Itinerary JSON
        API-->>Client: event: result (Payload)
    end
    
    API->>DB: logAiUsage() & logPipelineRun()
    Note over API,Client: Close Stream
```

---

## 3. Database Schema (ER Diagram)
The system uses a flexible `JSONB` storage pattern to accommodate the complex, multi-dimensional outputs of the agents.

```mermaid
erDiagram
    USERS ||--o{ ITINERARIES : "generates"
    USERS ||--o{ AI_USAGE_LOGS : "consumes"
    
    ITINERARIES {
        uuid id PK
        uuid user_id FK
        text destination
        integer days
        jsonb payload "Full Itinerary Data"
        text cache_hash "SHA-256"
        timestamp created_at
    }
    
    AI_USAGE_LOGS {
        uuid id PK
        uuid user_id FK
        text model_name "Gemini 1.5 Flash/Pro"
        integer prompt_tokens
        integer completion_tokens
        float cost_usd
        timestamp created_at
    }
    
    USERS {
        uuid id PK
        text email
        text tier "Free/Pro"
    }
```

---

## 4. System Context Diagram (C4 Model)
A high-level view of how DGIS sits between the user and external data providers.

```mermaid
graph LR
    User((Traveler)) <--> WebApp[DGIS Web App]
    
    subgraph "DGIS Infrastructure (Vercel)"
        WebApp <--> API[Next.js API Routes]
        API <--> Agents[8-Agent Pipeline]
    end
    
    Agents <--> GoogleMaps[Google Places/Routes API]
    Agents <--> Gemini[Google Gemini AI]
    API <--> Supabase[(Supabase Database)]
    
    style DGIS fill:#f5f5f5,stroke:#333,stroke-dasharray: 5 5
```
