import type {
  GhoomoAppointment,
  GhoomoDayDetails,
  GhoomoLocation,
  GhoomoProfile,
  GhoomoSettings,
  GhoomoSlotCount,
  GhoomoStatus,
} from '@/api/ghoomo/types';
import { makeDateKey, MONTHS, parseDateKey, toDateKey, toMinutes } from '@/lib/date';
import { buildSlotStarts, daysInMonth } from '@/lib/slots';
import type {
  Booking,
  BookingStatus,
  DateKey,
  DaySummary,
  LimitUnit,
  Slot,
  SlotStart,
  Store,
  StoreProfile,
  StoreSettings,
} from '@/types/domain';

/**
 * Values for fields the Ghoomo API can't store yet. Hardcoded until the API supports them —
 * remove an entry here once its field is wired through.
 */
export const API_DEFAULTS = {
  maxPerBooking: 5,
  state: '',
  /**
   * No user-profile endpoints: the name is the username given at signup in this app session
   * (POST /signup can't store it yet), else the email prefix; mobile starts empty.
   */
  userMobile: '',
  /** Server defaults applied when a location has never opened its settings (Api.md §5.4). */
  settings: { maxLimit: 100, unit: 'DAY', autoApprove: true, openAt: '09:00', closeAt: '21:00' },
} as const;

const pad = (n: number) => String(n).padStart(2, '0');


export function toLimitUnit(unit: string | null | undefined): LimitUnit {
  switch (unit?.toUpperCase()) {
    case 'HOUR':
      return 'hour';
    case 'HALF_HOUR':
      return 'halfHour';
    default:
      return 'day';
  }
}

export function fromLimitUnit(unit: LimitUnit): string {
  return { day: 'DAY', hour: 'HOUR', halfHour: 'HALF_HOUR' }[unit];
}

export function toStatus(status: GhoomoStatus): BookingStatus {
  return status.toLowerCase() as BookingStatus;
}

export function fromStatus(status: BookingStatus): GhoomoStatus {
  return status.toUpperCase() as GhoomoStatus;
}

/** Local `YYYY-MM-DDTHH:mm` → ISO UTC string. */
export function localToIso(start: SlotStart): string {
  const { year, month, day } = parseDateKey(start.slice(0, 10));
  const minutes = toMinutes(start.slice(11, 16));
  return new Date(year, month, day, Math.floor(minutes / 60), minutes % 60).toISOString();
}

/** ISO string → local `YYYY-MM-DDTHH:mm`. */
export function isoToLocal(iso: string): SlotStart {
  const d = new Date(iso);
  return `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `october2026_<locId>_SHOP` (month is 0-based). */
export function calendarId(year: number, month: number, locId: string): string {
  return `${MONTHS[month].toLowerCase()}${year}_${locId}_SHOP`;
}

/** Calendar slot key, unpadded like the server's `getHours():getMinutes()`: `09:00` → `9:0`. */
export function slotKey(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h}:${m}`;
}

function isSlotCount(value: unknown): value is GhoomoSlotCount {
  return typeof (value as GhoomoSlotCount)?.count === 'number';
}

/** Total people booked on a day, for either the SHOP or the PLACE calendar shape. */
function dayTotal(entry: GhoomoDayDetails[string] | undefined): number {
  if (!entry) return 0;
  if (isSlotCount(entry)) return entry.count;
  return Object.values(entry).reduce((sum, slot) => sum + (slot?.count ?? 0), 0);
}

/** Per-slot counts for one day. Calendar entries are bucketed into the slot that contains them. */
export function slotsFromCalendar(
  dayDetails: GhoomoDayDetails | null,
  date: DateKey,
  store: Pick<StoreSettings, 'openAt' | 'closeAt' | 'limitUnit'>,
): Slot[] {
  const entry = dayDetails?.[String(parseDateKey(date).day)];
  const starts = buildSlotStarts(date, store.openAt, store.closeAt, store.limitUnit);
  if (store.limitUnit === 'day') return [{ start: starts[0], count: dayTotal(entry) }];

  const times =
    entry && !isSlotCount(entry)
      ? Object.entries(entry).map(([key, slot]) => ({ minutes: toMinutes(key), count: slot.count }))
      : [];
  return starts.map((start, i) => {
    const from = toMinutes(start.slice(11, 16));
    const to = i + 1 < starts.length ? toMinutes(starts[i + 1].slice(11, 16)) : toMinutes(store.closeAt);
    const count = times
      .filter((t) => t.minutes >= from && t.minutes < to)
      .reduce((sum, t) => sum + t.count, 0);
    return { start, count };
  });
}

/** Per-day totals for a month (month is 0-based). */
export function daySummaryFromCalendar(
  dayDetails: GhoomoDayDetails | null,
  year: number,
  month: number,
): DaySummary[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => ({
    date: makeDateKey(year, month, i + 1),
    count: dayTotal(dayDetails?.[String(i + 1)]),
  }));
}

type SettingsFields = Pick<GhoomoSettings, 'max_limit' | 'unit' | 'is_auto_approval' | 'open_at' | 'close_at'>;
/** Settings columns, which are null on browse rows for locations that never opened settings. */
type SettingsInput = { [K in keyof SettingsFields]?: SettingsFields[K] | null };

export function settingsToStore(row: SettingsInput): Omit<StoreSettings, 'name'> {
  const d = API_DEFAULTS.settings;
  return {
    maxPerSlot: Number(row.max_limit ?? d.maxLimit) || d.maxLimit,
    maxPerBooking: API_DEFAULTS.maxPerBooking,
    limitUnit: toLimitUnit(row.unit ?? d.unit),
    autoApprove: row.is_auto_approval == null ? d.autoApprove : row.is_auto_approval === 1,
    openAt: row.open_at || d.openAt,
    closeAt: row.close_at || d.closeAt,
  };
}

export function settingsToRequest(settings: StoreSettings) {
  return {
    maxLimit: settings.maxPerSlot,
    limitUnit: fromLimitUnit(settings.limitUnit),
    isAutoApprove: settings.autoApprove ? 1 : 0,
    openAt: settings.openAt,
    closeAt: settings.closeAt,
  };
}

export const EMPTY_PROFILE: StoreProfile = {
  address: '',
  pin: '',
  city: '',
  state: API_DEFAULTS.state,
  country: '',
  bio: '',
};

export function profileToStore(row: GhoomoProfile | null | undefined): StoreProfile {
  if (!row) return EMPTY_PROFILE;
  return {
    address: row.loc_address ?? '',
    pin: row.loc_pin_code ?? '',
    city: row.loc_city ?? '',
    state: API_DEFAULTS.state,
    country: row.loc_country ?? '',
    bio: row.loc_info ?? '',
    mapUrl: row.loc_nav ?? undefined,
  };
}

/** PUT body for a profile. The API ignores empty strings, so cleared fields can't be blanked yet. */
export function profileToRequest(profile: StoreProfile) {
  return {
    locAddress: profile.address,
    locPinCode: profile.pin,
    locCity: profile.city,
    locCountry: profile.country,
    locInfo: profile.bio,
    ...(profile.mapUrl ? { locNavigation: profile.mapUrl } : {}),
  };
}

/** A browse-list row (location + settings) as a Store. The profile isn't part of this row. */
export function locationToStore(row: GhoomoLocation, profile?: GhoomoProfile | null): Store {
  return {
    id: row.user_id,
    name: row.loc_name,
    ...settingsToStore(row),
    profile: profileToStore(profile),
  };
}

export function appointmentToBooking(row: GhoomoAppointment): Booking {
  return {
    id: row.apntmnt_id,
    storeId: row.loc_id,
    storeName: row.loc_name,
    userId: row.user_id,
    slotStart: isoToLocal(row.start_time || row.apntmnt_time),
    name: row.user_name ?? '',
    mobile: row.mobile_number ?? '',
    people: Number(row.bokng_cnt) || 1,
    description: row.bokng_desc ?? '',
    status: toStatus(row.status),
    createdAt: row.cret_on ?? '',
  };
}
