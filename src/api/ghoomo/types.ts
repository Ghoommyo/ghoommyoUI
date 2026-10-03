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
}

export interface GhoomoSettings {
  stng_id: string;
  loc_id: string;
  max_limit: string;
  unit: string;
  is_auto_approval: number;
  open_at: string;
  close_at: string;
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
