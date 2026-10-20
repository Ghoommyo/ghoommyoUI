#!/usr/bin/env node
/**
 * In-memory stand-in for the Ghoomo backend (Api.md), for developing and testing without the
 * real server. Point the app at it with EXPO_PUBLIC_API_URL=http://localhost:3000/apis
 * (the app defaults to the Vercel deployment).
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
 * Also serves services (Api.md §5.4a), notifications, booking edits, ratings/reviews and
 * reminder settings (§5.6–5.6b) so those flows can be tried without the real backend.
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
const notifications = []; // { ntfy_id, rcpt_id, apntmnt_id, kind, text, cret_on, read_on }
const ratings = []; // { rtng_id, apntmnt_id, loc_id, user_id, name, stars, review, cret_on }
const reminderSettings = []; // append-only audit trail: { acct_id, enabled, hoursBefore, platform, cret_on }
// Types of service (svc_type_tbl): the standard trades, then ones locations added through "Other".
const STANDARD_SERVICE_TYPES = ['Electrician', 'Wireman', 'Lineman', 'Plumber', 'Pipefitter', 'Carpenter', 'Welder', 'Fabricator', 'Bricklayer', 'Mason', 'Roofer', 'Scaffolder', 'General Contractor', 'Automotive Mechanic', 'Diesel Mechanic', 'Auto Electrician', 'Truck Driver', 'Delivery Driver', 'Forklift Operator', 'Heavy Equipment Operator', 'Aircraft Maintenance Technician', 'Assembly Line Worker', 'Machinist', 'Warehouse Worker', 'Sorter', 'Power Plant Operator', 'Sandblaster', 'Industrial Cleaner', 'HVAC Technician', 'Elevator Installer', 'Solar Panel Installer', 'Pest Control Technician', 'Security Guard', 'Cleaning Supervisor'];
const addedServiceTypes = [];
// Store categories (option_tbl STORE_CATEGORY) and product types (PRODUCT_TYPE; the admin manages them).
const STANDARD_STORE_CATEGORIES = ['Food', 'Beverages', 'Grocery', 'Fresh produce', 'Dairy', 'Meat & seafood', 'Bakery', 'Snacks', 'Clothing', 'Footwear', 'Accessories', 'Jewelry', 'Watches', 'Bags & luggage', 'Electronics', 'Mobile phones', 'Computers', 'Appliances', 'Home furniture', 'Home decor', 'Kitchenware', 'Bedding & linen', 'Beauty & cosmetics', 'Personal care', 'Health & wellness', 'Pharmacy', 'Baby products', 'Toys & games', 'Sports & fitness', 'Outdoor', 'Books', 'Stationery', 'Office supplies', 'Music instruments', 'Movies & media', 'Pet supplies', 'Automotive', 'Hardware & tools', 'Garden', 'Cleaning supplies', 'Gifts', 'Art & crafts', 'Digital products', 'Services'];
const addedStoreCategories = [];
const productTypes = ['Handmade', 'Organic food'];
const services = []; // { svc_id, loc_id, svc_name, svc_desc, svc_price, svc_img_url, max_qty, active, created_on }
function notify(rcptId, apptId, kind, text) {
  notifications.push({ ntfy_id: randomUUID(), rcpt_id: rcptId, apntmnt_id: apptId, kind, text, cret_on: now(), read_on: null });
}
const starText = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

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
      open_at: '09:00', close_at: '21:00', max_svc_qty: 1, is_dark_store: 0, catalog_type: 'PRODUCT', svc_type: null, store_cat: null, created_on: now(), created_by: loc.loc_name, updated_on: now(), updated_by: loc.loc_name, active: 1,
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
/** Order types a location takes, the first being the default (docs/API.md). */
// Without an address a location can't be visited, so only PORTER / HOME_VISIT remain.
function allowedOrderTypes(catalogType, dark, hasAddress = true) {
  const all = catalogType === 'SERVICE' ? (dark ? ['HOME_VISIT'] : ['APPOINTMENT', 'HOME_VISIT']) : dark ? ['PORTER', 'PICKUP'] : ['TABLE', 'PICKUP', 'PORTER'];
  return hasAddress ? all : all.filter((t) => !['TABLE', 'PICKUP', 'APPOINTMENT'].includes(t));
}
const hasAddress = (locId) => !!profiles.get(locId)?.loc_address?.trim();
const addresses = []; // { addr_id, user_id, addr_label, addr_text, cret_on, active }
const addressJson = (a) => ({ id: a.addr_id, label: a.addr_label ?? '', address: a.addr_text });
function readAddress(body) {
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  const label = body?.label == null ? '' : body.label;
  if (!address || address.length > 500) return { error: 'address is required (at most 500 characters)' };
  if (typeof label !== 'string' || label.trim().length > 40) return { error: 'label must be at most 40 characters' };
  return { address, label: label.trim() || null };
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
    services: body.services ?? null,
    order_type: body.order_type ?? null,
    dlvry_addr: body.dlvry_addr ?? null,
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
  Object.assign(ensureSettings(raju), { max_limit: '3', unit: 'HOUR', is_auto_approval: 0, open_at: '09:00', close_at: '22:00', max_svc_qty: 2, catalog_type: 'SERVICE' });
  for (const [name, desc, price, maxQty] of [
    ['Blouse stitching', 'Lined blouse, fitted to your measurements', 450, null],
    ['Kurta alteration', 'Take in, let out or shorten', 150, null],
    ['Hemming', 'Trousers, skirts or sarees', 80, 1],
  ]) {
    services.push({ svc_id: randomUUID(), loc_id: raju.user_id, svc_name: name, svc_desc: desc, svc_price: price, svc_img_url: '', max_qty: maxQty, active: 1, created_on: now() });
  }
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
  const p = profiles.get(loc.user_id);
  const rated = ratings.filter((r) => r.loc_id === loc.user_id);
  const avg = rated.length ? (rated.reduce((sum, r) => sum + r.stars, 0) / rated.length).toFixed(1) : null;
  return {
    ...row, max_limit: s?.max_limit ?? null, unit: s?.unit ?? null, is_auto_approval: s?.is_auto_approval ?? null, open_at: s?.open_at ?? null, close_at: s?.close_at ?? null,
    max_svc_qty: s?.max_svc_qty ?? null, is_dark_store: s?.is_dark_store ?? null, catalog_type: s?.catalog_type ?? null, svc_type: s?.svc_type ?? null, store_cat: s?.store_cat ?? null,
    loc_address: p?.loc_address ?? null, loc_city: p?.loc_city ?? null, loc_pin_code: p?.loc_pin_code ?? null, loc_country: p?.loc_country ?? null, loc_nav: p?.loc_nav ?? null,
    rating_avg: avg, rating_count: rated.length ? String(rated.length) : null,
  };
};
const localDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const today = () => localDay(new Date().toISOString());
/** Service row → the API's service object, with the limit that applies. */
const serviceJson = (svc) => ({
  id: svc.svc_id, name: svc.svc_name, description: svc.svc_desc ?? '', price: svc.svc_price, imageUrl: svc.svc_img_url ?? '',
  maxQty: svc.max_qty, effectiveMaxQty: svc.max_qty ?? settings.get(svc.loc_id)?.max_svc_qty ?? 1, productType: svc.prod_type ?? null,
});
const activeServices = (locId) => services.filter((svc) => svc.loc_id === locId && svc.active);
function serviceFields(body) {
  if (typeof body?.name !== 'string' || !body.name.trim()) return [null, 'name is required'];
  const price = Number(body.price);
  if (body.price === undefined || body.price === null || body.price === '' || !Number.isFinite(price) || price < 0) return [null, 'price must be a number of at least 0'];
  const maxQty = body.maxQty ?? null;
  if (maxQty !== null && (!Number.isInteger(maxQty) || maxQty < 1)) return [null, 'maxQty must be empty or a whole number of at least 1'];
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) return [null, 'imageUrl must start with http:// or https://'];
  const wanted = typeof body.productType === 'string' && body.productType.trim() ? body.productType.trim().toLowerCase() : null;
  const prodType = wanted ? productTypes.find((t) => t.toLowerCase() === wanted) : null;
  if (wanted && !prodType) return [null, 'productType must be one of the product types'];
  return [{ svc_name: body.name.trim(), svc_desc: typeof body.description === 'string' ? body.description.trim() : '', svc_price: Math.round(price * 100) / 100, svc_img_url: imageUrl, max_qty: maxQty, prod_type: prodType ?? null }, null];
}
const isLocToken = (c) => c && 'locCode' in c;

// ---------- routing ----------
const routes = [];
const route = (method, pattern, auth, handler) => routes.push({ method, pattern, auth, handler });
const UNAUTH = [401, { message: 'Authentication token is missing or invalid' }];

route('POST', /^\/signup$/, 'none', ({ body }) => {
  if (!body?.user_name || !body.password || body.password !== body.confirmPassword) return [400, { message: 'Invalid sign-up data' }];
  if (users.some((u) => u.user_name === body.user_name && u.active !== 0)) return [409, { error: 'User name already exists' }];
  users.push({ user_id: randomUUID(), user_name: body.user_name, password: body.password });
  return [201, { message: 'Sign-up successful' }];
});
route('POST', /^\/signin$/, 'none', ({ body }) => {
  if (!body?.user_name || !body.password) return [400, { message: 'Invalid sign-in data' }];
  const user = users.find((u) => u.user_name === body.user_name && u.active !== 0);
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
  const loc = locations.find((l) => l.loc_code === body.location_code && l.active);
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
  if (body?.maxServiceQty !== undefined) {
    if (!Number.isInteger(body.maxServiceQty) || body.maxServiceQty < 1) return [400, { error: 'maxServiceQty must be a whole number of at least 1' }];
    row.max_svc_qty = body.maxServiceQty;
  }
  if (body?.isDarkStore !== undefined) {
    if (body.isDarkStore !== 0 && body.isDarkStore !== 1) return [400, { error: 'isDarkStore must be 0 or 1' }];
    row.is_dark_store = body.isDarkStore;
  }
  if (body?.serviceType !== undefined) {
    const name = typeof body.serviceType === 'string' ? body.serviceType.trim().replace(/\s+/g, ' ') : body.serviceType;
    if (name !== null && (typeof name !== 'string' || !name || name.length > 60)) return [400, { error: 'serviceType must be 1 to 60 characters, or null' }];
    // A new type joins the shared list; an existing one keeps its listed spelling.
    const listed = name && [...STANDARD_SERVICE_TYPES, ...addedServiceTypes].find((t) => t.toLowerCase() === name.toLowerCase());
    if (name && !listed) addedServiceTypes.push(name);
    row.svc_type = listed || name;
  }
  if (body?.storeCategory !== undefined) {
    const name = typeof body.storeCategory === 'string' ? body.storeCategory.trim().replace(/\s+/g, ' ') : body.storeCategory;
    if (name !== null && (typeof name !== 'string' || !name || name.length > 60)) return [400, { error: 'storeCategory must be 1 to 60 characters, or null' }];
    const listed = name && [...STANDARD_STORE_CATEGORIES, ...addedStoreCategories].find((c) => c.toLowerCase() === name.toLowerCase());
    if (name && !listed) addedStoreCategories.push(name);
    row.store_cat = listed || name;
  }
  if (body?.catalogType !== undefined) {
    if (!['PRODUCT', 'SERVICE'].includes(body.catalogType)) return [400, { error: 'catalogType must be PRODUCT or SERVICE' }];
    row.catalog_type = body.catalogType;
  }
  Object.assign(row, { updated_on: now(), updated_by: loc.loc_name });
  return [200, { settings: row }];
});

route('GET', /^\/store-categories$/, 'none', () => [200, { storeCategories: [...STANDARD_STORE_CATEGORIES, ...[...addedStoreCategories].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))] }]);
route('GET', /^\/product-types$/, 'none', () => [200, { productTypes: [...productTypes].sort((a, b) => a.localeCompare(b)) }]);
route('GET', /^\/service-types$/, 'none', () => [200, { serviceTypes: [...STANDARD_SERVICE_TYPES, ...[...addedServiceTypes].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))] }]);
route('GET', /^\/services\/([^/]+)$/, 'none', ({ params }) => [200, { services: activeServices(params[0]).map(serviceJson) }]);
route('GET', /^\/location\/([^/]+)\/services$/, 'any', ({ claims, params }) => {
  const [loc, err] = ownLocation(claims, params[0]);
  return err ?? [200, { services: activeServices(loc.user_id).map(serviceJson) }];
});
route('POST', /^\/location\/([^/]+)\/services$/, 'any', ({ claims, params, body }) => {
  const [loc, err] = ownLocation(claims, params[0]);
  if (err) return err;
  const [fields, error] = serviceFields(body);
  if (error) return [400, { error }];
  const svc = { svc_id: randomUUID(), loc_id: loc.user_id, ...fields, active: 1, created_on: now() };
  services.push(svc);
  return [201, { service: serviceJson(svc) }];
});
route('PUT', /^\/location\/([^/]+)\/services\/([^/]+)$/, 'any', ({ claims, params, body }) => {
  const [loc, err] = ownLocation(claims, params[0]);
  if (err) return err;
  const svc = activeServices(loc.user_id).find((s) => s.svc_id === params[1]);
  if (!svc) return [404, { error: 'Service not found' }];
  const [fields, error] = serviceFields(body);
  if (error) return [400, { error }];
  Object.assign(svc, fields);
  return [200, { service: serviceJson(svc) }];
});
route('DELETE', /^\/location\/([^/]+)\/services\/([^/]+)$/, 'any', ({ claims, params }) => {
  const [loc, err] = ownLocation(claims, params[0]);
  if (err) return err;
  const svc = activeServices(loc.user_id).find((s) => s.svc_id === params[1]);
  if (!svc) return [404, { error: 'Service not found' }];
  svc.active = 0;
  return [200, { message: 'Service deleted' }];
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
  if (typeof body.bokng_desc !== 'string' || !body.bokng_desc.trim()) return [400, { error: 'bokng_desc is required' }];
  if (Number.isNaN(new Date(body.apntmnt_time).getTime())) return [400, { error: 'Invalid apntmnt_time' }];
  // Booked services: each one this location's, listed once, within its limit; saved as a snapshot.
  let booked = null;
  if (body.services != null) {
    if (!Array.isArray(body.services)) return [400, { error: 'services must be an array' }];
    const offered = activeServices(body.loc_id).map(serviceJson);
    const seen = new Set();
    booked = [];
    for (const { svc_id, qty } of body.services) {
      const svc = offered.find((s) => s.id === svc_id);
      if (!svc || seen.has(svc_id)) return [400, { error: "services contains a service this location doesn't offer" }];
      seen.add(svc_id);
      if (!Number.isInteger(qty) || qty < 1 || qty > svc.effectiveMaxQty) return [400, { error: `qty for ${svc.name} must be between 1 and ${svc.effectiveMaxQty}` }];
      booked.push({ svc_id, name: svc.name, price: svc.price, qty });
    }
    if (!booked.length) booked = null;
  }
  // Dark stores take orders (each counts as one); the order types depend on the store type.
  const stng = settings.get(body.loc_id);
  const dark = Number(stng?.is_dark_store ?? 0) === 1;
  const allowed = allowedOrderTypes(stng?.catalog_type, dark, hasAddress(body.loc_id));
  const orderType = body.order_type ?? allowed[0];
  if (!allowed.includes(orderType)) {
    return [400, { error: `This store takes ${allowed.length > 1 ? `${allowed.slice(0, -1).join(', ')} or ${allowed.at(-1)}` : allowed[0]} bookings` }];
  }
  // Porter and home visits go to the customer, so they need an address.
  const delivery = ['PORTER', 'HOME_VISIT'].includes(orderType);
  const dlvry = typeof body.delivery_address === 'string' ? body.delivery_address.trim() : '';
  if (delivery && (!dlvry || dlvry.length > 500)) return [400, { error: 'delivery_address is required for PORTER and HOME_VISIT bookings (at most 500 characters)' }];
  const appt = addAppointment({ ...body, services: booked, order_type: orderType, bokng_cnt: dark || orderType === 'HOME_VISIT' ? 1 : body.bokng_cnt, dlvry_addr: delivery ? dlvry : null }, claims.userId);
  // Auto-approving locations (the default for new settings) accept on creation.
  const auto = Number(stng?.is_auto_approval ?? 1) === 1;
  if (auto) Object.assign(appt, { status: 'ACCEPTED', status_updt_by: 'SYSTEM', status_updt_on: now() });
  notify(body.loc_id, appt.apntmnt_id, auto ? 'AUTO_ACCEPTED' : 'NEW_REQUEST', `${body.bokng_name || 'A customer'} requested a booking${auto ? ' — auto-approved' : ''}`);
  return [201, { message: 'Appointment added successfully', appointmentId: appt.apntmnt_id, status: appt.status, orderType }];
});
route('PUT', /^\/appointment$/, 'any', ({ claims, body }) => {
  if (!isLocToken(claims)) return [403, { error: 'Forbidden: location login required' }];
  if (!body?.apntmnt_id || !body.status) return [400, { error: 'Missing required fields' }];
  if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(body.status)) return [400, { error: 'status must be one of ACCEPTED, REJECTED, PENDING' }];
  const appt = appointments.find((a) => a.apntmnt_id === body.apntmnt_id && a.loc_id === claims.userId);
  if (!appt) return [404, { error: 'Appointment not found' }];
  Object.assign(appt, { status: body.status, updt_reason: body.updt_reason ?? null, status_updt_by: claims.locName, status_updt_on: now() });
  if (body.status !== 'PENDING') notify(appt.user_id, appt.apntmnt_id, body.status, `${claims.locName} ${body.status.toLowerCase()} your booking`);
  return [200, { message: 'Appointment status updated successfully', appointment: appt }];
});
route('PUT', /^\/appointment\/([^/]+)$/, 'any', ({ claims, params, body }) => {
  if (isLocToken(claims)) return [403, { error: 'Forbidden: user login required' }];
  const appt = appointments.find((a) => a.apntmnt_id === params[0] && a.user_id === claims.userId);
  if (!appt) return [404, { error: 'Appointment not found' }];
  if (!['PENDING', 'ACCEPTED'].includes(appt.status)) return [409, { error: 'Only pending or accepted bookings can be changed' }];
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const current = Number(appt.bokng_cnt) || 1;
  const people = body?.people == null ? current : Number(body.people);
  const mobile = typeof body?.mobile === 'string' ? body.mobile.trim() : appt.mobile_number;
  if (!Number.isInteger(people) || people < 1 || people > 5) return [400, { error: 'people must be a whole number from 1 to 5' }];
  if (!/^\+?\d{10,15}$/.test(String(mobile).replace(/[\s-]/g, ''))) return [400, { error: 'mobile must be a valid phone number' }];
  const parts = [message && 'sent a message', people !== current && `changed the booking to ${people} ${people === 1 ? 'person' : 'people'}`, mobile !== appt.mobile_number && 'updated their mobile number'].filter(Boolean);
  if (!parts.length) return [400, { error: 'Nothing to change' }];
  if (people !== current && appt.order_type === 'HOME_VISIT') return [400, { error: "Home visits don't have a number of people" }];
  if (people !== current && Number(settings.get(appt.loc_id)?.is_dark_store ?? 0) === 1) {
    return [400, { error: "This store takes orders; the number of people can't change" }];
  }
  if (message) appt.bokng_desc = `${appt.bokng_desc}\n=====\n${message}`;
  Object.assign(appt, { bokng_cnt: String(people), mobile_number: mobile, updt_on: now() });
  notify(appt.loc_id, appt.apntmnt_id, 'UPDATED', `${appt.user_name || 'A customer'} ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}`);
  return [200, { appointment: appt }];
});
route('PUT', /^\/appointment\/([^/]+)\/rating$/, 'any', ({ claims, params, body }) => {
  if (isLocToken(claims)) return [403, { error: 'Forbidden: user login required' }];
  const appt = appointments.find((a) => a.apntmnt_id === params[0] && a.user_id === claims.userId);
  if (!appt) return [404, { error: 'Appointment not found' }];
  if (appt.status !== 'ACCEPTED') return [409, { error: 'Only accepted bookings can be rated' }];
  const stars = Number(body?.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return [400, { error: 'stars must be a whole number from 1 to 5' }];
  const review = typeof body?.review === 'string' ? body.review.trim() : '';
  const existing = ratings.find((r) => r.apntmnt_id === appt.apntmnt_id);
  const name = appt.user_name || 'Customer';
  if (existing) Object.assign(existing, { stars, review });
  else ratings.push({ rtng_id: randomUUID(), apntmnt_id: appt.apntmnt_id, loc_id: appt.loc_id, user_id: claims.userId, name, stars, review, cret_on: now() });
  const excerpt = review.length > 80 ? `${review.slice(0, 80).trimEnd()}…` : review;
  notify(appt.loc_id, appt.apntmnt_id, 'RATED', `${name} ${existing ? 'updated their rating to' : 'rated your store'} ${starText(stars)}${excerpt ? `: "${excerpt}"` : ''}`);
  return [200, { rating: { stars, review, createdAt: (existing ?? ratings.at(-1)).cret_on, updatedAt: now() } }];
});
route('GET', /^\/reviews\/([^/]+)$/, 'none', ({ params, query }) => {
  const own = ratings.filter((r) => r.loc_id === params[0]).sort((a, b) => b.cret_on.localeCompare(a.cret_on));
  const limit = Math.min(50, Number(query.get('limit')) || 10);
  const start = Number(query.get('cursor')) || 0; // the stub's cursor is just an offset
  const page = own.slice(start, start + limit).map((r) => ({ id: r.rtng_id, name: r.name, stars: r.stars, review: r.review, createdAt: r.cret_on }));
  const body = { reviews: page, nextCursor: start + limit < own.length ? String(start + limit) : null };
  if (!query.get('cursor')) body.summary = { average: own.length ? Math.round((own.reduce((s, r) => s + r.stars, 0) / own.length) * 10) / 10 : null, count: own.length };
  return [200, body];
});
route('GET', /^\/notifications$/, 'any', ({ claims }) => {
  const mine = notifications.filter((n) => n.rcpt_id === claims.userId).sort((a, b) => b.cret_on.localeCompare(a.cret_on)).slice(0, 50);
  return [200, { notifications: mine.map(({ rcpt_id: _r, ...n }) => ({ ...n, appointment: appointments.find((a) => a.apntmnt_id === n.apntmnt_id) ?? null })) }];
});
route('POST', /^\/notifications\/read$/, 'any', ({ claims, body }) => {
  if (!Array.isArray(body?.ids) || !body.ids.length) return [400, { error: 'ids must be a non-empty array of notification ids' }];
  let updated = 0;
  for (const n of notifications) if (n.rcpt_id === claims.userId && body.ids.includes(n.ntfy_id) && !n.read_on) { n.read_on = now(); updated++; }
  return [200, { updated }];
});
// Account deletion (user or location token; the password must match).
route('DELETE', /^\/account$/, 'any', ({ claims, body }) => {
  if (typeof body?.password !== 'string' || !body.password) return [400, { error: 'password is required' }];
  if (body.password !== PASSWORD) return [403, { error: 'Password is wrong' }];
  const upcoming = (a) => ['PENDING', 'ACCEPTED'].includes(a.status) && new Date(a.start_time) > new Date();
  if (isLocToken(claims)) {
    const loc = locations.find((l) => l.user_id === claims.userId && l.active);
    if (!loc) return [404, { error: 'Account not found' }];
    for (const a of appointments.filter((a) => a.loc_id === loc.user_id && upcoming(a))) {
      Object.assign(a, { status: 'REJECTED', updt_reason: 'Store closed its account' });
      notify(a.user_id, a.apntmnt_id, 'REJECTED', `${loc.loc_name} closed its account, so your booking was cancelled`);
    }
    loc.active = 0;
    return [200, { message: 'Account deleted' }];
  }
  for (const a of appointments.filter((a) => a.user_id === claims.userId)) {
    if (upcoming(a)) Object.assign(a, { status: 'REJECTED', updt_reason: 'Account deleted' });
    Object.assign(a, { user_name: 'Deleted user', mobile_number: '', dlvry_addr: null });
  }
  for (const a of addresses.filter((a) => a.user_id === claims.userId)) a.active = 0;
  const user = users.find((u) => u.user_id === claims.userId);
  if (user) user.active = 0;
  return [200, { message: 'Account deleted' }];
});
// Saved delivery addresses (user token; own rows only).
route('GET', /^\/traveller\/addresses$/, 'any', ({ claims }) => {
  if (isLocToken(claims)) return [403, { error: 'Forbidden: user login required' }];
  return [200, { addresses: addresses.filter((a) => a.user_id === claims.userId && a.active).sort((a, b) => b.cret_on.localeCompare(a.cret_on)).map(addressJson) }];
});
route('POST', /^\/traveller\/addresses$/, 'any', ({ claims, body }) => {
  if (isLocToken(claims)) return [403, { error: 'Forbidden: user login required' }];
  const input = readAddress(body);
  if (input.error) return [400, { error: input.error }];
  const own = addresses.filter((a) => a.user_id === claims.userId && a.active);
  const same = own.find((a) => a.addr_text === input.address);
  if (same) return [200, { address: addressJson(same) }];
  if (own.length >= 20) return [400, { error: 'You can save up to 20 addresses. Delete one to add another.' }];
  const row = { addr_id: randomUUID(), user_id: claims.userId, addr_label: input.label, addr_text: input.address, cret_on: now(), active: 1 };
  addresses.push(row);
  return [201, { address: addressJson(row) }];
});
route('PUT', /^\/traveller\/addresses\/([^/]+)$/, 'any', ({ claims, params, body }) => {
  if (isLocToken(claims)) return [403, { error: 'Forbidden: user login required' }];
  const input = readAddress(body);
  if (input.error) return [400, { error: input.error }];
  const row = addresses.find((a) => a.addr_id === params[0] && a.user_id === claims.userId && a.active);
  if (!row) return [404, { error: 'Address not found' }];
  Object.assign(row, { addr_label: input.label, addr_text: input.address });
  return [200, { address: addressJson(row) }];
});
route('DELETE', /^\/traveller\/addresses\/([^/]+)$/, 'any', ({ claims, params }) => {
  if (isLocToken(claims)) return [403, { error: 'Forbidden: user login required' }];
  const row = addresses.find((a) => a.addr_id === params[0] && a.user_id === claims.userId && a.active);
  if (!row) return [404, { error: 'Address not found' }];
  row.active = 0;
  return [200, { message: 'Address deleted' }];
});
route('GET', /^\/reminder-settings$/, 'any', ({ claims }) => {
  const latest = reminderSettings.filter((r) => r.acct_id === claims.userId).at(-1);
  return [200, { settings: latest ? { enabled: latest.enabled, hoursBefore: latest.hoursBefore, platform: latest.platform, updatedAt: latest.cret_on } : { enabled: false, hoursBefore: 1, platform: null, updatedAt: null } }];
});
route('PUT', /^\/reminder-settings$/, 'any', ({ claims, body }) => {
  if (typeof body?.enabled !== 'boolean') return [400, { error: 'enabled must be true or false' }];
  if (!Number.isInteger(body.hoursBefore) || body.hoursBefore < 1 || body.hoursBefore > 72) return [400, { error: 'hoursBefore must be a whole number from 1 to 72' }];
  const row = { acct_id: claims.userId, enabled: body.enabled, hoursBefore: body.hoursBefore, platform: body.platform ?? null, cret_on: now() };
  reminderSettings.push(row);
  return [200, { settings: { enabled: row.enabled, hoursBefore: row.hoursBefore, platform: row.platform, updatedAt: row.cret_on } }];
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
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' };

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
    const [status, json] = r.handler({ body, claims, params: match.slice(1), query: url.searchParams });
    return send(status, json);
  }
  send(404, { error: 'Not found' });
}).listen(PORT, () => console.log(`Ghoomo stub API on http://localhost:${PORT}/apis`));
