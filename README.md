# Ellie: AI Intake Chatbot

Ellie is an AI-powered chatbot designed to help parents start their intake process for ABA therapy at **Achievement Behavior Services (ABS)**. She is embedded as a widget on the website, asks questions to qualify leads, and saves the data directly into a Supabase database.

---

## 🌟 Key Features

### 1. Conversational Intake Funnel
Ellie guides users step-by-step through a simple list of questions:
* **Eligibility Check**: Confirms they want ABA services.
* **Service Area**: Checks if the user is in supported states (**NY, NJ, CT, GA, or NC**). 
* **Contact Details**: Asks for and validates email and phone number.
* **Insurance Provider**: Collects and normalizes the name of their insurance company.
* **Names & Age**: Registers parent and child names, ensuring the child's age is between **2 and 22 years**.
* **Insurance Card Upload**: Parents can upload a photo of their insurance card safely (directly to Supabase Storage).
* **Behavioral Goals**: Asks about what goals they want to achieve.

### 2. Smart Session Locks
* **Inactivity Lock**: If a user finishes entering required details (Names, Email, Phone, Location) and stops talking for **10 minutes**, the chatbot automatically locks the session as completed.
* **Tool Removal**: Once the intake is locked as complete, the chatbot hides the database-saving tool from the AI, preventing database spam and hallucinations.
* **2-Hour Reset**: Active chat sessions expire after 2 hours of inactivity, starting a fresh chat when the user returns.
* **Auto-Follow-Up**: If a parent goes silent for **45 seconds**, Ellie automatically sends a friendly *"Hi, are you still there?"* to re-engage them.

### 3. Website Integration
* **Greeting Bubbles**: Displays rotation messages next to the widget icon to invite clicks.
* **Spanish Support**: If requested, Ellie translates the conversation flow and answers questions in Spanish.
* **Iframe Resizing**: Communicates with host platforms (like WordPress) to dynamically resize the chat wrapper window when opened or minimized.

---

## 🔗 n8n Sync Workflow (Post-Intake Automation)

Once a lead is captured by the chatbot in Supabase, a backend **n8n workflow** automatically handles syncing it to internal systems.

```
[Schedule Trigger] ➔ [Fetch Unsynced Leads] ➔ [Format Monday.com Payload] ➔ [Create Monday.com Card] ➔ [Send Gmail Alert] ➔ [Mark Lead Stored]
```

### How n8n works:
1. **Schedule Trigger**: Runs automatically every **10 minutes**.
2. **Fetch Unsynced Leads**: Searches the database for completed leads that are not yet synced to Monday.com and have been inactive for at least 10 minutes.
3. **Format Monday.com Payload**: A javascript node maps the lead info and safely formats phone numbers (supporting US and PK formats).
4. **Create Monday.com Card**: Creates a new lead card in the Monday.com board group.
5. **Send Gmail Alert**: Sends an email notification to the administrator with the lead details and a link to view it on Monday.com.
6. **Mark Lead Stored**: Updates the database status to `completed` and saves the generated Monday.com ID to prevent duplicate syncing.

---

## ⚙️ Setup & Installation

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Run Locally
```bash
# Run RAG compiler and local dev server
bun run dev
```
Open [http://localhost:3000/widget](http://localhost:3000/widget) to test.
