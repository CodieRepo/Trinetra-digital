# Trinetra OS — Changelog

## [v1.1.0-offline-ai-assistant] — 2026-07-23

### Phase 5: Enterprise Offline AI Assistant & Search Engine
* **100% Local Classical NLP Engine:** Built an offline AI advisor running entirely in the client browser with zero cloud AI API dependencies (No OpenAI, Gemini, Claude, Groq, or OpenRouter).
* **Hybrid Semantic Search Engine:** Multi-vector retrieval fusing Okapi BM25 (30%), TF-IDF Cosine Similarity (30%), Keyword Title Ratio (20%), Synonym Matching (10%), and Levenshtein Edit Distance (10%) to output confidence scores (0–100%).
* **Multi-Label Intent Detection:** 19 Primary Intents and 6 Secondary Intents evaluated locally via regex patterns, keyword clusters, and TF-IDF exemplar similarity.
* **Knowledge Base & Knowledge Graph:** Extended structured JSON KB with relational graph nodes (`related_services`, `prerequisites`, `next_step`, `upsell`, `cross_sell`) guiding clients through canonical service growth pathways.
* **Conversation Memory Manager:** Local storage context preservation (`trinetra_chat_user_memory_v1`) tracking Name, Phone, Email, Business Type, City, Budget, Preferred Service, and sliding 20-message window.
* **Interactive In-Chat Lead Capture & Booking Cards:** Embedded form cards for lead collection and 1-on-1 strategy call bookings with input validation and confirmation UI.
* **Offline Mini CRM Engine:** Local CRM storage (`trinetra_crm_appointments_v1`) supporting status updates (*Upcoming, Completed, Cancelled*), search, deletion, and 1-click CSV Export.
* **Continuous Learning System & Analytics:** Local tracking of low-confidence queries (&lt; 35%) allowing administrators to convert unhandled user questions into new KB articles in 1 click.
* **Glassmorphism Floating Widget & Admin Portal:** Modern floating UI widget mounted across all pages with Web Speech API voice STT/TTS controls, typing indicator, sound toggles, and full-featured Admin Portal.
* **Complete System Documentation:** Comprehensive architectural whitepaper ([AI_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/AI_ARCHITECTURE.md)) detailing math formulas, NLP pipeline, and plug-and-play LLM integration strategy.

## [v1.0.0-trinetra-crm] — 2026-06-05

### Phase 1: WhatsApp Stabilization
* **Robust Multi-Device Gateway:** Implemented full Baileys integration for stable, persistent WhatsApp Web sessions.
* **Session Healing:** Automatic recovery for dropped sockets with intelligent exponential backoff.
* **Persistent Sessions:** Sessions are stored to disk to prevent repeated QR code scans.
* **QR Re-Authentication System:** Exposed secure QR bridging to the admin interface for real-time remote pairing.
* **Delivery Telemetry:** Complete ACK tracking (Sent, Delivered, Read, Played) with automatic timeline updates.

### Phase 2: AI Reliability
* **Multi-Provider Architecture:** Intelligent fallback across OpenRouter models.
* **Circuit Breakers:** Safeguards against looping, hallucination, and API token exhaustion.
* **Agentic Queueing:** Asynchronous message processing with strict FIFO ordering per lead.
* **Intent Classification Engine:** NLP pipeline to categorize inbound intents (General, Quote Request, Support, Meeting).

### Phase 3: CRM Intelligence
* **Lead Intelligence Cards:** Dynamic summaries storing business type, service interest, and urgency.
* **Contextual Summaries:** Rolling AI-generated summaries attached to the lead object for seamless human handoff.
* **Timeline Engine:** Comprehensive immutable event stream tracking AI actions, inbound/outbound messages, and stage changes.
* **Automated Task Creation:** Intelligent creation of follow-ups and escalation tickets based on lead intent.
* **Follow-up Auto Pause:** Halts automated nurturing when a lead requests a human or after successful conversion.

### Phase 4A: Revenue Conversion Engine
* **Proposal & Quotation Generator:** Automated PDF creation with company branding and scalable package tiers.
* **Quotation Versioning:** Immutable version history (v1 → v2 → v3) maintaining accurate audit trails.
* **Quote Delivery & Tracking:** Direct WhatsApp dispatch with Sent, Viewed, Accepted, and Rejected state transitions.
* **Expiry Automation:** Automatic 3-day pre-expiry alerts and auto-archiving of stale quotes.
* **Appointment Booking System:** Slot management, confirmation delivery, and dynamic reminder scheduling.

### Phase 4B: Sales Pipeline & Revenue Forecasting
* **Kanban Pipeline Board:** Interactive stage management with drag-and-drop validation.
* **Immutable Audit Trail:** Strict record of every stage movement, ensuring transparent accountability.
* **Revenue Forecasting:** Dynamic calculations linking Monthly Recurring Revenue (MRR), Setup Costs, and Deal Probability.
* **Stuck Lead Detection:** AI watchdogs scanning for leads idling >7 days and escalating at 14 days.
* **No-Reply Detection:** Automated 30-day "silent lead" resurfacing tasks.
