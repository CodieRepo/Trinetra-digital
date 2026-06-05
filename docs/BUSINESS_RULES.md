# Business & Product Rules Authority

This document defines the strict business rules, lead lifecycles, UI conventions, and conversational workflows that govern Trinetra CRM. All developers and AI agents must comply with these guidelines.

---

## 1. Lead Lifecycle & Pipeline Stages

Trinetra CRM tracks customer acquisition through a standard pipeline. The stages are strictly defined as:

| Stage Key | Display Label | Win Probability (Fallback) | Description |
|-----------|---------------|----------------------------|-------------|
| `new` | New Leads | 10% | Lead recently created from inbound WhatsApp message or website form. |
| `ai_qualifying` | AI Qualifying | 20% | AI chatbot is actively conversing with the lead to extract details. |
| `qualified` | Qualified | 60% | The lead has met the minimum qualification threshold (score >= 75). |
| `nurturing` | Nurturing | 40% | Automatic follow-up sequence or human advisor nurturing is active. |
| `won` | Won | 100% | Lead accepted a quotation and has been successfully onboarded. |
| `lost` | Lost | 0% | Lead was closed as lost or opted out of communications. |

### Intent-Based Probability
If the lead's `intent_level` is explicitly evaluated, the pipeline calculates win probabilities based on intent instead of the fallback stage defaults:
* **HOT:** 80% probability
* **QUOTATION_REQUIRED:** 70% probability
* **WARM:** 50% probability
* **COLD:** 20% probability

---

## 2. Revenue Modeling

### The Revenue Formula
All financial calculations and pipeline forecasting must use the canonical annual contract value formula:

$$\text{Annual Value} = \text{Setup Cost} + (\text{Monthly Recurring Revenue (MRR)} \times 12)$$

### Forecast Calculations
* **Pipeline Expected Revenue:** Calculated on active deals (`new`, `ai_qualifying`, `qualified`, `nurturing` stages):
  $$\text{Expected Revenue} = \text{Annual Value} \times \frac{\text{Win Probability (\%)}}{100}$$
* **Won Revenue:** The sum of annual value for all accepted quotations within the specified forecasting period.
* **Lost Revenue:** The sum of annual value for all leads marked as `lost` within the specified period.
* **Syncing Value:** Deal values (`deal_setup_value`, `deal_mrr`, `deal_annual_value`) are automatically synchronized to the `leads` table from the latest accepted or sent quotation version.

---

## 3. Lead Command Center Rules

* **Full Phone Number Visibility:** Always display the complete phone number with country code in all cards, profile sheets, and headers. Never mask or truncate phone numbers.
* **One-Click Actions:** Provide immediate, single-click options to:
  1. Open a direct WhatsApp chat window.
  2. Call the customer via telephone.
  3. Copy the phone number to the clipboard.
* **No-Reload Edits:** The lead's Name, Company, and Phone number must be editable inline directly on the lead card or profile panel without reloading the browser page.
* **Highlight Focus:** The active, selected lead in the list must have an obvious visual highlight state to prevent confusion in multi-threaded workspaces.
* **No Internal ID Exposures:** Raw database UUIDs, internal identifiers, and socket JIDs or LIDs (such as `919334757759@s.whatsapp.net` or `222483684843672@lid`) must **NEVER** appear in the user interface. Clean phone numbers and contact names must be displayed instead.

---

## 4. UI/UX Workspace Rules

* **Max Real Estate:** The main chat container and lead cards must utilize the maximum screen size. Avoid excessive padding or double scrollbars.
* **Fixed Composer:** The message input area (composer) must remain locked at the bottom of the conversation window, ensuring it is always visible when reading chat history.
* **Unobstructed Actions:** The right-hand sidebar panel (which shows lead intelligence, tasks, and quotation files) must not block or hide core chat actions.
* **Revenue Visibility:** The lead card, pipeline board card, and active conversation header must clearly show the estimated annual deal value and win probability.

### Mobile Screen UX
* **Full-Screen Chat:** On mobile viewpoints, when a lead conversation is opened, the sidebar navigation and message inbox list must hide completely. The screen must show the chat pane in full screen.
* **Back Navigation:** A prominent, styled "Back" button must be visible in the mobile chat header to allow the user to easily return to the inbox list.
* **No Horizontal Scroll:** The layout must be fully responsive. Horizontal scrolling is prohibited on all panels on mobile devices.

### Dashboard vs. Developer Settings
* **Business Overview:** The dashboard's main Overview analytics must display **only business-facing metrics** (expected revenue, active pipeline, win rate, average deal size, lead counts).
* **Technical Isolation:** No technical diagnostics (such as Nginx service, port bindings, database sizes, PM2 processes, raw RAM/CPU meters, or WebSocket state) may appear on the main dashboard. Technical metrics belong exclusively under **Settings → Developer Settings**.

---

## 5. Conversational State Machine & Safeguards

### Anti-Spam Cooldown
A minimum 5-second cooldown is enforced per WhatsApp JID. Any inbound messages arriving within this window must not trigger an automated AI response.

### Set-Based Message Deduplication
To prevent loops caused by network retries, the backend maintains a Set of processed message IDs (up to 500 entries). Incoming messages matching an ID in the Set are discarded.

### Human Handoff System
When human intervention is requested or required, the AI auto-reply must be locked out:
1. **Trigger Keywords:** Immediate escalation occurs if the user says Hindi/English words like "insaan chahiye", "talk to human", "connect agent", "customer care", or complains about "scam", "refund", "cheating".
2. **Context Threshold:** Handoff is automatically triggered on the 15th message if a lead demonstrates active buying or booking intent.
3. **Escalation Steps:** The database sets `ai_enabled = 0` on the lead, writes a pending alert to `handoff_alerts`, spawns a task, and notifies the administrator.
4. **Resuming AI:** Auto-reply remains paused until an administrator resolves the alert, resetting `ai_enabled = 1`.

### Appointment State Machine
When a lead requests a consultation, the system activates the booking state machine:
* Sets `active_flow = 'Booking'` and `active_intent = 'Booking Consultation'`.
* Guides the customer to capture Date and Time using natural Hinglish.
* Standardizes dates into `YYYY-MM-DD` and times into `HH:MM` using natural language parsing relative to current India Standard Time (IST).
* Once Date and Time are resolved, the system updates the appointments table, schedules a team task, notifies the administrator, clears the booking state, and starts a **3-message post-booking courtesy window** (allowing the bot to reply to polite thank-yous before fully clearing the active flow lock).

### Service Context Lock
When a lead asks about a specific service (e.g., website development), the system sets a 10-message service lock. During this period, all general questions (such as pricing or features) are answered specifically for that service. The lock is only broken if the customer explicitly mentions another service.
