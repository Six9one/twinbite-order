# Twin Pizza - Order Management System

A modern pizza ordering system with an admin dashboard, TV display, and thermal printer integration.

## Features

- 🍕 Online ordering system
- 📺 TV Dashboard for kitchen display
- 🖨️ Automatic thermal printer support
- 💳 Stripe payment integration
- 📱 WhatsApp notifications
- 📊 Admin dashboard with statistics

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Database, Auth, Edge Functions)
- Stripe (Payments)
- Vercel (Hosting)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Six9one/twinbite-order.git
cd twinbite-order

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Deployment

The project is deployed on Vercel. Push to `main` branch to trigger automatic deployment.

## Admin Access

Navigate to `/admin` to access the admin dashboard.

## TV Dashboard

Navigate to `/tv` for the kitchen display screen.
