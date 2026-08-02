import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star } from 'lucide-react';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  is_google_review: boolean;
}

const AVATAR_COLORS = ['#DB7F1E', '#4285F4', '#EA4335', '#34A853', '#8E44AD', '#16A085'];
const avatarColorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Verified directly from the Twin Pizza Google Business Profile — update here
// if the live numbers move, since there's no API pulling them automatically.
const GOOGLE_RATING = 4.9;
const GOOGLE_REVIEW_COUNT = 131;
const GOOGLE_PROFILE_URL = 'https://g.page/r/CXpZZnzoTBFREBM/review?utm_source=gbp&utm_medium=reviews&utm_campaign=qr';

const CARD_STEP = 184; // card width (172) + gap (12)

/** One auto-sliding row. `reverse` makes it drift the opposite direction, for a livelier feel across the two rows. */
function ReviewRow({ reviews, reverse }: { reviews: Review[]; reverse?: boolean }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || reviews.length === 0) return;

    // Start the reversed row at its far end so it visibly drifts "backwards."
    if (reverse) el.scrollLeft = el.scrollWidth;

    let paused = false;
    let resumeTimeout: ReturnType<typeof setTimeout>;
    const pause = () => {
      paused = true;
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => { paused = false; }, 4000);
    };
    el.addEventListener('pointerdown', pause);

    const interval = setInterval(() => {
      if (paused) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (reverse) {
        const next = el.scrollLeft - CARD_STEP <= 4 ? maxScroll : el.scrollLeft - CARD_STEP;
        el.scrollTo({ left: next, behavior: 'smooth' });
      } else {
        const next = el.scrollLeft + CARD_STEP >= maxScroll - 4 ? 0 : el.scrollLeft + CARD_STEP;
        el.scrollTo({ left: next, behavior: 'smooth' });
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(resumeTimeout);
      el.removeEventListener('pointerdown', pause);
    };
  }, [reviews, reverse]);

  return (
    <div
      ref={scrollerRef}
      className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-5 py-1"
    >
      {reviews.map((r) => {
        const initial = r.customer_name.trim().charAt(0).toUpperCase() || '?';
        return (
          <div
            key={r.id}
            className="snap-start shrink-0 w-[172px] h-[172px] rounded-[1.4rem] bg-white border border-[#3B2216]/[0.06] shadow-[0_2px_10px_rgba(60,30,10,0.06)] p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <div
                className="relative w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ backgroundColor: avatarColorFor(r.customer_name) }}
              >
                {initial}
                {r.is_google_review && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white shadow flex items-center justify-center text-[8px] font-black text-[#4285F4] leading-none">
                    G
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-[#3B2216] leading-tight line-clamp-2">
                {r.customer_name}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i <= r.rating ? 'fill-[#DB7F1E] text-[#DB7F1E]' : 'text-stone-200'}`}
                />
              ))}
            </div>
            {r.comment && (
              <p className="text-[11px] text-[#3B2216]/80 leading-snug line-clamp-4">{r.comment}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Two-row auto-sliding wall of real, published customer reviews (Supabase
 * `reviews` table — the same one Admin > Avis Clients manages). Includes both
 * in-app submissions and a manually-imported batch of real Google reviews
 * (is_google_review = true, sourced by hand from the Twin Pizza Google
 * Business Profile — no live API sync, so these won't auto-update).
 */
export function ReviewsSlider() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    supabase
      .from('reviews' as any)
      .select('id, customer_name, rating, comment, is_google_review')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(80)
      .then(({ data }) => {
        if (data) setReviews(data as unknown as Review[]);
      });
  }, []);

  if (reviews.length === 0) return null;

  const rowA = reviews.filter((_, i) => i % 2 === 0);
  const rowB = reviews.filter((_, i) => i % 2 === 1);

  return (
    <div>
      <div className="px-5 mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[1.1rem] font-extrabold text-[#3B2216] tracking-tight flex items-center gap-1.5">
          ⭐ Avis Clients
        </h2>
        <a
          href={GOOGLE_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-white rounded-full pl-1.5 pr-2.5 py-1 shadow-sm active:scale-95 transition-transform"
        >
          <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[10px] font-black leading-none">
            <span className="text-[#4285F4]">G</span>
          </span>
          <span className="text-[11px] font-bold text-[#3B2216] leading-none">
            {GOOGLE_RATING.toFixed(1)} <span className="text-[#DB7F1E]">★</span>
          </span>
          <span className="text-[10px] text-[#8C7A6B] leading-none">
            ({GOOGLE_REVIEW_COUNT})
          </span>
        </a>
      </div>
      <div className="space-y-3">
        <ReviewRow reviews={rowA} />
        {rowB.length > 0 && <ReviewRow reviews={rowB} reverse />}
      </div>
    </div>
  );
}
