import { fromMinutes, makeDateKey, toMinutes } from '@/lib/date';
import type { Booking, DateKey, LimitUnit, SlotStart, StoreSettings } from '@/types/domain';

export type SlotState = 'ok' | 'full' | 'over';

const STEP_MINUTES: Record<Exclude<LimitUnit, 'day'>, number> = { hour: 60, halfHour: 30 };

export const LIMIT_UNIT_LABEL: Record<LimitUnit, string> = {
  day: 'day',
  hour: 'hour',
  halfHour: 'half hour',
};

/**
 * Slot start times for a day, from `openAt` up to (not including) `closeAt`.
 * A `day` limit unit yields a single slot at opening time.
 */
export function buildSlotStarts(
  date: DateKey,
  openAt: string,
  closeAt: string,
  unit: LimitUnit,
): SlotStart[] {
  const open = toMinutes(openAt);
  if (unit === 'day') return [`${date}T${openAt}`];
  const step = STEP_MINUTES[unit];
  const starts: SlotStart[] = [];
  for (let m = open; m < toMinutes(closeAt); m += step) {
    starts.push(`${date}T${fromMinutes(m)}`);
  }
  return starts;
}

export function slotState(count: number, max: number): SlotState {
  if (count > max) return 'over';
  if (count >= max) return 'full';
  return 'ok';
}

/** How many visitors a store can take in a whole day. */
export function dayCapacity(store: StoreSettings): number {
  const slots = buildSlotStarts('2000-01-01', store.openAt, store.closeAt, store.limitUnit).length;
  return store.maxPerSlot * slots;
}

/** Visitors counted against capacity: rejected bookings don't count. */
export function visitorCount(bookings: Booking[]): number {
  return bookings.reduce((sum, b) => (b.status === 'rejected' ? sum : sum + b.people), 0);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Every weekday, 0 = Sunday … 6 = Saturday (`Date.getDay()`). */
export const ALL_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];
/** Weekday buttons in the order shown (Monday first): `day` is the `Date.getDay()` value. */
export const WEEK = [
  { day: 1, short: 'Mon', long: 'Monday' },
  { day: 2, short: 'Tue', long: 'Tuesday' },
  { day: 3, short: 'Wed', long: 'Wednesday' },
  { day: 4, short: 'Thu', long: 'Thursday' },
  { day: 5, short: 'Fri', long: 'Friday' },
  { day: 6, short: 'Sat', long: 'Saturday' },
  { day: 0, short: 'Sun', long: 'Sunday' },
] as const;
const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const weekday = (year: number, month: number, day: number) => new Date(year, month, day).getDay();

/** Whether the store is open on that date (no store = every day). */
export function isOpenDay(openDays: number[] | undefined, year: number, month: number, day: number): boolean {
  return !openDays || openDays.includes(weekday(year, month, day));
}

/** The days of a month the store is open, as Day picker options ("Mon 3"). */
export function openDayOptions(openDays: number[] | undefined, year: number, month: number) {
  const options: { label: string; value: number }[] = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    if (isOpenDay(openDays, year, month, d)) {
      options.push({ label: openDays ? `${SHORT_DAY[weekday(year, month, d)]} ${d}` : String(d), value: d });
    }
  }
  return options;
}

/** `day` when the store is open then, else its next open day in the month, else its first one. */
export function nextOpenDay(openDays: number[] | undefined, year: number, month: number, day: number): number {
  const open = openDayOptions(openDays, year, month).map((o) => o.value);
  return open.find((d) => d >= day) ?? open[0] ?? day;
}

/** "Every day", "Mon–Fri", "Mon, Wed, Sat" (Monday first). */
export function openDaysLabel(openDays: number[]): string {
  const on = WEEK.filter((w) => openDays.includes(w.day));
  if (on.length === 7) return 'Every day';
  const positions = on.map((w) => WEEK.indexOf(w));
  const consecutive = positions.every((p, i) => i === 0 || p === positions[i - 1] + 1);
  if (on.length >= 3 && consecutive) return `${on[0].short}–${on[on.length - 1].short}`;
  return on.map((w) => w.short).join(', ');
}

/** Calendar cells for a month, padded with `null` so day 1 lands on its weekday. */
export function monthGrid(year: number, month: number): (DateKey | null)[] {
  const lead = new Date(year, month, 1).getDay();
  const cells: (DateKey | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(makeDateKey(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Splits bookings into upcoming (from tomorrow), today, and past. */
export function bucketEvents(bookings: Booking[], today: DateKey) {
  const coming: Booking[] = [];
  const inProgress: Booking[] = [];
  const completed: Booking[] = [];
  for (const b of bookings) {
    const day = b.slotStart.slice(0, 10);
    if (day > today) coming.push(b);
    else if (day === today) inProgress.push(b);
    else completed.push(b);
  }
  const asc = (a: Booking, b: Booking) => a.slotStart.localeCompare(b.slotStart);
  coming.sort(asc);
  inProgress.sort(asc);
  completed.sort((a, b) => asc(b, a));
  return { coming, inProgress, completed };
}
