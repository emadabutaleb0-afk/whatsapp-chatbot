# ClientBot — WhatsApp AI Business Assistant

A complete, full-stack WhatsApp AI assistant and business management web application modeled closely on [intelligent-bot-2692.puter.site](https://intelligent-bot-2692.puter.site/).

ClientBot answers your clients automatically on WhatsApp 24/7 with zero-hallucination answers quoting only your exact opening hours, location, contact info, and product prices.

---

## Features

- 📊 **Live Performance Dashboard**:
  - Message volume stacked bar chart (total messages vs FAQ matched)
  - Client satisfaction donut gauge and 30-day sentiment trend line
  - Average response time tracking
  - Topic distribution bars (Opening hours, Prices, Location, Delivery, Payment)
  - Most common questions leaderboard (1-tap conversion to approved FAQ)
  - Unanswered questions tracker with 1-tap answering
  - Sample demo data generator for instant presentation

- 💬 **In-App Live Chat Preview**:
  - Instant WhatsApp simulator to test questions as a client
  - Real-time typing indicator and message bubble styling
  - Quick-start suggestion chips
  - Multiple conversation history management

- ❓ **FAQ Answers Manager**:
  - Prioritized approved answers that override general AI reasoning
  - Exact reply mode ("Send word for word") vs Natural wording mode
  - Searchable question list with alias matching (e.g. "are you open now?" = "opening hours")
  - ✨ "Suggest from my info" AI generator that automatically drafts 6 FAQs from your business profile
  - 1-click "Test in chat" button

- 🏪 **Business Knowledge Base**:
  - Identity: Business name, tagline, description
  - Timing: Detailed opening & closing hours
  - Location & Contact: Physical address, Google Maps link, phone number
  - Orders & Policies: Delivery coverage & fees, payment methods (Cash, Visa, InstaPay), return policies
  - Voice & Tone: Language rules, tone of voice, fallback sentence

- 🏷️ **Products & Prices Catalog**:
  - Dynamic catalog with live editing for item name, price, category, stock availability, and description
  - Exact quotes: AI never invents or guesses a price

- 🔗 **Meta WhatsApp Cloud API Integration**:
  - Full support for Meta WhatsApp Cloud API (Graph API v21.0)
  - Automatic webhook verification (`GET /webhook`)
  - Real-time message receiver (`POST /webhook`) with auto-reply
  - In-app test message sender to test delivery to any phone number
  - 4-step setup instructions built into the UI

- 📥 **Client Messages (Inbox)**:
  - Audit log showing client name, phone number, timestamp, incoming question, and bot reply
  - Status badges: `Replied`, `Auto-reply off`, `Not connected`

- 💾 **Data Persistence**:
  - Local JSON database stored in `data/db.json`
  - Floating bottom save bar with "Unsaved changes" indicator

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18 or higher (tested on Node v24)
- **npm**: v9 or higher

### 2. Install & Run
```bash
# Clone or navigate to the folder
cd "d:\New folder\whatsapp chatpot"

# Install dependencies
npm install

# Start the application
npm start
```

Open your browser at:
👉 **[http://localhost:3005](http://localhost:3005)**

---

## Connecting Meta WhatsApp Cloud API (Step-by-Step)

To have your bot answer real WhatsApp messages from real clients on your phone number:

### Step 1: Create a Meta Developer App
1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in with your Facebook account.
2. Click **My Apps** → **Create App**.
3. Select **Other** → **Business** (or **None**) and give it a name (e.g., `My ClientBot`).
4. On the Add Products page, find **WhatsApp** and click **Set Up**.

### Step 2: Get Credentials
1. In the left sidebar, navigate to **WhatsApp** → **API Setup**.
2. Under "Send and receive messages":
   - Copy the **Phone number ID** (e.g. `1234567890123456`).
   - Copy the **Temporary Access Token** (or generate a Permanent System User Token in Business Settings).
3. In your ClientBot dashboard at [http://localhost:3005](http://localhost:3005), click **WhatsApp** in the sidebar.
4. Paste the **Phone number ID** and **Access Token**. Choose your own **Verify Token** (e.g. `my-secret-verify-token`).
5. Click **Save**.

### Step 3: Expose Local Server to the Internet (for Webhook)
Meta needs to reach your server over HTTPS. Use [ngrok](https://ngrok.com/) or Cloudflare Tunnel:
```bash
# Using ngrok (free)
npx ngrok http 3005
```
You will get a public URL such as `https://abcd-1234.ngrok-free.app`.

### Step 4: Configure Webhook in Meta
1. In Meta Developer Dashboard, go to **WhatsApp** → **Configuration**.
2. In the **Webhook** section, click **Edit**:
   - **Callback URL**: `https://abcd-1234.ngrok-free.app/webhook`
   - **Verify Token**: `my-secret-verify-token` (the same one you saved in ClientBot)
3. Click **Verify and save**.
4. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**.

🎉 **You are live!** When any client messages your WhatsApp number, ClientBot receives it, matches your business knowledge, and sends back an instant, helpful reply!

---

## AI Providers (Optional)

ClientBot works **100% out of the box** without any API key thanks to its built-in intelligent tokenizer and rule engine.

To enable advanced generative responses with large language models, add your key to `.env`:

```env
# Optional: Google Gemini API (Recommended)
GEMINI_API_KEY=your_gemini_api_key_here

# Or Optional: OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
```

Restart the server:
```bash
npm start
```

---

## Project Structure

```
whatsapp-chatbot/
├── data/
│   └── db.json               # Auto-generated database file
├── public/
│   ├── css/
│   │   └── styles.css        # Tailwind & custom component styles
│   ├── js/
│   │   ├── api.js            # Frontend REST API client
│   │   ├── app.js            # Main frontend coordinator
│   │   ├── charts.js         # SVG bar, line, and donut chart renderers
│   │   ├── chat.js           # In-app live assistant preview simulator
│   │   ├── dashboard.js      # Analytics dashboard controller
│   │   ├── faq.js            # FAQ manager & AI suggestions
│   │   └── ui.js             # Lucide icons, notifications & helpers
│   └── index.html            # Main SPA dashboard interface
├── .env                      # Active environment configuration
├── .env.example              # Configuration template
├── ai.js                     # AI prompt builder & FAQ similarity matcher
├── db.js                     # Persistence layer with demo data generator
├── package.json              # Project dependencies & start script
├── README.md                 # Complete documentation
└── server.js                 # Express server & Meta WhatsApp webhook
```
