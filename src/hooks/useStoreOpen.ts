import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Live "is the restaurant open right now?" status, derived from the same
 * `opening_hours` table that Admin > Horaires and the Footer already use.
 *
 * Handles the two things a naive comparison gets wrong for a pizzeria:
 *  - two service windows per day (midi + soir), and
 *  - an evening service that closes AFTER midnight (e.g. 17h30 -> 00h00 / 01h00),
 *    which belongs to the *previous* day's row.
 */

export interface OpeningHourRow {
  day_of_week: number; // 0 = Sunday
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  open_time_evening: string | null;
  close_time_evening: string | null;
}

export interface StoreOpenState {
  /** null while the hours are still loading — render a neutral pill, not "Fermé". */
  isOpen: boolean | null;
  /** "ferme à 00h00" when open, "ouvre à 11h00" / "ouvre lundi à 11h00" when closed. */
  label: string;
  loading: boolean;
}

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** "17:30:00" -> 1050 (minutes since midnight). Returns null for empty values. */
const toMinutes = (t: string | null): number | null => {
  if (!t) return null;
  const [h, m] = t.split(':');
  const mins = Number(h) * 60 + Number(m || 0);
  return Number.isFinite(mins) ? mins : null;
};

/** 1050 -> "17h30" */
const fmt = (mins: number): string => {
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
};

/** Every service window of a day, as [openMin, closeMin]; closeMin may exceed 1440 when it runs past midnight. */
const windowsFor = (row: OpeningHourRow | undefined): [number, number][] => {
  if (!row || !row.is_open) return [];
  const out: [number, number][] = [];
  const pairs: [number | null, number | null][] = [
    [toMinutes(row.open_time), toMinutes(row.close_time)],
    [toMinutes(row.open_time_evening), toMinutes(row.close_time_evening)],
  ];
  for (const [open, close] of pairs) {
    if (open === null || close === null) continue;
    // A close time of 00h00 (or anything <= open) means "the next day".
    out.push([open, close <= open ? close + 1440 : close]);
  }
  return out.sort((a, b) => a[0] - b[0]);
};

export function useStoreOpen(): StoreOpenState {
  const [rows, setRows] = useState<OpeningHourRow[] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    supabase
      .from('opening_hours' as any)
      .select('day_of_week, is_open, open_time, close_time, open_time_evening, close_time_evening')
      .order('day_of_week')
      .then(({ data }) => setRows((data as unknown as OpeningHourRow[]) ?? []));
  }, []);

  // Re-evaluate every minute so the pill flips over on its own without a reload.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (rows === null) return { isOpen: null, label: '', loading: true };

  const byDay = (d: number) => rows.find((r) => r.day_of_week === ((d % 7) + 7) % 7);
  const today = now.getDay();
  const minsNow = now.getHours() * 60 + now.getMinutes();

  // Yesterday's late-night window can still be running (e.g. it's 00h30 and yesterday closed at 01h00).
  for (const [open, close] of windowsFor(byDay(today - 1))) {
    if (close > 1440 && minsNow + 1440 >= open && minsNow + 1440 < close) {
      return { isOpen: true, label: `ferme à ${fmt(close)}`, loading: false };
    }
  }

  const todayWindows = windowsFor(byDay(today));
  for (const [open, close] of todayWindows) {
    if (minsNow >= open && minsNow < close) {
      return { isOpen: true, label: `ferme à ${fmt(close)}`, loading: false };
    }
  }

  // Closed — find the next opening, today first, then up to a week ahead.
  const laterToday = todayWindows.find(([open]) => open > minsNow);
  if (laterToday) {
    return { isOpen: false, label: `ouvre à ${fmt(laterToday[0])}`, loading: false };
  }
  for (let i = 1; i <= 7; i++) {
    const next = windowsFor(byDay(today + i))[0];
    if (next) {
      const dayLabel = i === 1 ? 'demain' : DAY_NAMES[(today + i) % 7];
      return { isOpen: false, label: `ouvre ${dayLabel} à ${fmt(next[0])}`, loading: false };
    }
  }

  return { isOpen: false, label: '', loading: false };
}
