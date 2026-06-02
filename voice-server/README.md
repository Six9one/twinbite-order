# Twin Pizza AI Phone Receptionist - Backend Voice Server

This is the backend microservice that acts as an autonomous receptionist for Twin Pizza. It interfaces with Twilio to handle incoming calls, streams audio via WebSockets to Gemini Live or OpenAI Realtime API, queries customer order history and delivery zones from Supabase, and automatically inserts new orders, which are then printed automatically by the print server.

## Features

- **24/7 Phone Reception**: Handles incoming restaurant calls, answers questions, and takes orders in French.
- **Ultra-low Latency Voice Streaming**: Uses Twilio Media Streams mapped to Gemini Live / OpenAI Realtime API over WebSockets.
- **Webhook Fallback Mode**: Turn-based conversation using Twilio `<Gather>` and high-speed LLM processing for poor network resilience.
- **DB Tool-Calling**:
  - `check_customer_history`: Greets existing customers by name, retrieves past orders, and offers to repeat them.
  - `search_menu`: Searches pizzas, prices, bases (crème/tomate), and drinks/desserts in real-time.
  - `validate_address`: Checks if the customer is inside the delivery zones (Grand-Couronne Centre, Petit-Couronne, Moulineaux, etc.), and retrieves minimum order and delivery fee.
  - `create_order`: Validates details, calculates taxes (TVA), and creates the order in Supabase (which instantly prints it via the restaurant printer).
  - `transfer_to_human`: Transfers the call to the manager / staff.

## Installation & Setup

1. **Navigate to the voice-server directory**:
   ```bash
   cd voice-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example` and fill in your keys:
   ```env
   PORT=5000
   SUPABASE_URL=https://hsylnrzxeyqxczdalurj.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GEMINI_API_KEY=your_google_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TRANSFER_PHONE=0232112613
   ```

4. **Start the server locally**:
   ```bash
   npm run dev
   ```

---

## Twilio Configuration

To connect this local server to a Twilio number for testing:

1. **Expose your local server** (e.g. using ngrok):
   ```bash
   ngrok http 5000
   ```
   Copy the `https` forwarding URL (e.g., `https://abcd.ngrok-free.app`).

2. **Configure Twilio Phone Number**:
   - In your Twilio Console, select your active Phone Number.
   - Set the **A Call Comes In** webhook to:
     `https://abcd.ngrok-free.app/incoming-call` (using POST).
   - Set the **Call Status Changes** webhook to:
     `https://abcd.ngrok-free.app/call-status` (using POST).

---

## Landline Redirection Integration (French Providers)

To connect this AI to your existing restaurant landline, you have two options:

### Option A: Conditional Call Forwarding (Recommended)
This forwards calls to the AI **only when your main line is busy or unanswered** (e.g., during peak hours when all staff are cooking).
Dial these codes from your restaurant landline phone:

- **Orange / Livebox Pro**:
  - Busy Forwarding: Dial `*69* [Twilio_Number] #` to enable. Dial `#69#` to disable.
  - No Answer Forwarding: Dial `*61* [Twilio_Number] #` to enable. Dial `#61#` to disable.
- **SFR**:
  - Busy Forwarding: Dial `*67* [Twilio_Number] #`.
  - No Answer Forwarding: Dial `*61* [Twilio_Number] #`.
- **Freebox**:
  - Busy Forwarding: Dial `*67* [Twilio_Number] *`.
  - No Answer Forwarding: Dial `*61* [Twilio_Number] *`.
- **Bouygues**:
  - Busy Forwarding: Dial `*67* [Twilio_Number] #`.
  - No Answer Forwarding: Dial `*61* [Twilio_Number] #`.

### Option B: Unconditional Call Forwarding
This forwards **100% of incoming calls** to the AI receptionist 24/7.

- **Unconditional Forwarding (All providers)**:
  - Enable: Dial `*21* [Twilio_Number] #` (or `*21* [Twilio_Number] *` for Free).
  - Disable: Dial `#21#` (or `#21*` for Free).
  - Check Status: Dial `*#21#`.
