import type { DateKey, SlotStart } from '@/types/domain';

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function makeDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

/** Parses `YYYY-MM-DD` into its parts (month is 0-based). */
export function parseDateKey(key: DateKey) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month: month - 1, day };
}

export function addDays(key: DateKey, days: number): DateKey {
  const { year, month, day } = parseDateKey(key);
  return toDateKey(new Date(year, month, day + days));
}

/** `HH:mm` → minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes since midnight → `HH:mm`. */
export function fromMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** `HH:mm` → `9:00 AM`. */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${suffix}`;
}

/** `YYYY-MM-DD` → `October 3`. */
export function formatDayLong(key: DateKey): string {
  const { month, day } = parseDateKey(key);
  return `${MONTHS[month]} ${day}`;
}

/** `YYYY-MM-DDTHH:mm` → `Oct 3, 9:00 AM`. */
export function formatSlotStart(start: SlotStart): string {
  const { month, day } = parseDateKey(start.slice(0, 10));
  return `${MONTHS[month].slice(0, 3)} ${day}, ${formatTime(start.slice(11, 16))}`;
}
