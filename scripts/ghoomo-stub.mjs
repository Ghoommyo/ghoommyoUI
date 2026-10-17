#!/usr/bin/env node
/**
 * In-memory stand-in for the Ghoomo backend (Api.md), for developing and testing with
 * EXPO_PUBLIC_USE_REAL_API=true when the real server isn't available.
 *
 *   npm run stub:api            # http://localhost:3000/apis
 *   PORT=4000 npm run stub:api
 *
 * Seeded logins (password Secret@123 for all):
 *   customer  asha@example.com
 *   shop      raju_tailor   (settings configured)
 *   shop      city_salon    (settings never opened → null settings on browse rows)
 *   place     taj_mahal     (PLACE; the app should hide it)
 *
 * Data resets on restart. Every request is logged with its body.
 */
import { createHmac, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 3000);
const SECRET = 'ghoomo-stub-secret';
const PASSWORD = 'Secret@123';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// ---------- JWT (HS256) ----------
const b64url = (input) => Buffer.from(input).toString('base64url');
function signJwt(payload) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ ...payload, iat: now, exp: now + 86400 }))}`;
  return `${body}.${createHmac('sha256', SECRET).update(body).digest('base64url')}`;
}
function verifyJwt(header) {
  const token = header?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const [h, p, s] = token.split('.');
  if (!s || createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url') !== s) return null;
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
  return claims.exp * 1000 > Date.now() ? claims : null;
}

// ---------- data ----------
const now = () => new Date().toISOString();
const users = [{ user_id: randomUUID(), user_name: 'asha@example.com', password: PASSWORD }];
const locations = [];
const settings = new Map(); // loc_id → settings row
const profiles = new Map(); // loc_id → profile row
const appointments = [];
const calendars = new Map(); // clndr_id → { clndr_id, day_details, type, ... }

function addLocation(name, type, email) {
  const code = name.toLowerCase().replace(/ /g, '_');
  const row = {
    user_id: randomUUID(), loc_name: name, loc_type: type, loc_access: 'LIMITED', loc_code: code,
    active: 1, created_on: now(), created_by: code, updated_on: now(), updated_by: code, email,
    password: PASSWORD,
  };
  locations.push(row);
  return row;
}
function ensureSettings(loc) {
  if (!settings.has(loc.user_id)) {
    settings.set(loc.user_id, {
      stng_id: randomUUID(), loc_id: loc.user_id, max_limit: '100', unit: 'DAY', is_auto_approval: 1,
      open_at: '09:00', close_at: '21:00', created_on: now(), created_by: loc.loc_name, updated_on: now(), updated_by: loc.loc_name, active: 1,
    });
  }
  return settings.get(loc.user_id);
}
function ensureProfile(loc) {
  if (!profiles.has(loc.user_id)) {
    profiles.set(loc.user_id, {
      loc_profile_id: randomUUID(), loc_id: loc.user_id, loc_type: loc.loc_type, loc_code: loc.loc_code, loc_name: loc.loc_name,
      loc_info: null, loc_nav: null, loc_city: null, loc_country: null, loc_pin_code: null, loc_profile_url: null, loc_address: null,
      created_on: now(), created_by: loc.loc_name, updated_on: null, updated_by: null, active: 1,
    });
  }
  return profiles.get(loc.user_id);
}
const PERIOD_MS = { HOUR: 3600e3, DAY: 86400e3, WEEK: 7 * 86400e3 };
function addAppointment(body, userId) {
  const start = new Date(body.apntmnt_time);
  const row = {
    apntmnt_id: randomUUID(), loc_id: body.loc_id, loc_name: body.loc_name, apntmnt_time: start.toISOString(),
    apntmnt_period: body.apntmnt_period, user_id: userId, user_name: body.bokng_name ?? null,
    mobile_number: body.bokng_mobile ?? null, bokng_desc: body.bokng_desc ?? null,
    bokng_cnt: body.bokng_cnt == null ? null : String(body.bokng_cnt),
    start_time: start.toISOString(), end_time: new Date(start.getTime() + (PERIOD_MS[body.apntmnt_period] ?? 0)).toISOString(),
    cret_on: body.cret_on ?? now(), cret_by: body.cret_by ?? null, updt_on: now(), updt_by: body.cret_by ?? null,
    status: 'PENDING', status_updt_by: null, status_updt_on: null, updt_reason: null,
  };
  appointments.push(row);
  return row;
}
function addToCalendar({ plan_id, count_of_ppl, type, details }) {
  for (const d of details) {
    const cal = calendars.get(d.calendar_id) ?? {
      clndr_id: d.calendar_id, day_details: {}, type, active: 1, created_on: now(), created_by: 'system', updated_on: now(), updated_by: 'system',
    };
    for (const day of d.days) {
      const key = String(day);
      if (type === 'SHOP') {
        const slots = (cal.day_details[key] ??= {});
        const slot = (slots[d.time] ??= { count: 0, evnt_list: [] });
        slot.count += Number(count_of_ppl);
        slot.evnt_list.push(plan_id);
      } else {
        const entry = (cal.day_details[key] ??= { count: 0, evnt_list: [] });
        entry.count += Number(count_of_ppl);
        entry.evnt_list.push(plan_id);
      }
    }
    cal.updated_on = now();
    calendars.set(d.calendar_id, cal);
  }
}

// Seed: two shops, one place, and appointments around today (local time, like the app books).
{
  const raju = addLocation('Raju Tailor', 'SHOP', 'raju@example.com');
  Object.assign(ensureSettings(raju), { max_limit: '3', unit: 'HOUR', is_auto_approval: 0, open_at: '09:00', close_at: '22:00' });
  Object.assign(ensureProfile(raju), {
    loc_info: 'Custom tailoring and alterations since 1998.', loc_address: '12 MG Road', loc_city: 'Indore',
    loc_country: 'India', loc_pin_code: '452001', loc_nav: 'https://maps.google.com/?q=22.7196,75.8577',
  });
  addLocation('City Salon', 'SHOP', 'salon@example.com');
  addLocation('Taj Mahal', 'PLACE', 'taj@example.com');
  const asha = users[0];
  const other = randomUUID();
  const at = (offsetDays, hour) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const seed = [
    [-1, 17, asha.user_id, 'Asha', 1, 'Collect kurta', 'ACCEPTED'],
    [0, 10, other, 'Rohit', 3, 'Suit measurements', 'PENDING'],
    [0, 12, other, 'Karan', 2, 'Wedding sherwani', 'ACCEPTED'],
    [1, 15, asha.user_id, 'Asha', 1, 'Trial for dress', 'PENDING'],
  ];
  for (const [offset, hour, userId, name, cnt, desc, status] of seed) {
    const start = at(offset, hour);
    const appt = addAppointment({
      loc_id: raju.user_id, loc_name: raju.loc_name, apntmnt_time: start.toISOString(), apntmnt_period: 'HOUR',
      bokng_name: name, bokng_mobile: '9000000000', bokng_cnt: cnt, bokng_desc: desc,
    }, userId);
    appt.status = status;
    addToCalendar({
      plan_id: appt.apntmnt_id, count_of_ppl: cnt, type: 'SHOP',
      details: [{ calendar_id: `${MONTHS[start.getMonth()]}${start.getFullYear()}_${raju.user_id}_SHOP`, days: [start.getDate()], time: `${start.getHours()}:${start.getMinutes()}` }],
    });
  }
}

// ---------- helpers ----------
const browseRow = (loc) => {
  const { password: _pw, email: _email, ...row } = loc;
  const s = settings.get(loc.user_id);
  return { ...row, max_limit: s?.max_limit ?? null, unit: s?.unit ?? null, is_auto_approval: s?.is_auto_approval ?? null, open_at: s?.open_at ?? null, close_at: s?.close_at ?? null };
};
const localDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const today = () => localDay(new Date().toISOString());
const isLocToken = (c) => c && 'locCode' in c;

// ---------- routing ----------
const routes = [];
const route = (method, pattern, auth, handler) => routes.push({ method, pattern, auth, handler });
const UNAUTH = [401, { message: 'Authentication token is missing or invalid' }];

route('POST', /^\/signup$/, 'none', ({ body }) => {
  if (!body?.user_name || !body.password || body.password !== body.confirmPassword) return [400, { message: 'Invalid sign-up data' }];
  if (users.some((u) => u.user_name === body.user_name)) return [409, { error: 'User name already exists' }];
  users.push({ user_id: randomUUID(), user_name: body.user_name, password: body.password });
  return [201, { message: 'Sign-up successful' }];
});
route('POST', /^\/signin$/, 'none', ({ body }) => {
  if (!body?.user_name || !body.password) return [400, { message: 'Invalid sign-in data' }];
  const user = users.find((u) => u.user_name === body.user_name);
  if (!user) return [404, { error: 'User not found' }];
  if (user.password !== body.password) return [401, { error: 'Invalid credentials' }];
  const token = signJwt({ userId: user.user_id, userName: user.user_name, userType: 'CUSTOMER', userAccess: 'LIMITED' });
  return [200, { message: 'Sign-in successful', token: `Bearer ${token}` }];
});
route('GET', /^\/signout$/, 'none', () => [200, { message: 'Sign-out successful' }]);
route('GET', /^\/traveller$/, 'any', ({ claims }) => (isLocToken(claims) ? [403, { error: 'Forbidden' }] : [200, { user: claims }]));

route('POST', /^\/location\/signup$/, 'none', ({ body }) => {
  const ok = body?.location_name && ['SHOP', 'PLACE'].includes(body.location_type) && body.email && body.password && body.password === body.confirmPassword;
  if (!ok) return [400, { message: 'Invalid Location sign-up data' }];
  const code = body.location_name.toLowerCase().replace(/ /g, '_');
  if (locations.some((l) => l.loc_code === code)) return [409, { error: 'Location already exists' }];
  const loc = addLocation(body.location_name, body.location_type, body.email);
  loc.password = body.password;
  return [201, { message: 'Location Sign-up successful' }];
});
route('POST', /^\/location\/signin$/, 'none', ({ body }) => {
  if (!body?.location_code || !body.password) return [400, { message: 'Invalid sign-in data' }];
  const loc = locations.find((l) => l.loc_code === body.location_code);
  if (!loc) return [404, { error: 'User not found' }];
  if (loc.password !== body.password) return [401, { error: 'Invalid credentials' }];
  const token = signJwt({ userId: loc.user_id, locName: loc.loc_name, locType: loc.loc_type, locAccess: loc.loc_access, locCode: loc.loc_code });
  return [200, { message: 'Sign-in successful', token: `Bearer ${token}` }];
});

route('GET', /^\/location$/, 'none', () =>
  locations.length ? [200, { locationList: locations.filter((l) => l.active).map(browseRow) }] : [404, { error: 'Locations not found' }]);
route('GET', /^\/shop$/, 'any', () => [200, { locationList: locations.filter((l) => l.active && l.loc_type === 'SHOP').map(browseRow) }]);

// Owner routes: token must be a location token for the same locCode.
function ownLocation(claims, code) {
  if (!isLocToken(claims) || claims.locCode !== code) return [null, [403, { error: 'Forbidden: Access to this location is denied' }]];
  return [locations.find((l) => l.loc_code === code), null];
}
route('GET', /^\/location\/([^/]+)$/, 'any', ({ claims, params }) => {
  const [loc, err] = ownLocation(claims, params[0]);
  if (err) return err;
  const { password: _pw, ...row } = loc;
  return [200, { locationList: [row] }];
});
route('GET', /^\/location\/([^/]+)\/profile$/, 'any', ({ claims, params }) => {
  const [loc, err] = ownLocation(claims, params[0]);
  return err ?? [200, { locationList: [ensureProfile(loc)] }];
});
route('PUT', /^\/location\/([^/]+)\/profile$/, 'any', ({ claims, params, body }) => {
  const [loc, err] = ownLocation(claims, params[0]);
  if (err) return err;
  const row = profiles.get(loc.user_id);
  if (!row) return [404, { error: 'Location profile not found' }];
  const map = { locType: 'loc_type', locInfo: 'loc_info', locNavigation: 'loc_nav', locCity: 'loc_city', locCountry: 'loc_country', locPinCode: 'loc_pin_code', locProfileUrl: 'loc_profile_url', locAddress: 'loc_address' };
  for (const [field, column] of Object.entries(map)) if (body?.[field]) row[column] = body[field]; // empty strings ignored
  Object.assign(row, { updated_on: now(), updated_by: loc.loc_name });
  return [200, { profile: row }];
});
route('GET', /^\/location\/([^/]+)\/settings$/, 'any', ({ claims, params }) => {
  const [loc, err] = ownLocation(claims, params[0]);
  return err ?? [200, { locationList: [ensureSettings(loc)] }];
});
route('PUT', /^\/location\/([^/]+)\/settings$/, 'any', ({ claims, params, body }) => {
  const [loc, err] = ownLocation(claims, params[0]);
  if (err) return err;
  const row = settings.get(loc.user_id);
  if (!row) return [404, { error: 'Location settings not found, call GET first to create defaults' }];
  if (body?.maxLimit !== undefined) row.max_limit = String(body.maxLimit);
  if (body?.limitUnit !== undefined) row.unit = body.limitUnit;
  if (body?.isAutoApprove !== undefined) row.is_auto_approval = Number(body.isAutoApprove);
  if (body?.openAt !== undefined) row.open_at = body.openAt;
  if (body?.closeAt !== undefined) row.close_at = body.closeAt;
  Object.assign(row, { updated_on: now(), updated_by: loc.loc_name });
  return [200, { settings: row }];
});

route('GET', /^\/calendar\/([^/]+)$/, 'none', ({ params }) => {
  const cal = calendars.get(decodeURIComponent(params[0]));
  return cal ? [200, { calendarDetails: cal }] : [404, { error: 'Calendar details not found' }];
});
route('POST', /^\/calendar$/, 'any', ({ body }) => {
  if (!body?.plan_id || !body.type || !Array.isArray(body.details) || !body.details.length) {
    return [400, { error: 'plan_id, type and a non-empty details array are required' }];
  }
  addToCalendar(body);
  return [201, { message: 'Calendar details added successfully' }];
});

route('POST', /^\/appointment$/, 'any', ({ claims, body }) => {
  if (!body?.loc_id || !body.loc_name || !body.apntmnt_time || !body.apntmnt_period) return [400, { error: 'Missing required fields' }];
  if (Number.isNaN(new Date(body.apntmnt_time).getTime())) return [400, { error: 'Invalid apntmnt_time' }];
  return [201, { message: 'Appointment added successfully', appointmentId: addAppointment(body, claims.userId).apntmnt_id }];
});
route('PUT', /^\/appointment$/, 'any', ({ claims, body }) => {
  if (!isLocToken(claims)) return [403, { error: 'Forbidden: location login required' }];
  if (!body?.apntmnt_id || !body.status) return [400, { error: 'Missing required fields' }];
  if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(body.status)) return [400, { error: 'status must be one of ACCEPTED, REJECTED, PENDING' }];
  const appt = appointments.find((a) => a.apntmnt_id === body.apntmnt_id && a.loc_id === claims.userId);
  if (!appt) return [404, { error: 'Appointment not found' }];
  Object.assign(appt, { status: body.status, updt_reason: body.updt_reason ?? null, status_updt_by: claims.locName, status_updt_on: now() });
  return [200, { message: 'Appointment status updated successfully', appointment: appt }];
});

const LISTS = { pending: ['PENDING', 'open_appointments'], accepted: ['ACCEPTED', 'accepted_appointments'], rejected: ['REJECTED', 'rejected_appointments'], all: [null, 'all_appointments'] };
route('POST', /^\/events\/(pending|accepted|rejected|all)-appointment$/, 'any', ({ claims, params, body }) => {
  if (!isLocToken(claims)) return [403, { error: 'Forbidden: location login required' }];
  if (!Array.isArray(body?.selected_dates)) return [400, { error: 'selected_dates must be an array of dates' }];
  const [status, key] = LISTS[params[0]];
  const list = appointments.filter((a) => a.loc_id === claims.userId && (!status || a.status === status)
    && body.selected_dates.some((d) => localDay(a.start_time) <= d && d <= localDay(new Date(new Date(a.end_time).getTime() - 1).toISOString())));
  return [200, { [key]: list }];
});
const RANGES = {
  'coming-events': (day) => day > today(),
  'inprogress-events': (day) => day === today(),
  'completed-events': (day) => day < today(),
};
route('GET', /^\/events\/(coming-events|inprogress-events|completed-events)$/, 'any', ({ claims, params }) => {
  const mine = (a) => (isLocToken(claims) ? a.loc_id === claims.userId : a.user_id === claims.userId);
  const data = appointments.filter((a) => mine(a) && RANGES[params[0]](localDay(a.start_time)))
    .sort((a, b) => (params[0] === 'completed-events' ? -1 : 1) * a.start_time.localeCompare(b.start_time));
  return [200, { success: true, data }];
});

// ---------- server ----------
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const send = (status, json) => {
    res.writeHead(status, { ...CORS, ...(json ? { 'Content-Type': 'application/json' } : {}) });
    res.end(json ? JSON.stringify(json) : undefined);
    console.log(`${req.method} ${url.pathname} → ${status}`);
  };
  if (req.method === 'OPTIONS') return send(204);
  if (!url.pathname.startsWith('/apis')) return send(404, { error: 'Not found' });
  const path = url.pathname.slice('/apis'.length) || '/';

  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body;
  try {
    body = raw ? JSON.parse(raw) : undefined;
  } catch {
    return send(400, { error: 'Invalid JSON' });
  }
  if (body) console.log(`  body ${JSON.stringify(body)}`);

  for (const r of routes) {
    const match = r.method === req.method && path.match(r.pattern);
    if (!match) continue;
    const claims = verifyJwt(req.headers.authorization);
    if (r.auth === 'any' && !claims) return send(...UNAUTH);
    const [status, json] = r.handler({ body, claims, params: match.slice(1) });
    return send(status, json);
  }
  send(404, { error: 'Not found' });
}).listen(PORT, () => console.log(`Ghoomo stub API on http://localhost:${PORT}/apis`));
