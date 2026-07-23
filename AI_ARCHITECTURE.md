# Trinetra Digital Offline AI Chatbot Architecture

## Executive Overview

This document presents the complete technical architecture and mathematical foundation of the **Trinetra Digital Offline AI Assistant**. 

The engine operates **100% locally inside the client's web browser**, guaranteeing **zero reliance on cloud AI services (No OpenAI, Gemini, Claude, Groq, or OpenRouter)**, requiring **zero API keys**, and incurring **zero recurring server costs**.

Despite running offline, the chatbot delivers intelligent, conversational, and context-aware business assistance using classical Natural Language Processing (NLP) techniques, hybrid mathematical vector retrieval, graph-based service recommendations, context preservation memory, and local CRM lead capture.

---

## 1. High-Level Architecture Diagram

```
                              ┌─────────────────────────────────────────┐
                              │               USER INPUT                │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   ▼
                                ┌──────────────────────────────────────┐
                                │        CLASSICAL NLP PIPELINE        │
                                │ Tokenizer • Stemmer • Entity Matcher │
                                └──────────────────┬───────────────────┘
                                                   │
                         ┌─────────────────────────┴────────────────────────┐
                         ▼                                                  ▼
      ┌────────────────────────────────────┐             ┌────────────────────────────────────┐
      │     MULTI-LAYER INTENT ENGINE      │             │    HYBRID SEMANTIC SEARCH ENGINE   │
      │ Primary & Secondary Classification │             │  BM25 + TF-IDF + Cosine + Fuzzy    │
      └──────────────────┬─────────────────┘             └──────────────────┬─────────────────┘
                         │                                                  │
                         └─────────────────────────┬────────────────────────┘
                                                   │
                                                   ▼
                                ┌──────────────────────────────────────┐
                                │      CONVERSATION MEMORY & GRAPH     │
                                │ User Attributes + Graph Relationships│
                                └──────────────────┬───────────────────┘
                                                   │
                                                   ▼
                                ┌──────────────────────────────────────┐
                                │          RESPONSE COMPOSER           │
                                │ KB Merging + Dynamic CTAs & Chips    │
                                └──────────────────┬───────────────────┘
                                                   │
                         ┌─────────────────────────┴────────────────────────┐
                         ▼                                                  ▼
      ┌────────────────────────────────────┐             ┌────────────────────────────────────┐
      │    ACTION & CRM ENGINE (LOCAL)     │             │    CONTINUOUS LEARNING & ANALYTICS │
      │ Lead Capture + Appointment Booking │             │ Unknown Query Logs + Usage Stats   │
      └────────────────────────────────────┘             └────────────────────────────────────┘
```

---

## 2. Classical NLP Pipeline

The NLP pipeline transforms raw text strings into normalized, structured tokens for classification and semantic indexing:

1. **Tokenization & Lowercasing**: Normalizes strings by converting to lowercase and stripping punctuation while retaining alpha-numeric tokens.
2. **Stopword Removal**: Filters non-informative high-frequency English functional words (e.g. *the, is, at, which, on*).
3. **Porter Stemming Algorithm**: Reduces inflectional word forms to their root stem (e.g., *"developing" → "develop"*, *"pricing" → "price"*).
4. **N-Gram Generation**: Extracts unigrams, bigrams, and trigrams to identify multi-word domain phrases (e.g., *"website development"*, *"google ads"*).
5. **Synonym & Query Expansion**: Expands token representations using a localized digital agency dictionary (e.g., mapping *"webpage"* or *"site"* to *"website"*, *"cost"* to *"pricing"*).
6. **Entity Extraction**: Rule-based regex engine extracting user entities:
   - **Name**: Pattern matching (*"My name is..."*, *"Call me..."*)
   - **Phone**: Indian 10-digit mobile number validator (*+91 / 0*)
   - **Email**: Standard RFC-compliant email regex
   - **City**: Known city dictionary (*Gorakhpur, Lucknow, Delhi...*) + contextual prepositions (*"in Gorakhpur"*)
   - **Business Type**: Industry keywords (*Healthcare, Clinic, Real Estate, Solar, Coaching...*)
   - **Budget**: Numeric + unit currency matchers (*"15k", "25,000", "under 50k"*)

---

## 3. Hybrid Semantic Search Engine & Mathematical Formulas

The search engine retrieves knowledge base articles by computing a weighted hybrid score combining 5 complementary algorithms:

$$\text{Final Score} = 0.30 \cdot S_{\text{BM25}} + 0.30 \cdot S_{\text{TFIDF}} + 0.20 \cdot S_{\text{Keyword}} + 0.10 \cdot S_{\text{Synonym}} + 0.10 \cdot S_{\text{Fuzzy}} + \text{Boost}_{\text{Priority}}$$

### A. Term Frequency-Inverse Document Frequency (TF-IDF)
Measures the relevance of term $t$ in document $d$ relative to the entire corpus $D$:

$$\text{TF}(t, d) = \frac{f_{t,d}}{\sum_{t' \in d} f_{t',d}}$$

$$\text{IDF}(t, D) = \ln\left(\frac{|D| + 1}{\text{DF}(t) + 0.5}\right) + 1$$

$$\text{TFIDF}(t, d, D) = \text{TF}(t, d) \times \text{IDF}(t, D)$$

### B. Okapi BM25 Ranking Algorithm
BM25 applies non-linear term frequency saturation and document length normalization ($k_1 = 1.5, b = 0.75$):

$$\text{Score}_{\text{BM25}}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$

### C. Cosine Similarity Vector Distance
Measures the cosine of the angle between query vector $\vec{V}_q$ and document vector $\vec{V}_d$:

$$\text{Cosine Similarity}(\vec{V}_q, \vec{V}_d) = \frac{\vec{V}_q \cdot \vec{V}_d}{\|\vec{V}_q\| \|\vec{V}_d\|} = \frac{\sum_{i=1}^{n} V_{q,i} V_{d,i}}{\sqrt{\sum_{i=1}^{n} V_{q,i}^2} \sqrt{\sum_{i=1}^{n} V_{d,i}^2}}$$

### D. Levenshtein Edit Distance & Fuzzy Matching
Computes minimum single-character edits (insertions, deletions, substitutions) required to change string $a$ into string $b$:

$$\text{LevSim}(a, b) = 1 - \frac{\text{LevDist}(a, b)}{\max(|a|, |b|)}$$

---

## 4. Multi-Label Intent Detection Engine

Intents are detected using a 3-layer hierarchical fallback strategy:

1. **Layer 1: Exact Regex & Phrase Pattern Classifier** (Matches explicit intent trigger phrases with 95% confidence).
2. **Layer 2: Keyword Cluster & Synonym Density Matrix** (Calculates weighted token density for intent categories).
3. **Layer 3: TF-IDF Exemplar Similarity** (Compares query vector against reference exemplar sentences).

### Supported Taxonomy
- **Primary Intents**: `Greeting`, `Pricing`, `Appointment`, `Website`, `SEO`, `Google Ads`, `Meta Ads`, `WhatsApp Automation`, `CRM`, `AI Automation`, `AI Avatar`, `Social Media Marketing`, `Business Automation`, `Support`, `Contact`, `Career`, `Thanks`, `Goodbye`, `Unknown`.
- **Secondary Intents**: `Buying Intent`, `Information Seeking`, `Price Sensitivity`, `Urgency`, `Technical Question`, `Objection`.

---

## 5. Knowledge Graph & Recommendation Engine

Every Knowledge Base item contains relational graph attributes:

```json
{
  "id": "service-website",
  "related_services": ["service-seo", "service-google-ads", "service-crm"],
  "prerequisites": [],
  "next_step": "service-seo",
  "upsell": "service-crm",
  "cross_sell": ["service-seo", "service-google-ads"]
}
```

### Canonical Service Progression Pathway
The recommendation engine guides prospective buyers through the logical business growth sequence:

$$\text{Website Development} \longrightarrow \text{SEO} \longrightarrow \text{Google/Meta Ads} \longrightarrow \text{Custom CRM} \longrightarrow \text{WhatsApp Automation} \longrightarrow \text{AI Business Automation}$$

Dynamic suggestion chips are automatically synthesized after every answer by combining graph traversal nodes (`next_step`, `cross_sell`) with current user context.

---

## 6. Conversation Memory & Local Storage Persistence

The system maintains real-time user context preserved in browser `localStorage` (`trinetra_chat_user_memory_v1`):

- **User Attributes**: Name, Phone, Email, Business Type, City, Budget, Preferred Service.
- **Session State**: Last Intent, Previous Categories Explored, Active Form Flow (`idle` | `lead_capture` | `appointment_booking`).
- **Sliding Message Window**: Preserves the last 20 chat messages for instant restoration upon page reload.

---

## 7. Mini CRM & Continuous Learning System

### Local Mini CRM Engine
All lead requests and 1-on-1 strategy call bookings are captured into `localStorage` (`trinetra_crm_appointments_v1`).
- **Dashboard Features**: Filter by status (*Upcoming, Completed, Cancelled*), client search, single-click status updates, record deletion.
- **Exporting**: One-click export to official CSV file for sales team processing.

### Continuous Learning System
Queries returning confidence below 35% are recorded in `trinetra_unknown_queries_v1`. Administrators can review unhandled queries in the Admin Panel and convert them directly into new Knowledge Base articles with zero coding.

---

## 8. Plug-and-Play LLM Integration Strategy

The engine is engineered with strict separation of concerns:

```
[ UI Component (ChatWidget) ]
             │
             ▼
[ Custom Hook (useTrinetraBot) ]
             │
   ┌─────────┴─────────┐
   ▼                   ▼
[ Local Offline ]   [ Cloud LLM Provider ] (Future)
  (Current Engine)    (e.g., OpenAI / Gemini / Custom vLLM)
```

To plug in a real LLM in the future:
1. Replace `responseComposer.compose()` call in `useTrinetraBot.ts` with an `async` API call to your backend LLM proxy.
2. Pass the top matching KB articles from `hybridSearchEngine.search()` as grounded context (RAG - Retrieval Augmented Generation).
3. The UI components (`ChatWidget.tsx`), Lead Capture forms, Mini CRM, and Admin Panel will remain 100% unchanged.
