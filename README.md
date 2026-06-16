# Ellie: The AI Intake & Client Engagement Agent

Ellie is a production-grade, AI-driven conversational agent designed to manage, qualify, and validate leads for **Achievement Behavior Services (ABS)**. Ellie is deployed as a responsive embeddable web widget (perfect for WordPress hosts) that guides parents through a compliance-checked intake funnel for Applied Behavior Analysis (ABA) therapy.

---

## 📖 Table of Contents
1. [Conversational Persona & Behavioral Rules](#1-conversational-persona--behavioral-rules)
2. [Dynamic Data Collection & Validation Funnel](#2-dynamic-data-collection--validation-funnel)
3. [RAG Knowledge Base & Query Routing](#3-rag-knowledge-base--query-routing)
4. [Session Security & Inactivity Locks](#4-session-security--inactivity-locks)
5. [Secure File Uploads & Database Integration](#5-secure-file-uploads--database-integration)
6. [Interactive UI/UX Features](#6-interactive-uiux-features)
7. [Iframe Hosting & WordPress Communication](#7-iframe-hosting--wordpress-communication)
8. [Directory Structure & Architecture](#8-directory-structure--architecture)
9. [Local Setup & Dev Commands](#9-local-setup--dev-commands)

---

## 1. Conversational Persona & Behavioral Rules

Ellie is defined by a strict set of human-like persona rules that prevent she from sounding like a generic corporate chatbot:
* **Conciseness**: Ellie speaks in brief, short turns (1–2 sentences max), asking only **one question at a time** to keep the parent engaged.
* **Natural Expression**: She avoids bulleted lists, long definitions, or rigid structural comparisons. She refers to herself as `"Ellie"` (never `"AI"`) and prefers using `"we"` (representing the ABS clinical team).
* **Funnel Redirection**: If a user tries to change the subject, Ellie briefly responds (using the RAG engine if it's a question) and immediately redirects them back to the current step in the checklist.
* **Off-Topic Rejection**: If the user repeatedly sends messages unrelated to ABA therapy or ABS services, Ellie redirects them up to a threshold and then politely closes the chat session.
* **Security & Prompt Protection**: Ellie is strictly forbidden from explaining her internal prompts, system state, database connections, API configurations, or the tools she has access to.

---

## 2. Dynamic Data Collection & Validation Funnel

Ellie collects information in a strict linear order to ensure compliance, valid database entry, and clinical eligibility. If a user volunteers information out of order, Ellie acknowledges and saves it, but immediately reverts to asking the earliest missing required question:

### 1. Interest
* Ellie confirms the parent is specifically seeking ABA therapy. If the parent explicitly states they do not want ABA therapy, Ellie politely ends the conversation.

### 2. Location & State Verification
* Ellie collects the parent's City and State.
* **Automatic Normalization**: Obvious city values (e.g., `"nyc"`, `"new york city"`, `"atlanta"`) are automatically recognized, and their states (`NY`, `GA`) are normalized without prompting.
* **Service Area Boundaries**: If the location falls outside Ellie's supported states (**NY, NJ, CT, GA, or NC**), the parent is politely informed that ABS does not service their area, and the intake ends.

### 3. Contact Details
* Ellie collects the parent's email address and phone number.
* **Validations**: If the email or phone number is invalid (missing `@`, incomplete phone digits, etc.), Ellie pauses the flow to request a valid format.

### 4. Insurance Provider
* Ellie collects the name of the insurance carrier.
* **Carrier Normalization**: Standard abbreviations (e.g., `"uhc"`) are normalized (e.g., `UnitedHealthcare`) before database storage.

### 5. Parent & Child Names
* Ellie collects the parent's full name and the child's name.

### 6. Child Age & Eligibility (Optional DOB)
* Ellie asks for the child's Date of Birth.
* **Eligibility Rule**: ABS exclusively serves children between **2 and 22 years old**. If the child's age is verified to fall outside this range, the user is politely rejected. If the parent skips providing the DOB, Ellie proceeds, assuming the age is valid.

### 7. Insurance Card Upload (Optional)
* Ellie invites the parent to upload a photo of the front of their insurance card using the attachment button in the chat interface.

### 8. Behavioral Goals (Optional)
* Ellie asks for specific behavioral or communication goals. If the parent gives a vague answer (e.g., `"talking"`), Ellie gently probes for one layer of daily-life detail.

---

## 3. RAG Knowledge Base & Query Routing

Ellie has access to a compiled local Retrieval-Augmented Generation (RAG) system to answer parent queries mid-conversation without breaking the intake flow:

* **Static Compilation**: ABS website assets, locations, policies, and insurance guidelines are compiled into a optimized JSON database: [compiled-knowledge.json](file:///home/rafay/Code/ABC-Achieve-AI-Agent/lib/agent/compiled-knowledge.json).
* **Category Routing**: The AI calls the `queryKnowledgeBase` tool, routing the query to specific directories (`insurance`, `locations`, `clinical`, `company`, `guides`) based on nouns in the user's question.
* **Location Inquiries**: If the user asks about service clinics or locations, Ellie naturally lists:
  * **In-Home ABA**: Available in NY, NJ, CT, GA, and NC.
  * **Center-Based clinics**: Located in Malverne, NY and Douglasville, GA.
* **Flow Resumption**: Immediately after delivering the RAG answer, Ellie prompts the user with the current checklist question to continue the intake.

---

## 4. Session Security & Inactivity Locks

### 2-Hour Session Expiry
* The active conversation history and session parameters are saved securely in browser `localStorage`.
* The session features a **sliding 2-hour window**. Every message sent or received extends the session's expiration timestamp by 2 hours.
* If a parent returns after 2 hours of inactivity, the client detects the expiration, automatically deletes the session storage, and initializes a clean conversation.

### 45-Second Auto-Follow-Up
* If the user sits idle on a question for **45 seconds** after the last assistant message, the widget automatically sends a friendly follow-up: *"Hi, are you still there?"* to prompt them back into the funnel.

### 5-Minute/10-Minute Inactivity Lock
* If all required fields are filled, but the parent abandons the chat before completing or skipping the optional steps:
  * If the user returns and types a message after **10 minutes** of inactivity, the system marks the intake as complete and locks it.
  * This is checked by comparing the current time with the last database write timestamp (`updated_at`) and message history timestamps.

### Dynamic Tool Stripping (Hallucination Prevention)
* Once the intake is locked as complete (either normally or via inactivity timeout), the `/api/chat` route dynamically deletes the `updateLeadProgress` tool from the tools schema.
* Because the tool is removed from the execution scope, the LLM cannot attempt database updates, preventing any database duplication or AI hallucinations.

---

## 5. Secure File Uploads & Database Integration

### Zero-Bypass Secure Uploads
* To support uploading insurance cards without overloading serverless functions (which have memory limits and strict request execution limits):
  1. The client widget requests a secure, pre-signed upload URL from `/api/upload`.
  2. The widget uploads the file directly to Supabase storage buckets via a HTTP `PUT` request.
  3. The widget appends the returned public asset URL as an annotation: `[Uploaded File URL: <url>]` inside the user's message body.
  4. The LLM extracts the URL and maps it to the database payload.

### Real-time Lead Progress Accumulation
* The agent calls the `updateLeadProgress` tool as soon as at least **one contact detail** (email or phone) is provided.
* On every subsequent turn, the agent builds a single growing payload, appending newly collected information to previous details (preserving already saved fields) to maintain database integrity.

---

## 6. Interactive UI/UX Features

* **Quick Prompts**: Renders floating quick-response bubbles (like `"Yes"`, `"No"`, `"Español"`) that automatically populate the text area and submit immediately.
* **Spanish Support**: If the user clicks `"Español"` or requests Spanish, Ellie translates the conversation flow and queries the bilingual components of the knowledge base.
* **Randomized Greetings**: Shows rotating launcher bubbles (e.g., *"How can I help? 👋"*, *"Need support with ABA therapy?"*) next to the chat launcher to invite parents to open the widget.
* **Interactive Previews**: Displays image attachment previews directly in the chat composer before upload.
* **Fluid Scrolling**: Smooth, automatic scrolling to the latest messages as they stream or as files upload.

---

## 7. Iframe Hosting & WordPress Communication

Because the widget is designed to be embedded in external sites (like a WordPress landing page), it communicates its state changes to the parent frame:
* Inside [ChatWidget.tsx](file:///home/rafay/Code/ABC-Achieve-AI-Agent/components/ChatWidget.tsx), a `useEffect` dispatches `postMessage` payloads to the parent window:
  ```javascript
  window.parent.postMessage({
    type: "ellie-chat-widget",
    isOpen,
    isMessageEmpty,
    showBubble
  }, "*");
  ```
* The host website listens for this message and dynamically resizes the iframe container (e.g., expanding the container to fit the full open chat window, or shrinking it down to a small circle when the widget is minimized or displaying a greeting bubble).

---

## 8. Directory Structure & Architecture

For details on file organization, please review the complete structure below:
```text
├── app/
│   ├── api/
│   │   ├── chat/route.js      # dynamic edge runtime routing, merges assistant turns, calculates completion, strips tools
│   │   └── upload/route.js    # Node.js edge-compatible Supabase pre-signed URL generator
│   ├── widget/page.tsx        # Widget landing page with transparent wrappers for iframe embed
│   ├── layout.tsx             # Global HTML layout and CSS configuration
│   └── page.tsx               # Index page (auto-redirects to widget)
├── components/
│   ├── chat/                  # Widget modular components
│   │   ├── ChatComposer.tsx   # Input area, quick-prompts, files triggers
│   │   ├── ChatHeader.tsx     # Widget header, minimize trigger, online status
│   │   └── ChatMessages.tsx   # Message logs rendering, RAG text, Spanish redirects
│   └── ChatWidget.tsx         # Core layout component coordinating hooks and UI modules
├── hooks/
│   └── useChatWidget.ts       # React state engine: handles session timer checking, message slicing, and file uploads
├── lib/
│   ├── agent/
│   │   ├── compiled-knowledge.json # compiled offline RAG directory
│   │   ├── prompt.js          # base system prompt string and getSystemPrompt() builder
│   │   ├── retrieval.js       # Category/Tag search logic
│   │   └── tools.js           # updateLeadProgress & queryKnowledgeBase tool schemes
│   ├── supabase.ts            # Supabase client setup with build-time fallback parameters
│   └── utils.js               # class merger utility
├── scripts/
│   └── compile-knowledge.js   # Script compiling static markdown guides to the RAG database
```

---

## 9. Local Setup & Dev Commands

### Install Dependencies
```bash
bun install
```

### Configure Environment Variables
Create a `.env.local` or `.env` file in the root directory:
```env
# Google Gemini API key for Vercel AI SDK
GEMINI_API_KEY=your-gemini-api-key

# Supabase database keys (Service Role required to bypass RLS in serverless calls)
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Run Dev Server
```bash
bun run dev
```

### Build App for Production
```bash
bun run build
```
