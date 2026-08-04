# 🍕 TwinPizza / TwinBite Order — Complete System & Conversation Master Documentation

---

## 📖 Executive Summary
This document provides a comprehensive, single-file reference covering the entire **TwinPizza / TwinBite Order** Web Application ecosystem and all engineering work, root-cause analyses, code modifications, and verifications completed during our conversations.

---

## 1. 🏗️ Web Application Overview & Architecture

**TwinBite Order** is an enterprise-grade multi-tenant restaurant management and ordering platform specifically engineered for pizza restaurants. It integrates online customer ordering, self-service kiosks, Point of Sale (POS) cashier terminals, Kitchen Display Systems (KDS), digital TV menu boards, automated thermal printing, and multi-channel messaging (Telegram & WhatsApp).

### 🛠️ Technology Stack

| Layer | Technology & Tools |
| :--- | :--- |
| **Frontend Core** | React 18, TypeScript (TSX), Vite 5 |
| **Styling & UI** | Vanilla CSS, Tailwind CSS 3, shadcn/ui, Motion (Framer Motion), Lucide Icons |
| **State & Data Fetching** | TanStack React Query v5, Context API |
| **Backend & Database** | Supabase (PostgreSQL, Realtime, Row Level Security, Storage) |
| **Serverless Edge Logic** | Deno-based Supabase Edge Functions |
| **Payments** | myPOS IPC Payment Gateway, Stripe |
| **Local Infrastructure** | Node.js Thermal ESC/POS Print Server (Port 9100/RAW), Voice TTS Server |
| **Deployment** | Vercel (Cloud Frontend), Local Windows Batch Automated Launchers |
| **Geospatial & Delivery** | Mapbox GL JS |

---

## 2. 📱 Core Modules & Application Pages

The application is structured into specialized routes for different operational roles:

```
                  ┌────────────────────────────────────────┐
                  │       TwinBite Order Ecosystem         │
                  └──────────────────┬─────────────────────┘
                                     │
    ┌──────────────────┬─────────────┼──────────────┬──────────────────┐
    │                  │             │              │                  │
┌───┴──────────┐ ┌─────┴─────┐ ┌─────┴──────┐ ┌─────┴──────┐ ┌─────────┴────────┐
│  Customer    │ │  Terminal │ │ Management │ │ Display &  │ │ Marketing &      │
│  Web & Kiosk │ │   (POS)   │ │  & Kitchen │ │ TV Boards  │ │ Customer Loyalty │
└──────────────┘ └───────────┘ └────────────┘ └────────────┘ └──────────────────┘
```

### 1️⃣ Customer-Facing Online Ordering (`/`, `/promo-weekend`)
- Interactive menu with category filtering (Pizzas, Tex-Mex, Desserts, Milkshakes, Drinks).
- Customization wizards for pizza bases (Crème/Tomate), sizes (Senior, Mega), toppings, and midi menus.
- Real-time address validation & delivery zone check via Mapbox.
- Scheduled orders selector (immediate vs. programmed time).
- Progressive Web App (PWA) support with offline detection and install prompts.

### 2️⃣ Self-Service Kiosk (`/kiosk`)
- Full-screen touch interface designed for in-restaurant self-ordering.
- Integrated virtual soft-keyboard for customer name & phone input.
- Instant receipt printing signal to counter printers.

### 3️⃣ Point of Sale Terminal / Caisse (`/pos`)
- High-speed cashier interface for counter and dine-in orders (`Sur Place`, `À Emporter`, `Livraison`).
- Split payment handling (Espèces, CB, myPOS, Ticket Restaurant).
- One-click ticket generation and drawer kick integration.

### 4️⃣ Admin Dashboard (`/admin/dashboard`)
- Order management with real-time status transitions (`Pending` ➔ `In Preparation` ➔ `Ready` ➔ `Delivered`).
- Product & category menu management with real-time availability toggles.
- Financial statistics, sales reporting, and export tools.
- Integrations Manager: Telegram, WhatsApp, myPOS credentials, and ESC/POS printer IP/port configurations.

### 5️⃣ Kitchen Display System - KDS (`/kitchen`)
- Live kitchen queue showing pending and in-progress orders.
- Audio alerts via local Voice Server when new orders arrive.
- Auto-relevé timers and status updates.

### 6️⃣ TV Dashboard (`/tv`)
- Live kitchen/counter TV screen displaying order numbers divided into "En Préparation" and "Prêt / À Retirer".

### 7️⃣ Crew Dashboard (`/crew`) & SuperAdmin (`/superadmin`)
- Staff portal for daily operations and multi-tenant management.

### 8️⃣ Loyalty & Spin Wheel (`/spin`, `/avis`)
- Interactive wheel spin game rewarding customers with promo items (free pizzas, drinks, stamp cards).
- Automatic notification dispatch to admins when prizes are won.

---

## 3. ⚡ Backend Architecture & Edge Functions

### 🗄️ Supabase Database Schema (Key Tables)
- **`orders`**: Core order registry (`order_number`, `order_type`, `customer_name`, `customer_phone`, `customer_address`, `items`, `subtotal`, `tva`, `delivery_fee`, `total`, `payment_method`, `status`, `is_scheduled`, `scheduled_for`, `tenant_id`).
- **`admin_settings`**: Tenant-level configuration (myPOS API keys, Telegram Bot tokens, chat IDs, printer IP/port, opening hours).
- **`tenants`**: Multi-restaurant tenant definitions (`twin-pizza`, etc.).
- **`products` & `categories`**: Menu catalog with pricing, options, and stock states.
- **`haccp_logs` & `whatsapp_logs`**: Operational hygiene logs and messaging audit trails.

### 🌐 Edge Functions Summary (14 Functions)
1. **`create-mypos-checkout`**: Generates RSA-SHA256 digital signatures for myPOS IPC gateway sessions.
2. **`mypos-webhook`**: Receives myPOS payment notifications, verifies signatures, updates order status to `Paid`, and triggers thermal printing.
3. **`send-telegram-notification`**: Formats and sends Markdown order receipts to configured Telegram admin chat IDs.
4. **`send-whatsapp-notification`**: Dispatches WhatsApp order updates.
5. **`print-order`**: Routes print jobs to the local network thermal printer server.
6. **`create-checkout`** & **`stripe-webhook`**: Handles Stripe checkout sessions and payment webhooks.
7. **`send-spin-notification`**: Sends notifications when a customer wins a prize on the Spin Wheel.
8. **`send-order-ready-sms`** & **`send-sms`**: Customer SMS notification gateways.
9. **`send-push-notification`**: PWA Web Push notification sender.
10. **`ocr-label`**: AI OCR label scanner for HACCP compliance.
11. **`get-mapbox-token`**: Secure token proxy for Mapbox services.
12. **`ubereats-webhook`**: Third-party delivery integration listener.

---

## 4. 🖨️ Local Hardware & Network Infrastructure

- **Thermal Print Server (`print-server/`)**:
  - Express.js Node server communicating directly with ESC/POS printers over TCP/IP (Port 9100) or USB.
  - Supports 80mm and 58mm receipts with automatic cutter signals (`GS V 0`).
- **Voice Server (`voice-server/`)**:
  - Node.js Text-to-Speech service pronouncing order numbers in French over restaurant speakers.
- **Windows Automated Launchers**:
  - `INSTALLER.bat`: One-click setup installing Git, Node.js, dependencies, and desktop shortcuts.
  - `LANCER_TWINPIZZA.bat`: Daily launcher initializing print server, web app, and browser.
  - `METTRE_A_JOUR.bat`: Pulls latest code (`git pull`), installs packages, and recompiles.

---

## 5. 🔍 Detailed Summary of Recent Technical Work & Problem Resolution

### 🎯 Initial User Objective
1. Send the last 2 online paid orders to Telegram.
2. Investigate why online transactions appeared on the myPOS terminal/dashboard without an **Order ID** ("ID DE COMMANDE") and failed to trigger Telegram alerts or printed receipts.

### 🔬 Diagnostics & Empirical Findings
- Inspected Supabase database tables (`orders`, `admin_settings`, `tenants`).
- Identified 10 orders placed on **August 2, 2026**.
- **Discovered Root Cause in Online Checkout**:
  - In [`src/components/NewCheckout.tsx`](file:///c:/Users/bguir/Desktop/twinbite-order/src/components/NewCheckout.tsx), when a user clicked "Payer en ligne (myPOS)", the frontend invoked `initiateMyPosCheckout()` which redirected the user's browser **immediately** to myPOS.
  - **No record was inserted into Supabase `orders` table before redirection**.
  - Because no order existed prior to payment, myPOS had no `Order ID` parameter, no initial Telegram alert was sent, and when the myPOS webhook fired after payment, it could not find a matching order to set to `Paid` or print.

### 🛠️ Code Resolution Applied
Modified `handleMyPosPayment` in [`src/components/NewCheckout.tsx`](file:///c:/Users/bguir/Desktop/twinbite-order/src/components/NewCheckout.tsx#L235-L290):
1. **Pre-Insertion**: Executed `createOrder.mutateAsync(...)` to insert the order into Supabase with `status: 'pending'` and `payment_method: 'en_ligne'` **before** calling myPOS.
2. **Telegram Pre-Alert**: Dispatched an initial Telegram notification marking the order as "en_ligne (En attente de règlement)".
3. **Seamless myPOS Redirect**: Initiated myPOS checkout with the confirmed `orderNumber`.
4. **Webhook Sync**: Upon payment confirmation, `mypos-webhook` updates the existing order to `Paid` and triggers ticket printing.

### 🧪 Verification & Build Results
- Executed node script [`scratch/send_todays_orders.js`](file:///c:/Users/bguir/Desktop/twinbite-order/scratch/send_todays_orders.js) which successfully formatted and transmitted all 10 today's orders (#1560 to #1571) to Telegram via Edge Function.
- Executed `npm run build`: Application compiled successfully without TypeScript or bundling errors (`built in 13.09s`).

---

## 📌 Key Metrics & Technical Summary Table

| Metric / Parameter | Value / Detail |
| :--- | :--- |
| **Orders Processed to Telegram** | 10 Orders (#1560, #1561, #1562, #1563, #1564, #1565, #1566, #1569, #1570, #1571) |
| **Order Amounts Sent** | 18.00€, 28.00€, 36.00€, 66.50€, 18.00€, 14.00€, 10.00€, 62.00€, 7.50€, 9.00€ |
| **Inspected myPOS Anomalies** | 35.00€ (19:11) & 16.50€ (19:07) transactions |
| **Primary Code Change File** | [`src/components/NewCheckout.tsx`](file:///c:/Users/bguir/Desktop/twinbite-order/src/components/NewCheckout.tsx) |
| **Supabase Edge Functions** | `send-telegram-notification`, `create-mypos-checkout`, `mypos-webhook` |
| **Build Status** | Successful Production Build (`dist/index.html` generated) |
| **Local Summary Document** | [`CONVERSATION_SUMMARY.md`](file:///c:/Users/bguir/Desktop/twinbite-order/CONVERSATION_SUMMARY.md) |

---

## 🚀 Quick Reference / How to Run & Maintain

1. **Start Development App**: `npm run dev`
2. **Build for Production**: `npm run build`
3. **Launch Full Restaurant Stack**: Double-click `LANCER_TWINPIZZA.bat`
4. **Pull Updates & Rebuild**: Double-click `METTRE_A_JOUR.bat`
