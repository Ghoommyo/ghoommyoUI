import { toMinutes } from '@/lib/date';

/** Stores are in India: open hours are India time (UTC+5:30, no daylight saving), wherever the customer is. */
const INDIA_OFFSET_MINUTES = 330;

export type OpenState =
  | { open: true; closesAt: string }
  /** `day` is null when it opens later today. */
  | { open: false; opensAt: string; day: number | null };

/** Whether a store is open now, with when it closes or next opens (`openAt`/`closeAt` are `HH:mm`). */
export function openState(store: { openAt: string; closeAt: string; openDays: number[] }, now = new Date()): OpenState {
  const india = new Date(now.getTime() + INDIA_OFFSET_MINUTES * 60_000);
  const today = india.getUTCDay();
  const minutes = india.getUTCHours() * 60 + india.getUTCMinutes();
  const openAt = toMinutes(store.openAt);
  const closeAt = toMinutes(store.closeAt);
  const openToday = store.openDays.includes(today);
  if (openToday && minutes >= openAt && minutes < closeAt) return { open: true, closesAt: store.closeAt };
  if (openToday && minutes < openAt) return { open: false, opensAt: store.openAt, day: null };
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = (today + ahead) % 7;
    if (store.openDays.includes(day)) return { open: false, opensAt: store.openAt, day };
  }
  return { open: false, opensAt: store.openAt, day: null };
}
