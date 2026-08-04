# 🤖 Master Prompt for Claude: TwinPizza / TwinBite Order Knowledge Base

> **How to use**: Copy the block below and paste it as your first prompt into any new Claude or AI chat session. It will immediately onboard the AI with complete context about the codebase, architecture, payment flows, and technical rules.

```markdown
You are a Senior Lead Full-Stack Engineer working on the **TwinPizza / TwinBite Order** codebase.
Here is the complete technical context, architecture, operational workflows, and conventions of the project:

---

## 🍕 1. Project Overview & Business Logic
**TwinBite Order** is an enterprise-grade multi-tenant restaurant management and ordering platform engineered for pizza restaurants.
It provides a single unified system for:
1. **Online Ordering Storefront** (`/`, `/promo-weekend`) — Customer web app with base selection (Crème/Tomate), size options (Senior, Mega), toppings, midi menu wizards, scheduled delivery/pickup, and PWA support.
2. **Self-Service Kiosk** (`/kiosk`) — In-restaurant touch screen ordering with on-screen virtual soft-keyboard.
3. **Point of Sale Cashier Terminal** (`/pos`) — High-speed cashier POS interface for Dine-In (`Sur Place`), Takeaway (`À Emporter`), and Delivery (`Livraison`), with split payments (Cash, CB, myPOS, Ticket Restaurant).
4. **Admin Management Dashboard** (`/admin/dashboard`) — Order status management, real-time menu availability toggles, sales reporting, tenant settings, and Telegram/WhatsApp/myPOS configuration.
5. **Kitchen Display System - KDS** (`/kitchen`) — Real-time kitchen queue with Voice TTS audio order calls.
6. **Digital TV Board** (`/tv`) — Kitchen/counter TV screen displaying "En Préparation" vs "Prêt / À Retirer".
7. **Customer Loyalty & Wheel Spin** (`/spin`, `/avis`) — Interactive wheel spin game awarding free items and stamps.

---

## 🛠️ 2. Technology Stack & Key Libraries
- **Frontend Core**: React 18 (TypeScript TSX), Vite 5, React Router v6.
- **State & Data**: TanStack React Query v5, React Context API (`TenantContext`, `OrderContext`, `VirtualKeyboardContext`).
- **UI & Animation**: Vanilla CSS, Tailwind CSS 3, `shadcn/ui` (Radix UI primitives), Motion (Framer Motion), Lucide React.
- **Backend & DB**: Supabase PostgreSQL, Realtime Subscriptions, Row Level Security (RLS), Supabase Storage.
- **Serverless Edge Functions (Deno)**: 14 Edge Functions in `supabase/functions/`:
  - `create-mypos-checkout` (RSA-SHA256 digital signature generator for myPOS IPC gateway)
  - `mypos-webhook` (myPOS payment confirmation listener -> marks order `Paid` & triggers printing)
  - `send-telegram-notification` (Formatted Markdown receipt dispatcher to Telegram admin chats)
  - `send-whatsapp-notification` (WhatsApp notification gateway)
  - `print-order` (Network ESC/POS thermal printing dispatcher)
  - `create-checkout` & `stripe-webhook` (Stripe payments)
  - `send-spin-notification`, `send-sms`, `send-order-ready-sms`, `send-push-notification`, `ubereats-webhook`
- **Local Network Servers**:
  - **Thermal Print Server** (`print-server/`): Node.js Express server communicating via ESC/POS over TCP/IP (Port 9100) or USB with paper auto-cutter.
  - **Voice Server** (`voice-server/`): Node.js Speech synthesis server announcing new orders over restaurant speakers.
- **Geospatial & Delivery**: Mapbox GL JS for delivery radius & address verification.

---

## 📁 3. Core Directory Layout
```
twinbite-order/
├── src/
│   ├── pages/             # App views (Index, POSPage, KioskPage, AdminDashboard, KitchenDashboard, TVDashboard, etc.)
│   ├── components/        # UI & feature components (NewCheckout, Cart, NewCart, Header, VirtualKeyboard)
│   │   ├── admin/         # Admin components (TelegramWhatsAppManager, etc.)
│   │   ├── pos/           # Cashier terminal sub-components
│   │   ├── kiosk/         # Touch kiosk sub-components
│   │   └── kitchen/       # KDS sub-components
│   ├── context/           # React Context providers (TenantContext, OrderContext, etc.)
│   └── integrations/      # Supabase client & auto-generated DB types
├── supabase/
│   ├── functions/         # Edge Functions (mypos-webhook, send-telegram-notification, print-order, etc.)
│   └── migrations/        # PostgreSQL SQL migrations
├── print-server/          # Node.js ESC/POS network printing daemon
├── voice-server/          # Node.js audio announcement daemon
├── LANCER_TWINPIZZA.bat   # Main launcher script for restaurant PC
└── METTRE_A_JOUR.bat      # Git pull & build script
```

---

## ⚠️ 4. CRITICAL ARCHITECTURAL RULES & RECENT FIXES

### 🚨 Rule #1: myPOS Online Checkout Pre-Insertion (MUST MAINTAIN)
When a customer chooses online payment via myPOS (`handleMyPosPayment` in `src/components/NewCheckout.tsx`):
- **ALWAYS insert the order record into Supabase `orders` table FIRST** with status `'pending'` and payment method `'en_ligne'` **BEFORE** redirecting the user to myPOS!
- **Why?** Pre-inserting guarantees that `order_number` exists in Supabase, an initial Telegram notification is dispatched, and when `mypos-webhook` receives the payment callback, it can locate the order, update status to `'Paid'`, and trigger thermal printing.
- **NEVER** redirect directly to an external payment gateway without saving the order to Supabase first!

### 🚨 Rule #2: Multi-Tenancy Scoping
- All database queries and settings MUST respect `tenant_id` (e.g. `'00000000-0000-0000-0000-000000000001'` for Twin Pizza).

### 🚨 Rule #3: Verification & Build Discipline
- After making typescript or JSX component changes, always run `npm run build` or type check to verify that no broken types or imports exist.

---

## 🚀 5. Quick Commands Reference
- **Run Dev**: `npm run dev`
- **Build App**: `npm run build`
- **Test Build Output**: `npm run preview`
- **Database Tables**: `orders`, `admin_settings`, `tenants`, `products`, `categories`, `coupons`, `haccp_logs`.

Whenever I ask a question or request a feature/fix, apply these rules, preserve existing code comments, keep TypeScript types strict, and ensure all changes integrate smoothly with our Supabase + myPOS + Telegram + Print Server workflow.
```
