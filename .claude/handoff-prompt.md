# Twin Pizza — Session Handoff Prompt

Paste this into the other tool to continue where this session left off.

---

I'm working on **twinpizza-order** (`C:\Users\bguir\Desktop\twinbite-order`), a React + Vite + TypeScript + Tailwind + Supabase pizza ordering site (Twin Pizza, Grand-Couronne). Here's what was just built in the previous session, all on the home page (`src/pages/Index.tsx`):

## What exists now

1. **`src/components/BestSellerSlider.tsx`** + **`src/components/ui/stacked-carousel.tsx`** — a "🔥 Top Ventes" section right under the hero: a Framer-Motion drag-to-browse stacked card carousel (auto-plays too), showing 6 hardcoded best-seller presets (3 real pizzas with real DB photos, 3 soufflet/tacos/makloub combos with pre-selected meats/sauces). Tapping a card opens the matching wizard (`PizzaWizard`, `TacosWizard`, `UnifiedProductWizard`) pre-filled via new props (`initialPizzaId`, `initialSize`, `initialMeatNames`, `initialSauceNames`) I added to those wizard components.

2. **`src/components/CategoryCardGrid.tsx`** — "Nos Spécialités" grid, redesigned to 2-column rounded-square white cards (bigger than before), each with a floating icon + label. Some categories use static cutout images (`/cat_pizza_3d.png` etc.), others fall back to DB images (`useCategoryImages` hook / `category_images` table) or emoji.

3. **`src/components/ReviewsSlider.tsx`** — "⭐ Avis Clients" section: 2-row auto-sliding wall of real reviews from the Supabase `reviews` table. **96 published reviews total**: 11 original in-app submissions + **85 real Google reviews I manually transcribed** (name + rating + comment) from the owner's logged-in Google Business Profile page (no Places API — owner didn't want to set up billing/API key), inserted via direct REST calls with `is_google_review = true`. Cards show colored initial-letter avatars (NOT real photos — explicitly declined to scrape/rehost real people's Google profile photos or review photos, both for privacy/consent and technical/ToS reasons) with a small "G" badge on Google-sourced ones. Header shows a static "4.9 ★ (131)" trust badge (verified real numbers, not live-synced).

4. **Home page (`Index.tsx`) layout**: removed the visible page-background "border" (hero + content card now full-bleed edge-to-edge, `rounded-t-[2rem]` only), removed the old "Populaires" section (replaced by Avis Clients), and each section (Nos Spécialités / Avis Clients / Notre Restaurant) now sits in its own tinted rounded panel instead of being separated by thin divider lines: peach `#FDEEDD`, golden `#FCF3E1`, terracotta `#F8E6D6`.

5. **Color refinement**: page canvas `#C8AD7E` → `#DDA463`, primary accent `#C67B2E` → `#DB7F1E`, applied across `Index.tsx` and `CategoryCardGrid.tsx`. **Not yet applied** to the wizards/cart/checkout (they still use Tailwind's default `orange-600`).

## Known gaps / likely next asks

- The Google reviews import is a **one-time manual snapshot** (46 more of the 131 total exist on Google but weren't transcribed — diminishing returns on manual scrolling). Not live-synced; would need a real Places API key + Supabase Edge Function to auto-update.
- Extending the `#DB7F1E` / `#DDA463` accent palette into wizards, cart, and checkout screens hasn't been done yet.
- `.claude/launch.json` exists pointing `npm run dev` at port 8080 — use that to preview.
- Supabase project ref: `hsylnrzxeyqxczdalurj` (the anon key is in `.env` as `VITE_SUPABASE_ANON_KEY`).

Nothing here is committed to git yet — everything above is uncommitted working-tree changes.
