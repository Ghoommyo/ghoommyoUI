import type { Language } from '@/i18n/languages';
import { intlLocale, type Translate } from '@/i18n/translate';
import type { DateKey, SlotStart } from '@/types/domain';

/** English month names. Also data: calendar ids are built from them (Api.md §3), so never translate these. */
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

// Hindi and Marathi dates and times come from Intl (Hermes has it); English keeps its exact format.
const formats = new Map<string, Intl.DateTimeFormat>();
function intl(language: Language, options: Intl.DateTimeFormatOptions, date: Date) {
  const id = language + JSON.stringify(options);
  let format = formats.get(id);
  if (!format) formats.set(id, (format = new Intl.DateTimeFormat(intlLocale(language), options)));
  return format.format(date);
}

/** `October 2026` in the chosen language (month is 0-based). */
export function formatMonthYear(year: number, month: number, language: Language): string {
  return language === 'en'
    ? `${MONTHS[month]} ${year}`
    : intl(language, { month: 'long', year: 'numeric' }, new Date(year, month, 1));
}

/** Short weekday names, Sunday first (`SUN` … in English). */
export function weekdayNames(language: Language): string[] {
  if (language === 'en') return [...WEEKDAYS];
  return [0, 1, 2, 3, 4, 5, 6].map((d) => intl(language, { weekday: 'short' }, new Date(2023, 0, 1 + d)));
}

/** `Oct 3, 2026` in the chosen language. */
export function formatDate(date: Date, language: Language): string {
  return language === 'en'
    ? `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`
    : intl(language, { day: 'numeric', month: 'short', year: 'numeric' }, date);
}

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

/** `HH:mm` → `9:00 AM` (or the Hindi/Marathi form). */
export function formatTime(time: string, language: Language): string {
  const [h, m] = time.split(':').map(Number);
  if (language !== 'en') return intl(language, { hour: 'numeric', minute: '2-digit' }, new Date(2000, 0, 1, h, m));
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${suffix}`;
}

/** `YYYY-MM-DD` → `October 3`. */
export function formatDayLong(key: DateKey, language: Language): string {
  const { year, month, day } = parseDateKey(key);
  return language === 'en'
    ? `${MONTHS[month]} ${day}`
    : intl(language, { day: 'numeric', month: 'long' }, new Date(year, month, day));
}

/** `YYYY-MM-DDTHH:mm` → `Oct 3, 9:00 AM`. */
export function formatSlotStart(start: SlotStart, language: Language): string {
  const { year, month, day } = parseDateKey(start.slice(0, 10));
  const date =
    language === 'en'
      ? `${MONTHS[month].slice(0, 3)} ${day}`
      : intl(language, { day: 'numeric', month: 'short' }, new Date(year, month, day));
  return `${date}, ${formatTime(start.slice(11, 16), language)}`;
}

/** `HH:mm` options every `step` minutes within [from, to] (minutes since midnight; 1440 = `24:00`). */
export function timeOptions(from: number, to: number, t: Translate, language: Language, step = 30) {
  const options: { label: string; value: string }[] = [];
  for (let m = from; m <= to; m += step) {
    options.push({
      label: m === 1440 ? t('date.midnight') : formatTime(fromMinutes(m), language),
      value: fromMinutes(m),
    });
  }
  return options;
}

/** ISO timestamp → `just now`, `5 min ago`, `3 h ago`, `2 d ago`, or `Oct 3`. */
export function formatTimeAgo(iso: string, t: Translate, language: Language, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return t('date.justNow');
  if (minutes < 60) return t('date.minutesAgo', { count: minutes });
  if (minutes < 24 * 60) return t('date.hoursAgo', { count: Math.floor(minutes / 60) });
  if (minutes < 7 * 24 * 60) return t('date.daysAgo', { count: Math.floor(minutes / (24 * 60)) });
  return language === 'en'
    ? `${MONTHS[then.getMonth()].slice(0, 3)} ${then.getDate()}`
    : intl(language, { day: 'numeric', month: 'short' }, then);
}

/** `YYYY-MM-DDTHH:mm` (local) → `Date`. */
export function slotStartToDate(start: SlotStart): Date {
  const [year, month, day] = start.slice(0, 10).split('-').map(Number);
  const [hours, minutes] = start.slice(11, 16).split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}
