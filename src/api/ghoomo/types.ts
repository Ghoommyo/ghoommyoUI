// Wire types for the Ghoomo backend. Shapes follow Api.md; numeric DB columns arrive as strings.

export type GhoomoLocType = 'SHOP' | 'PLACE';
export type GhoomoStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/** Row from GET /location and GET /shop: a location joined with its (possibly missing) settings. */
export interface GhoomoLocation {
  /** The location id (called `loc_id` on other rows). */
  user_id: string;
  loc_name: string;
  loc_type: GhoomoLocType;
  loc_access: string;
  loc_code: string;
  active: number;
  email?: string;
  max_limit?: string | null;
  unit?: string | null;
  is_auto_approval?: number | null;
  open_at?: string | null;
  close_at?: string | null;
  is_dark_store?: number | null;
  max_svc_qty?: number | null;
  /** `PRODUCT` (default) or `SERVICE`. */
  catalog_type?: string | null;
  /** Type of service, e.g. `Plumber`; null = not set. */
  svc_type?: string | null;
  /** Average stars (1 decimal) and number of ratings; strings, null when unrated. */
  rating_avg?: string | null;
  rating_count?: string | null;
}

export interface GhoomoSettings {
  stng_id: string;
  loc_id: string;
  max_limit: string;
  unit: string;
  is_auto_approval: number;
  open_at: string;
  close_at: string;
  is_dark_store?: number;
  /** Default quantity of each service per booking (services without their own limit). */
  max_svc_qty?: number;
  /** `PRODUCT` (default) or `SERVICE`. */
  catalog_type?: string;
  svc_type?: string | null;
}

/** A location's service (Api.md §5.4a). Already camelCase on the wire. */
export interface GhoomoService {
  id: string;
  name: string;
  description: string;
  price: number | string;
  imageUrl: string;
  /** The service's own limit; null = the location's `max_svc_qty`. */
  maxQty: number | null;
  effectiveMaxQty: number;
}

/** Snapshot of a booked service on an appointment row. */
export interface GhoomoBookedService {
  svc_id: string;
  name: string;
  price: number | string;
  qty: number;
}

export interface GhoomoProfile {
  loc_profile_id: string;
  loc_id: string;
  loc_type: GhoomoLocType;
  loc_code: string;
  loc_name: string;
  loc_info: string | null;
  loc_nav: string | null;
  loc_city: string | null;
  loc_country: string | null;
  loc_pin_code: string | null;
  loc_profile_url: string | null;
  loc_address: string | null;
}

export interface GhoomoAppointment {
  apntmnt_id: string;
  loc_id: string;
  loc_name: string;
  apntmnt_time: string;
  apntmnt_period: string;
  user_id: string;
  user_name: string | null;
  mobile_number: string | null;
  bokng_desc: string | null;
  bokng_cnt: string | number | null;
  start_time: string;
  end_time: string;
  cret_on: string | null;
  status: GhoomoStatus;
  /** The customer's own rating, on the customer's event lists only. */
  rtng_stars?: number | null;
  rtng_review?: string | null;
  /** Booked services, or null when none (or for bookings made before services existed). */
  services?: GhoomoBookedService[] | null;
  /** `TABLE` | `PICKUP` | `PORTER` | `APPOINTMENT` | `HOME_VISIT`; null on older rows. */
  order_type?: string | null;
}

/** GET /notifications row: a notification joined with its appointment. */
export interface GhoomoNotification {
  ntfy_id: string;
  apntmnt_id: string | null;
  kind: string;
  text: string;
  cret_on: string;
  read_on: string | null;
  appointment: GhoomoAppointment | null;
}

export interface GhoomoReviewsResponse {
  reviews: { id: string; name: string; stars: number; review: string; createdAt: string }[];
  nextCursor: string | null;
  summary?: { average: number | null; count: number };
}

export interface GhoomoReminderSettings {
  enabled: boolean;
  hoursBefore: number;
  platform: string | null;
  updatedAt: string | null;
}

/** SHOP: day-of-month → "H:M" slot → counts. PLACE: day-of-month → counts. */
export type GhoomoSlotCount = { count: number; evnt_list: string[] };
export type GhoomoDayDetails = Record<string, Record<string, GhoomoSlotCount> | GhoomoSlotCount>;

export interface GhoomoCalendar {
  clndr_id: string;
  day_details: GhoomoDayDetails;
  type: GhoomoLocType;
}

/** Payload of a user token (POST /signin). */
export interface GhoomoUserClaims {
  userId: string;
  userName: string;
  userType: string;
  userAccess: string;
}

/** Payload of a location token (POST /location/signin). */
export interface GhoomoLocationClaims {
  userId: string;
  locName: string;
  locType: GhoomoLocType;
  locAccess: string;
  locCode: string;
}
