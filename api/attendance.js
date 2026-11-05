/**
 * ADAS Architecture — Team attendance API (Vercel serverless function)
 * ----------------------------------------------------------------------------
 * POST /api/attendance   Authorization: Bearer <Microsoft ID token>
 * Body (JSON): { action: 'status' | 'checkIn' | 'checkOut', lat, lng, accuracy }
 *
 * - The browser signs the person in with their Microsoft 365 office account
 *   (MSAL) and sends the ID token. This function verifies the token's
 *   signature, tenant, audience and expiry, then checks the person is listed
 *   as Active in the Excel "Staff" table.
 * - Check-in / check-out compare the phone's GPS position with the office
 *   location and use this server's clock (Asia/Riyadh), not the phone's.
 * - Records are written to the Excel "Attendance" table through Microsoft
 *   Graph with an app-only credential, so staff never need edit rights on
 *   the workbook.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   MS_TENANT_ID        Directory (tenant) ID
 *   MS_CLIENT_ID        Application (client) ID of the app registration
 *   MS_CLIENT_SECRET    Client secret of the same app registration
 *   ATT_DRIVE           Graph drive that holds the workbook, e.g.
 *                         /users/admin@adas.com.sa/drive     (OneDrive)
 *                         /sites/<site-id>/drive             (SharePoint)
 *   ATT_WORKBOOK_PATH   Path inside that drive, e.g. Attendance/ADAS Attendance.xlsx
 *   OFFICE_LAT          Office latitude  (default 21.723028, ADAS office)
 *   OFFICE_LNG          Office longitude (default 39.134389, ADAS office)
 *   RADIUS_M            Allowed distance in metres (default 150)
 *   ALLOWED_DOMAIN      Email domain allowed to sign in (default adas.com.sa)
 *
 * Full setup steps: docs/attendance-setup.md
 */

const crypto = require('crypto');

const TZ = 'Asia/Riyadh';
const MAX_ACCURACY_M = 150;
const LOG_COLUMNS = 14; // Date … Hours, see docs/attendance-setup.md

const env = (k, d = '') => (process.env[k] || d).trim();

/* ------------------------------------------------------------- helpers */

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function riyadh(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function metres(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad, dLng = (lng2 - lng1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const b64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/* --------------------------------------------- Microsoft ID token check */

let jwksCache = { at: 0, keys: [] };

async function signingKeys(tenant) {
  if (Date.now() - jwksCache.at < 6 * 3600 * 1000 && jwksCache.keys.length) return jwksCache.keys;
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`);
  if (!r.ok) throw new HttpError(503, 'Could not reach Microsoft sign-in. Please try again.');
  jwksCache = { at: Date.now(), keys: (await r.json()).keys || [] };
  return jwksCache.keys;
}

async function verifyIdToken(token) {
  const tenant = env('MS_TENANT_ID'), clientId = env('MS_CLIENT_ID');
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new HttpError(401, 'signed_out');
  const header = JSON.parse(b64url(parts[0]).toString('utf8'));
  const claims = JSON.parse(b64url(parts[1]).toString('utf8'));
  if (header.alg !== 'RS256') throw new HttpError(401, 'signed_out');

  let jwk = (await signingKeys(tenant)).find((k) => k.kid === header.kid);
  if (!jwk) { jwksCache.at = 0; jwk = (await signingKeys(tenant)).find((k) => k.kid === header.kid); }
  if (!jwk) throw new HttpError(401, 'signed_out');

  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`),
    crypto.createPublicKey({ key: jwk, format: 'jwk' }), b64url(parts[2]));
  const now = Math.floor(Date.now() / 1000);
  if (!ok
    || claims.aud !== clientId
    || claims.tid !== tenant
    || claims.iss !== `https://login.microsoftonline.com/${tenant}/v2.0`
    || !(claims.exp > now - 60)
    || (claims.nbf && claims.nbf > now + 60)) {
    throw new HttpError(401, 'signed_out');
  }
  const email = String(claims.preferred_username || claims.email || '').toLowerCase();
  const domain = env('ALLOWED_DOMAIN', 'adas.com.sa').toLowerCase();
  if (!email.endsWith('@' + domain)) throw new HttpError(403, `Please sign in with your @${domain} office account.`);
  return { email, name: claims.name || email.split('@')[0] };
}

/* ------------------------------------------------- Microsoft Graph/Excel */

let appToken = { value: '', exp: 0 };

async function graphToken() {
  if (appToken.value && Date.now() < appToken.exp - 60000) return appToken.value;
  const r = await fetch(`https://login.microsoftonline.com/${env('MS_TENANT_ID')}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('MS_CLIENT_ID'), client_secret: env('MS_CLIENT_SECRET'),
      scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new HttpError(500, 'Attendance storage is not set up correctly (app credentials).');
  appToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return appToken.value;
}

async function graph(method, path, body, missing) {
  const base = `https://graph.microsoft.com/v1.0${env('ATT_DRIVE')}/root:/${encodeURI(env('ATT_WORKBOOK_PATH'))}:/workbook`;
  const r = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${await graphToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    if (missing && r.status === 404) throw new HttpError(503, missing);
    const detail = await r.text().catch(() => '');
    console.error('Graph', method, path, r.status, detail.slice(0, 500));
    let reason = '';
    try { const e = JSON.parse(detail).error || {}; reason = [e.code, e.message].filter(Boolean).join(': ').slice(0, 160); } catch (_) { /* not JSON */ }
    if (r.status === 423 || /lock|EditModeCannotAcquireLock/i.test(detail)) {
      throw new HttpError(503, 'The workbook is busy (it may be open in desktop Excel). Close it or use Excel Online, then try again.');
    }
    throw new HttpError(502, 'Could not save to the attendance workbook. Please try again.' + (reason ? ` (${reason})` : ''));
  }
  return r.status === 204 ? null : r.json();
}

/* Excel may store typed dates/times as serial numbers; read both forms. */
function cellDay(v) {
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  return String(v || '').trim();
}
function cellTime(v) {
  if (typeof v === 'number') {
    const mins = Math.round((v % 1) * 1440);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  return String(v || '').trim();
}

const tableRows = async (table, missing) => ((await graph('GET', `/tables/${table}/rows`, null, missing)).value || []).map((r) => r.values[0]);

/* Staff columns, matched by header name (any order):
 *   Email | Name | Active | Role (optional: Manager / HR / Admin) | Annual Days (optional)
 *   | Manager (optional: the email of the person who approves this employee's leave) */
const STAFF_FIELDS = {
  email: ['email', 'emailaddress', 'officeemail'], name: ['name', 'fullname', 'employee'], active: ['active', 'enabled'],
  role: ['role', 'access', 'type'], annualDays: ['annualdays', 'leavedays', 'annualleave', 'allowance'],
  managerRef: ['manager', 'manageremail', 'linemanager', 'reportsto', 'approver', 'approveremail'],
  joinDate: ['joiningdate', 'joindate', 'dateofjoining', 'joined', 'hiredate', 'startdate', 'employmentdate'],
  opening: ['openingbalance', 'carriedforward', 'broughtforward', 'carryover', 'previousbalance'],
};
const STAFF_DEFAULT_POS = { email: 0, name: 1, active: 2, role: 3, annualDays: 4, managerRef: 5 };

async function staffLayout() {
  try {
    const cols = ((await graph('GET', '/tables/Staff/columns?$select=name')).value || []).map((c) => normHeader(c.name));
    const pos = {};
    for (const [f, names] of Object.entries(STAFF_FIELDS)) { const i = cols.findIndex((h) => names.includes(h)); if (i >= 0) pos[f] = i; }
    return pos.email == null ? STAFF_DEFAULT_POS : pos;
  } catch (e) { return STAFF_DEFAULT_POS; }
}

function staffFrom(row, pos = STAFF_DEFAULT_POS) {
  const v = (f) => (pos[f] == null ? '' : row[pos[f]]);
  const days = Number(v('annualDays'));
  const role = String(v('role') || '').trim();
  return {
    email: String(v('email')).trim().toLowerCase(),
    name: String(v('name') || '').trim(),
    active: !['FALSE', 'NO', '0'].includes(String(v('active')).trim().toUpperCase()),
    role,
    manager: /^(manager|admin|hr)$/i.test(role),
    admin: /^(admin|hr)$/i.test(role),
    managerRef: String(v('managerRef') || '').trim().toLowerCase(),
    override: Number.isFinite(days) && days > 0 ? days : null,
    joinDate: anyDay(v('joinDate')),
    opening: Number(v('opening')) || 0,
  };
}

/** A date cell as YYYY-MM-DD: ISO text, Excel serial, or d/m/yyyy text. Returns '' if not a date. */
function anyDay(v) {
  if (v === '' || v == null) return '';
  const c = cellDay(v);
  if (isoDay(c)) return c;
  const m = String(v).trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) { const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; if (isoDay(iso)) return iso; }
  return '';
}

/** All staff rows (active and inactive), read once per request. */
async function loadStaff() {
  const [pos, rows] = await Promise.all([staffLayout(), tableRows('Staff')]);
  const team = rows.map((row, index) => ({ ...staffFrom(row, pos), index, raw: row })).filter((s) => s.email);
  team.pos = pos; team.width = rows[0] ? rows[0].length : Math.max(...Object.values(pos)) + 1;
  return team;
}

/* Admin: office@adas.com.sa (ADMIN_EMAILS) or Role = Admin / HR. Can sign in without a Staff row. */
const adminEmails = () => env('ADMIN_EMAILS', 'office@adas.com.sa').toLowerCase().split(/[\s,;]+/).filter(Boolean);

/** Who approves this employee's leave:
 *  1. their own Manager, if set;
 *  2. otherwise, for a manager: HR/Admin (never their own reports), or other top-level managers if there's no HR/Admin;
 *  3. otherwise, for staff: everyone with Role = Manager / HR / Admin. */
function approversFor(employee, team) {
  const active = team.filter((s) => s.active && s.email !== employee.email);
  if (employee.managerRef) {
    const own = active.filter((s) => s.email === employee.managerRef || s.name.toLowerCase() === employee.managerRef);
    if (own.length) return own;
  }
  if (employee.manager) {
    const admins = active.filter((s) => s.admin);
    if (admins.length) return admins;
    return active.filter((s) => s.manager && !s.managerRef && !team.some((r) => r.managerRef === employee.email && r.email === s.email));
  }
  return active.filter((s) => s.manager);
}
const canDecide = (viewer, employee, team) => viewer.email !== employee.email
  && (viewer.admin || approversFor(employee, team).some((a) => a.email === viewer.email));

async function todayRecord(email) {
  const { day } = riyadh();
  const rows = await tableRows('Attendance');
  for (let i = rows.length - 1; i >= 0; i--) {
    if (cellDay(rows[i][0]) === day && String(rows[i][1]).trim().toLowerCase() === email) {
      const row = rows[i].slice();
      row[0] = cellDay(row[0]); row[3] = cellTime(row[3]); row[8] = row[8] === '' ? '' : cellTime(row[8]);
      return { index: i, row };
    }
  }
  return null;
}

/* Day rules: on time until WORK_START + LATE_GRACE_MIN (09:15), late until CHECKIN_CLOSES (11:00),
 * after that check-in is closed and the day counts as absent. */
const hmOf = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
function dayRules() {
  const start = toMin(env('WORK_START', '09:00'));
  const lateAfter = start + Number(env('LATE_GRACE_MIN', '15'));
  const closes = toMin(env('CHECKIN_CLOSES', '11:00'));
  return { workStart: hmOf(start), lateAfter: hmOf(lateAfter), closes: hmOf(closes), startMin: start, lateAfterMin: lateAfter, closesMin: closes };
}
const summary = (rec, site = null) => {
  const rules = dayRules();
  const sp = site ? siteParts(site.note) : null;
  const siteInfo = site ? { name: sp.name, from: sp.from, to: sp.to, waiveLate: siteWindow(site, '00:00').waiveLate } : null;
  if (!rec) return { checkIn: '', checkOut: '', hours: '', lateMin: 0, rules, site: siteInfo };
  const checkIn = String(rec.row[3] || '');
  const inMin = toMin(checkIn);
  const waive = siteInfo && siteInfo.waiveLate;
  return { checkIn, checkOut: String(rec.row[8] || ''), hours: rec.row[13] === '' ? '' : String(rec.row[13]),
    lateMin: !waive && inMin != null && inMin > rules.lateAfterMin ? inMin - rules.startMin : 0, rules, site: siteInfo };
};

/** Site visits are stored with their hours in the note: "[11:00–14:00] Al Rawdah villa". */
function siteParts(note) {
  const m = String(note || '').match(/^\[(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})\]\s*(.*)$/);
  return m ? { from: m[1], to: m[2], name: m[3] } : { from: '', to: '', name: String(note || '') };
}
/** Site rules for a given time: may check in/out away from the office, and are late / cut-off rules waived? */
function siteWindow(site, timeHM) {
  if (!site) return { anywhere: false, waiveLate: false };
  const { from, to } = siteParts(site.note);
  if (!from) return { anywhere: true, waiveLate: true }; // older all-day site visits
  const t = toMin(timeHM), f = toMin(from), e = toMin(to), rules = dayRules();
  return { anywhere: t >= f - 60 && t <= e + 60, waiveLate: f <= rules.closesMin, from, to };
}

/** Today's approved site visit for this person, or null. Never throws (missing Leave table = none). */
async function siteVisitToday(email) {
  try {
    const day = riyadh().day;
    return (await allLeave()).find((l) => l.email === email && l.type === 'site' && /^approved$/i.test(l.status) && l.start <= day && l.end >= day) || null;
  } catch (e) { return null; }
}

/** On a site-visit day: any place is fine, but the position must be precise; distance from the office is recorded. */
function checkPlaceAnywhere(b) {
  const lat = Number(b.lat), lng = Number(b.lng), acc = Number(b.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(400, 'Location is missing. Please allow location access and try again.');
  if (!Number.isFinite(acc) || acc > MAX_ACCURACY_M) {
    throw new HttpError(400, `Your location is not precise enough (±${Math.round(acc || 0)} m). Turn on GPS / precise location and try again.`);
  }
  const { lat: oLat, lng: oLng } = officeLocation();
  return { distance: metres(lat, lng, oLat, oLng), accuracy: Math.round(acc), lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

/* ADAS office, Jeddah: 21°43'22.9"N 39°08'03.8"E. */
const OFFICE_DEFAULT = { lat: 21.723028, lng: 39.134389 };

/** One coordinate from text: "21.723028", "21,723028", "21°43'22.9\"N", "39 08 03.8 E". */
function parseCoord(text) {
  const t = String(text || '').trim().replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (!t) return NaN;
  const nums = t.replace(/(\d),(\d)/g, '$1.$2').match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return NaN;
  let v = Math.abs(Number(nums[0])) + (nums[1] ? Number(nums[1]) / 60 : 0) + (nums[2] ? Number(nums[2]) / 3600 : 0);
  if (/^-|[SsWw]\s*$/.test(t)) v = -v;
  return v;
}

/** Office position from Vercel settings, tolerating common formats; falls back to the ADAS office. */
function officeLocation() {
  let lat = env('OFFICE_LAT'), lng = env('OFFICE_LNG');
  // both values pasted into one field: "21.723028, 39.134389" or "21°43'22.9\"N 39°08'03.8\"E"
  const pair = (s) => s.match(/^(.*?[NnSs]|-?\d+(?:\.\d+)?)\s*[,;\s]\s*(.+)$/);
  if (lat && !lng && pair(lat)) { const m = pair(lat); lat = m[1]; lng = m[2]; }
  if (lng && !lat && pair(lng)) { const m = pair(lng); lat = m[1]; lng = m[2]; }
  const pLat = parseCoord(lat), pLng = parseCoord(lng);
  const valid = Math.abs(pLat) > 0 && Math.abs(pLat) <= 90 && Math.abs(pLng) > 0 && Math.abs(pLng) <= 180;
  if ((lat || lng) && !valid) console.warn('OFFICE_LAT/OFFICE_LNG not understood, using the default office location:', lat, lng);
  return valid ? { lat: pLat, lng: pLng } : OFFICE_DEFAULT;
}

function checkPlace(b) {
  const lat = Number(b.lat), lng = Number(b.lng), acc = Number(b.accuracy);
  const { lat: oLat, lng: oLng } = officeLocation();
  const radius = Number(env('RADIUS_M', '150'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(400, 'Location is missing. Please allow location access and try again.');
  if (!Number.isFinite(acc) || acc > MAX_ACCURACY_M) {
    throw new HttpError(400, `Your location is not precise enough (±${Math.round(acc || 0)} m). Turn on GPS / precise location and try again.`);
  }
  const distance = metres(lat, lng, oLat, oLng);
  if (distance > radius) throw new HttpError(400, `You are about ${distance} m from the office. Check-in works within ${radius} m.`);
  return { distance, accuracy: Math.round(acc), lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}


/* ----------------------------------------------------------- annual leave */
/* Leave table columns (matched by header name, any order; extra columns are kept):
 * ID | Requested | Email | Name | Start | End | Days | Note | Status | Decided By | Decided At */
const LEAVE_FIELDS = {
  id: ['id', 'requestid'], requested: ['requested', 'requestedat', 'date', 'created'], email: ['email', 'emailaddress'],
  name: ['name', 'employee', 'staff'], start: ['start', 'startdate', 'from'], end: ['end', 'enddate', 'to'],
  days: ['days', 'workingdays', 'noofdays'], note: ['note', 'notes', 'reason', 'comment'], status: ['status'],
  decidedBy: ['decidedby', 'approvedby', 'manager'], decidedAt: ['decidedat', 'decisiondate', 'approvedat'],
  type: ['type', 'leavetype', 'category', 'kind'],
};
const LEAVE_REQUIRED = ['id', 'email', 'start', 'end', 'days', 'status'];
const LEAVE_LABEL = { id: 'ID', requested: 'Requested', email: 'Email', name: 'Name', start: 'Start', end: 'End', days: 'Days',
  note: 'Note', status: 'Status', decidedBy: 'Decided By', decidedAt: 'Decided At' };
const normHeader = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Reads the Leave table's header row and maps each field to its column position. */
async function leaveLayout() {
  const cols = ((await graph('GET', '/tables/Leave/columns?$select=name', null, LEAVE_MISSING)).value || []).map((c) => c.name);
  const norm = cols.map(normHeader);
  const pos = {};
  for (const [field, names] of Object.entries(LEAVE_FIELDS)) {
    const i = norm.findIndex((h) => names.includes(h));
    if (i >= 0) pos[field] = i;
  }
  const missing = LEAVE_REQUIRED.filter((f) => pos[f] == null);
  if (missing.length) {
    throw new HttpError(503, `The Leave table is missing column${missing.length > 1 ? 's' : ''}: ${missing.map((f) => LEAVE_LABEL[f]).join(', ')}. `
      + `Its headers are: ${cols.join(', ') || '(none)'}. Please ask the admin to add ${missing.length > 1 ? 'them' : 'it'}.`);
  }
  return { width: cols.length, pos };
}
const LEAVE_MISSING = 'Annual leave is not set up yet. Please ask the admin to add the "Leave" table to the workbook.';
const isoDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

/** Working days (Sun–Thu, not a public holiday) from start to end inclusive. */
function workingDays(start, end, holidays = new Set()) {
  let n = 0;
  for (let d = new Date(start + 'T00:00:00Z'); d <= new Date(end + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    const w = d.getUTCDay();
    if (w !== 5 && w !== 6 && !holidays.has(d.toISOString().slice(0, 10))) n++;
  }
  return n;
}

/* Holidays table (optional): Start | End (optional, for multi-day) | Name. Missing table = no holidays. */
async function holidayList() {
  let rows;
  try { rows = await tableRows('Holidays', 'no-holidays'); }
  catch (e) { if (e.status !== 503) console.warn('Holidays table unreadable, counting without holidays:', e.message); return []; }
  const out = [];
  for (const row of rows) {
    const start = cellDay(row[0]), end = cellDay(row[1]) || start, name = String(row[2] || '').trim();
    if (!isoDay(start) || !isoDay(end) || end < start) continue;
    for (let d = new Date(start + 'T00:00:00Z'); d <= new Date(end + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
      out.push({ date: d.toISOString().slice(0, 10), name });
    }
  }
  return out;
}

/* Leave types (Saudi Labour Law defaults). Limits are working days.
 *   perYear: max per calendar year · perRequest: max per request · once: only once while employed
 *   minServiceYears: needs this much service · backdateDays: may start this many days in the past */
const LEAVE_TYPES = {
  annual:      { label: 'Annual' },
  sick:        { label: 'Sick', perYear: 120, backdateDays: 30, attachment: true,
                 hint: 'First 30 days a year on full pay, the next 60 at 75%, the last 30 unpaid. Attach your medical report (PDF) below.' },
  marriage:    { label: 'Marriage', perRequest: 5, hint: '5 days on full pay.' },
  bereavement: { label: 'Funeral', perRequest: 5, backdateDays: 7, hint: '5 days on the death of a spouse, parent or child.' },
  paternity:   { label: 'New baby', perRequest: 3, backdateDays: 7, hint: '3 days for the birth of your child.' },
  hajj:        { label: 'Hajj', perRequest: 15, once: true, minServiceYears: 2, hint: 'Up to 15 days, once, after 2 years of service.' },
  unpaid:      { label: 'Unpaid', hint: 'Not paid; your manager decides.' },
  site:        { label: 'Site visit', work: true, needsNote: true,
                 hint: 'Work outside the office today (client site, meeting). Choose the hours; once approved you can check in or out from the site during them.' },
  adjust:      { label: 'Balance adjustment', hidden: true }, // admin +/- annual days; never treated as leave
};
function leaveTypeKey(v) {
  const t = normHeader(v);
  if (!t || t.startsWith('annual') || t === 'vacation') return 'annual';
  if (t.startsWith('sick') || t === 'medical') return 'sick';
  if (t.startsWith('marri') || t === 'wedding') return 'marriage';
  if (t.startsWith('bereav') || t.startsWith('funeral') || t === 'death' || t === 'condolence') return 'bereavement';
  if (t.startsWith('paternity') || t.includes('baby') || t.includes('birth')) return 'paternity';
  if (t.startsWith('hajj')) return 'hajj';
  if (t.startsWith('unpaid')) return 'unpaid';
  if (t.startsWith('adjust') || t.startsWith('balanceadjust') || t === 'credit' || t === 'correction') return 'adjust';
  if (t.startsWith('site') || t.startsWith('field') || t.startsWith('outside') || t === 'external') return 'site';
  return LEAVE_TYPES[t] ? t : 'annual';
}

function leaveFrom(row, index, layout) {
  const v = (f) => (layout.pos[f] == null ? '' : row[layout.pos[f]]);
  return {
    index, raw: row, id: String(v('id')), requested: String(v('requested') || ''), email: String(v('email')).trim().toLowerCase(),
    name: String(v('name') || ''), start: cellDay(v('start')), end: cellDay(v('end')), days: Number(v('days')) || 0,
    note: String(v('note') || ''), status: String(v('status') || 'Pending').trim() || 'Pending',
    decidedBy: String(v('decidedBy') || ''), decidedAt: String(v('decidedAt') || ''),
    type: leaveTypeKey(v('type')),
  };
}
/** Full-width row for the table; keeps any extra columns the admin added. */
function leaveRow(l, layout) {
  const row = Array.from({ length: layout.width }, (_, i) => (l.raw && l.raw[i] != null ? l.raw[i] : ''));
  for (const f of Object.keys(LEAVE_FIELDS)) {
    if (layout.pos[f] == null) continue;
    row[layout.pos[f]] = f === 'type' ? (LEAVE_TYPES[l.type] || LEAVE_TYPES.annual).label : (l[f] == null ? '' : l[f]);
  }
  return row;
}
const publicLeave = ({ index, raw, ...l }) => {
  if (l.type !== 'site') return l;
  const sp = siteParts(l.note);
  return { ...l, note: sp.from ? `${sp.name} · ${sp.from}–${sp.to}` : sp.name, siteFrom: sp.from, siteTo: sp.to };
};

async function allLeave() {
  const layout = await leaveLayout();
  const all = (await tableRows('Leave', LEAVE_MISSING)).map((row, i) => leaveFrom(row, i, layout))
    .filter((l) => l.id || l.email); // skip blank rows inside the table
  // admin balance adjustments only change balances — they are never "leave" on a date
  const rows = all.filter((l) => l.type !== 'adjust');
  rows.adjustments = all.filter((l) => l.type === 'adjust' && /^approved$/i.test(l.status));
  rows.layout = layout;
  return rows;
}

/* ---- entitlement ----
 * Per year: base days (ANNUAL_LEAVE_DAYS, default 22), or LEAVE_DAYS_AFTER_5Y (default 30) once the
 * person has 5 years' service; the year they cross 5 years is split by date. The joining year is
 * pro-rated from the joining date and EARNED as the year goes on (accrued daily up to the given
 * date, rounded down to half days). A Staff "Annual Days" value replaces the rate for that person.
 * Carry-over: whatever is left at the end of a year is added to the next one, starting from
 * LEAVE_START_YEAR (default 2026), whose opening carry is the Staff "Opening Balance".
 * LEAVE_CARRY_MAX (optional) caps the days carried each year. */
const half = (n) => Math.round(n * 2) / 2;
const leaveStartYear = () => Number(env('LEAVE_START_YEAR', '2026'));

function serviceYears(joinDate, onDay) {
  if (!joinDate) return null;
  const [jy, jm, jd] = joinDate.split('-').map(Number);
  const [y, m, d] = onDay.split('-').map(Number);
  return y - jy - ((m < jm || (m === jm && d < jd)) ? 1 : 0);
}

/** Days for `year`. In the joining year, only what has been earned by `asOf` counts (if given). */
function entitlementFor(staff, year, asOf) {
  const base = Number(env('ANNUAL_LEAVE_DAYS', '22')), senior = Number(env('LEAVE_DAYS_AFTER_5Y', '30'));
  const first = `${year}-01-01`;
  const joinYear = staff.joinDate && staff.joinDate.slice(0, 4) === String(year);
  const last = joinYear && asOf && asOf < `${year}-12-31` ? asOf : `${year}-12-31`;
  if (staff.joinDate && staff.joinDate > last) return 0;
  const from = staff.joinDate && staff.joinDate > first ? staff.joinDate : first;
  const daysInYear = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 864e5;
  let total = 0;
  for (let d = new Date(from + 'T00:00:00Z'); d <= new Date(last + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const rate = staff.override != null ? staff.override
      : (staff.joinDate && serviceYears(staff.joinDate, day) >= 5 ? senior : base);
    total += rate / daysInYear;
  }
  return joinYear && last !== `${year}-12-31` ? Math.floor(total * 2) / 2 : half(total);
}

/** Balance for `year`. `asOf` = the date earned days are counted up to (joining year only):
 * today for display, or the leave start date when checking a request. */
function balanceFor(staff, leave, year, asOf = riyadh().day) {
  const mine = leave.filter((l) => l.email === staff.email && l.type === 'annual');
  const sum = (y, re) => mine.filter((l) => l.start.slice(0, 4) === String(y) && re.test(l.status)).reduce((a, l) => a + l.days, 0);
  const adj = (y) => (leave.adjustments || []).filter((l) => l.email === staff.email && l.start.slice(0, 4) === String(y)).reduce((a, l) => a + (Number(l.days) || 0), 0);
  const startYear = leaveStartYear(), cap = env('LEAVE_CARRY_MAX') === '' ? Infinity : Number(env('LEAVE_CARRY_MAX'));
  let carried = 0;
  if (year >= startYear) {
    carried = staff.opening || 0;
    for (let y = startYear; y < year; y++) {
      const left = entitlementFor(staff, y) + adj(y) + carried - sum(y, /^approved$/i);
      carried = Math.max(0, Math.min(cap, left));
    }
  }
  const entitlement = entitlementFor(staff, year, asOf);
  const fullYear = entitlementFor(staff, year);
  const used = sum(year, /^approved$/i), pending = sum(year, /^pending$/i);
  const adjusted = adj(year);
  const allowance = half(entitlement + carried + adjusted);
  return { year, entitlement, fullYear, earning: entitlement < fullYear, carried: half(carried), adjusted, allowance, used, pending,
    remaining: half(allowance - used - pending),
    joinDate: staff.joinDate || '', serviceYears: staff.joinDate ? Math.max(0, serviceYears(staff.joinDate, riyadh().day)) : null };
}


/* ------------------------------------------------------- push notifications */
/* Web Push (RFC 8291 encryption + RFC 8292 VAPID) with Node's crypto — no extra packages.
 * Vercel env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (base64url), VAPID_SUBJECT (mailto:…).
 * Devices are stored in the Excel table "Devices": Email | Endpoint | P256dh | Auth | Added | Device */
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const DEVICE_FIELDS = { email: ['email'], endpoint: ['endpoint', 'subscription'], p256dh: ['p256dh', 'key', 'publickey'],
  auth: ['auth', 'authsecret'], added: ['added', 'date', 'created'], device: ['device', 'useragent', 'phone'] };
const DEVICES_MISSING = 'Notifications are not set up yet. Please ask the admin to add the "Devices" table to the workbook.';

function vapidKeys() {
  const pub = env('VAPID_PUBLIC_KEY'), priv = env('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return null;
  const P = fromB64u(pub);
  if (P.length !== 65 || P[0] !== 4) return null;
  const key = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(P.slice(1, 33)), y: b64u(P.slice(33)), d: priv }, format: 'jwk' });
  return { publicKey: pub, key };
}

function vapidHeader(endpoint, keys) {
  const aud = new URL(endpoint).origin;
  const enc = (o) => b64u(Buffer.from(JSON.stringify(o)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env('VAPID_SUBJECT', 'mailto:office@adas.com.sa') })}`;
  const sig = crypto.sign('sha256', Buffer.from(unsigned), { key: keys.key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${unsigned}.${b64u(sig)}, k=${keys.publicKey}`;
}

/** aes128gcm-encrypt `payload` for a browser subscription (RFC 8291). */
function encryptPush(payload, p256dh, authSecret) {
  const uaPublic = fromB64u(p256dh), auth = fromB64u(authSecret);
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, auth, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]), 32));
  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21); salt.copy(header, 0); header.writeUInt32BE(4096, 16); header[20] = asPublic.length;
  return Buffer.concat([header, asPublic, body]);
}

async function deviceLayout() {
  const cols = ((await graph('GET', '/tables/Devices/columns?$select=name', null, DEVICES_MISSING)).value || []).map((c) => c.name);
  const norm = cols.map(normHeader), pos = {};
  for (const [f, names] of Object.entries(DEVICE_FIELDS)) { const i = norm.findIndex((h) => names.includes(h)); if (i >= 0) pos[f] = i; }
  const missing = ['email', 'endpoint', 'p256dh', 'auth'].filter((f) => pos[f] == null);
  if (missing.length) throw new HttpError(503, `The Devices table is missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);
  return { width: cols.length, pos };
}
async function allDevices() {
  const layout = await deviceLayout();
  const rows = (await tableRows('Devices', DEVICES_MISSING)).map((row, index) => {
    const v = (f) => (layout.pos[f] == null ? '' : String(row[layout.pos[f]] || '').trim());
    return { index, email: v('email').toLowerCase(), endpoint: v('endpoint'), p256dh: v('p256dh'), auth: v('auth'), device: v('device') };
  }).filter((d) => d.endpoint);
  rows.layout = layout;
  return rows;
}
const deviceRow = (d, layout) => { const row = Array(layout.width).fill(''); for (const f of Object.keys(DEVICE_FIELDS)) if (layout.pos[f] != null) row[layout.pos[f]] = d[f] || ''; return row; };

/** Send a notification to every device of these people. Never throws; removes dead subscriptions. */
async function pushTo(emails, msg) {
  const keys = vapidKeys();
  if (!keys || !emails.length) return 0;
  let devices;
  try { devices = await allDevices(); } catch (e) { return 0; }
  const want = new Set(emails.map((e) => String(e).toLowerCase()));
  const payload = JSON.stringify({ title: msg.title || 'ADAS', body: msg.body || '', url: msg.url || '/#/team', tag: msg.tag || undefined });
  const dead = [];
  let sent = 0;
  await Promise.all(devices.filter((d) => want.has(d.email)).map(async (d) => {
    try {
      const r = await fetch(d.endpoint, { method: 'POST', body: encryptPush(payload, d.p256dh, d.auth),
        headers: { Authorization: vapidHeader(d.endpoint, keys), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high' } });
      if (r.status === 404 || r.status === 410) dead.push(d.index);
      else if (r.ok) sent++;
      else console.warn('push failed', r.status, (await r.text().catch(() => '')).slice(0, 200));
    } catch (e) { console.warn('push error', e.message); }
  }));
  for (const i of dead.sort((a, b) => b - a)) {
    await graph('DELETE', `/tables/Devices/rows/itemAt(index=${i})`).catch(() => {});
  }
  return sent;
}

/** Best-effort phone notification + email via Microsoft Graph (needs MAIL_FROM + Mail.Send). Never blocks the request. */
async function notify(to, subject, text, attachments = []) {
  await pushTo(to, { title: subject, body: String(text || '').split('\n')[0].slice(0, 180) });
  const from = env('MAIL_FROM');
  if (!from || !to.length) return false;
  try {
    const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await graphToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { subject, body: { contentType: 'Text', content: text },
        toRecipients: to.map((address) => ({ emailAddress: { address } })),
        attachments: attachments.map((a) => ({ '@odata.type': '#microsoft.graph.fileAttachment', name: a.name, contentType: 'application/pdf', contentBytes: a.data })) },
        saveToSentItems: false }),
    });
    if (!r.ok) { console.warn('leave email not sent:', r.status, (await r.text().catch(() => '')).slice(0, 300)); return false; }
    return true;
  } catch (e) { console.warn('leave email not sent:', e.message); return false; }
}

/* Medical report: PDF only, up to 3 MB (Vercel request limit ~4.5 MB after base64). */
const MAX_PDF_BYTES = 3 * 1024 * 1024;
function checkPdf(att) {
  if (!att) return null;
  const data = String(att.data || '').replace(/^data:[^,]*,/, '');
  let buf;
  try { buf = Buffer.from(data, 'base64'); } catch (e) { buf = null; }
  if (!buf || !buf.length) throw new HttpError(400, 'The attachment could not be read. Please choose the PDF again.');
  if (buf.length > MAX_PDF_BYTES) throw new HttpError(400, 'The PDF is larger than 3 MB. Please send a smaller file.');
  if (buf.slice(0, 5).toString('latin1') !== '%PDF-') throw new HttpError(400, 'Only PDF files can be attached.');
  const base = String(att.name || 'medical-report').replace(/\.pdf$/i, '').replace(/[^\w\-. \u0600-\u06FF]/g, '').trim().slice(0, 60) || 'medical-report';
  return { name: base + '.pdf', data: buf.toString('base64'), size: buf.length };
}

async function handleLeave(b, staff, name, team) {
  const year = Number(riyadh().day.slice(0, 4));
  const [leave, holidays] = await Promise.all([allLeave(), holidayList()]);
  const holidaySet = new Set(holidays.map((h) => h.date));
  const view = async () => {
    const mine = leave.filter((l) => l.email === staff.email).sort((x, y) => y.start.localeCompare(x.start)).map(publicLeave);
    const reports = team.filter((s) => s.active && canDecide(staff, s, team));
    const isApprover = staff.admin || reports.length > 0;
    const out = { ok: true, manager: isApprover, balance: balanceFor(staff, leave, year), requests: mine,
      holidays: holidays.filter((h) => h.date >= riyadh().day).slice(0, 60) };
    out.approvers = approversFor(staff, team).map((a) => a.name || a.email);
    out.typeColumn = leave.layout.pos.type != null;
    out.types = Object.entries(LEAVE_TYPES).filter(([, t]) => !t.hidden).map(([key, t]) => {
      const taken = leave.filter((l) => l.email === staff.email && l.type === key && /^(approved|pending)$/i.test(l.status));
      return { key, label: t.label, hint: t.hint || '', perYear: t.perYear || null, perRequest: t.perRequest || null, once: !!t.once,
        usedThisYear: taken.filter((l) => l.start.slice(0, 4) === String(year)).reduce((a, l) => a + l.days, 0),
        usedEver: taken.reduce((a, l) => a + l.days, 0) };
    });
    if (isApprover) {
      const byEmail = Object.fromEntries(team.map((s) => [s.email, s]));
      const mineToDecide = (l) => byEmail[l.email] && canDecide(staff, byEmail[l.email], team);
      const today = riyadh().day;
      out.pending = leave.filter((l) => /^pending$/i.test(l.status) && mineToDecide(l)).sort((x, y) => x.start.localeCompare(y.start))
        .map((l) => ({ ...publicLeave(l), remaining: balanceFor(byEmail[l.email], leave, Number(l.start.slice(0, 4))).remaining + l.days }));
      out.upcoming = leave.filter((l) => /^approved$/i.test(l.status) && l.end >= today && mineToDecide(l))
        .sort((x, y) => x.start.localeCompare(y.start)).map(publicLeave);
      out.team = reports.map((s) => ({ name: s.name, email: s.email, ...balanceFor(s, leave, year) }));
    }
    return out;
  };

  if (b.action === 'leaveStatus') return view();

  if (b.action === 'leaveRequest' && b.type === 'site') {
    const from = String(b.from || ''), to = String(b.to || ''), place = String(b.note || '').trim().slice(0, 240);
    if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) throw new HttpError(400, 'Please choose the start and end time of the site visit.');
    if (toMin(to) <= toMin(from)) throw new HttpError(400, 'The end time must be after the start time.');
    if (!place) throw new HttpError(400, 'Please write the site or client name.');
    if (toMin(to) < toMin(riyadh().time)) throw new HttpError(400, 'That time has already passed.');
    const day = riyadh().day;
    b = { ...b, start: day, end: day, note: `[${from}–${to}] ${place}` };
  }

  if (b.action === 'leaveRequest') {
    const start = String(b.start || ''), end = String(b.end || ''), note = String(b.note || '').slice(0, 300);
    const type = LEAVE_TYPES[b.type] ? b.type : 'annual', rule = LEAVE_TYPES[type];
    if (type !== 'annual' && leave.layout.pos.type == null) {
      throw new HttpError(503, 'Other leave types need a "Type" column in the Leave table. Please ask the admin to add it.');
    }
    if (!isoDay(start) || !isoDay(end)) throw new HttpError(400, 'Please choose a start and end date.');
    if (end < start) throw new HttpError(400, 'The end date is before the start date.');
    if (rule.needsNote && !note.trim()) throw new HttpError(400, 'Please write the site or client name.');
    const earliest = new Date(riyadh().day + 'T00:00:00Z'); earliest.setUTCDate(earliest.getUTCDate() - (rule.backdateDays || 0));
    if (start < earliest.toISOString().slice(0, 10)) {
      throw new HttpError(400, rule.backdateDays ? `${rule.label} leave can start at most ${rule.backdateDays} days ago.` : 'Leave can only be requested from today onwards.');
    }
    if (start.slice(0, 4) !== end.slice(0, 4)) throw new HttpError(400, 'Please split leave that crosses the new year into two requests.');
    const days = workingDays(start, end, holidaySet);
    if (days === 0) throw new HttpError(400, 'Those dates are only weekends or public holidays — no working days to request.');
    const clash = leave.find((l) => l.email === staff.email && /^(pending|approved)$/i.test(l.status) && l.start <= end && start <= l.end);
    if (clash) throw new HttpError(409, `You already have a ${clash.status.toLowerCase()} request for ${clash.start} — ${clash.end}.`);
    if (type === 'annual') {
      const bal = balanceFor(staff, leave, Number(start.slice(0, 4)), start);
      if (days > bal.remaining) {
        throw new HttpError(400, `That is ${days} working days, but you will have ${bal.remaining} available by ${start}`
          + (bal.earning ? ' (new joiners earn their days month by month).' : '.'));
      }
    } else {
      const taken = leave.filter((l) => l.email === staff.email && l.type === type && /^(approved|pending)$/i.test(l.status));
      if (rule.perRequest && days > rule.perRequest) throw new HttpError(400, `${rule.label} leave is up to ${rule.perRequest} working days per request.`);
      if (rule.once && taken.length) throw new HttpError(409, `${rule.label} leave can only be taken once.`);
      if (rule.minServiceYears) {
        const svc = staff.joinDate ? serviceYears(staff.joinDate, start) : null;
        if (svc != null && svc < rule.minServiceYears) throw new HttpError(400, `${rule.label} leave is available after ${rule.minServiceYears} years of service.`);
      }
      if (rule.perYear) {
        const used = taken.filter((l) => l.start.slice(0, 4) === start.slice(0, 4)).reduce((a, l) => a + l.days, 0);
        if (used + days > rule.perYear) throw new HttpError(400, `${rule.label} leave is up to ${rule.perYear} days a year; you have ${rule.perYear - used} left.`);
      }
    }
    const pdf = b.attachment ? (rule.attachment ? checkPdf(b.attachment) : null) : null;
    if (b.attachment && !rule.attachment) throw new HttpError(400, `Attachments are only for ${LEAVE_TYPES.sick.label.toLowerCase()} leave.`);
    const managers = approversFor(staff, team).map((s) => s.email);
    if (pdf && (!env('MAIL_FROM') || !managers.length)) {
      throw new HttpError(503, 'The medical report can\'t be emailed right now (email isn\'t set up for your manager). Send the request without it and give the PDF to HR.');
    }
    const { day, time } = riyadh();
    const l = { id: 'L' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(), requested: `${day} ${time}`, email: staff.email, name,
      start, end, days, note: pdf ? `${note ? note + ' · ' : ''}PDF: ${pdf.name}` : note, status: 'Pending', decidedBy: '', decidedAt: '', type };
    await graph('POST', '/tables/Leave/rows', { values: [leaveRow(l, leave.layout)] }, LEAVE_MISSING);
    leave.push({ ...l, index: leave.length });
    const sent = await notify(managers, `${rule.label} leave request: ${name}, ${days} day${days === 1 ? '' : 's'}`,
      `${name} requested ${rule.label.toLowerCase()} leave from ${start} to ${end} (${days} working day${days === 1 ? '' : 's'}).\n`
      + `${note ? 'Note: ' + note + '\n' : ''}${pdf ? `The medical report is attached (${pdf.name}).\n` : ''}\nReview it at https://adas.com.sa/#/team`,
      pdf ? [pdf] : []);
    const out = await view();
    if (pdf) out.attachment = sent ? 'sent' : 'failed';
    return out;
  }

  const find = () => {
    const l = leave.find((x) => x.id === String(b.id || ''));
    if (!l) throw new HttpError(404, 'That request was not found. Please refresh.');
    return l;
  };
  const save = async (l) => graph('PATCH', `/tables/Leave/rows/itemAt(index=${l.index})`, { values: [leaveRow(l, leave.layout)] }, LEAVE_MISSING);

  const employeeOf = (l) => team.find((s) => s.email === l.email) || { email: l.email, name: l.name, managerRef: '' };

  if (b.action === 'leaveCancel') {
    const l = find();
    const { day, time } = riyadh();
    if (l.email === staff.email) {
      if (!/^pending$/i.test(l.status)) throw new HttpError(409, 'Only pending requests can be cancelled. Ask your manager to cancel an approved one.');
      Object.assign(l, { status: 'Cancelled', decidedBy: name, decidedAt: `${day} ${time}` });
      await save(l);
      return view();
    }
    // a manager cancelling approved leave that hasn't finished yet
    if (!canDecide(staff, employeeOf(l), team)) throw new HttpError(403, 'You can only cancel leave for your own team.');
    if (!/^approved$/i.test(l.status)) throw new HttpError(409, `This request is ${l.status.toLowerCase()}; use Approve or Decline instead.`);
    if (l.end < day) throw new HttpError(409, 'This leave has already finished.');
    Object.assign(l, { status: 'Cancelled', decidedBy: name, decidedAt: `${day} ${time}` });
    await save(l);
    await notify([l.email], 'Your approved leave was cancelled',
      `Your annual leave ${l.start} to ${l.end} (${l.days} working day${l.days === 1 ? '' : 's'}) was cancelled by ${name}. The days are back in your balance.\n\nhttps://adas.com.sa/#/team`);
    return view();
  }

  if (b.action === 'leaveDecide') {
    const l = find();
    if (l.email === staff.email) throw new HttpError(403, 'Another manager needs to decide on your own request.');
    if (!canDecide(staff, employeeOf(l), team)) throw new HttpError(403, 'Only this person\'s manager can approve their leave.');
    if (!/^pending$/i.test(l.status)) throw new HttpError(409, `This request is already ${l.status.toLowerCase()}.`);
    const approve = b.decision === 'approve';
    const { day, time } = riyadh();
    Object.assign(l, { status: approve ? 'Approved' : 'Rejected', decidedBy: name, decidedAt: `${day} ${time}` });
    await save(l);
    const label = (LEAVE_TYPES[l.type] || LEAVE_TYPES.annual).label;
    await notify([l.email], `Your ${label.toLowerCase()} leave request was ${approve ? 'approved' : 'not approved'}`,
      `Your ${label.toLowerCase()} leave ${l.start} to ${l.end} (${l.days} working day${l.days === 1 ? '' : 's'}) was ${approve ? 'approved' : 'not approved'} by ${name}.\n\nSee your balance at https://adas.com.sa/#/team`);
    return view();
  }

  throw new HttpError(400, 'Unknown action.');
}



/* ------------------------------------------------- short leave (permission) */
/* Excel table "Permissions" (columns matched by header):
 *   Date | Email | Name | Out | In | Minutes | Reason | Status
 * Limits: PERMISSION_DAY_MIN (default 90) per day, PERMISSION_WEEK_MIN (default 360) per Sun–Thu week. */
const PERM_FIELDS = {
  date: ['date', 'day'], email: ['email'], name: ['name', 'employee'], out: ['out', 'outtime', 'left', 'stepout'],
  in: ['in', 'intime', 'back', 'returned', 'backin'], minutes: ['minutes', 'mins', 'duration'],
  reason: ['reason', 'note', 'notes'], status: ['status', 'flag'],
  planned: ['planned', 'plannedminutes', 'requestedminutes', 'requested'], decidedBy: ['decidedby', 'approvedby', 'manager'],
};
const PERM_MISSING = 'Short leave is not set up yet. Please ask the admin to add the "Permissions" table to the workbook.';
const permLimits = () => ({ day: Number(env('PERMISSION_DAY_MIN', '90')), week: Number(env('PERMISSION_WEEK_MIN', '360')) });

async function permLayout() {
  const cols = ((await graph('GET', '/tables/Permissions/columns?$select=name', null, PERM_MISSING)).value || []).map((c) => c.name);
  const norm = cols.map(normHeader), pos = {};
  for (const [f, names] of Object.entries(PERM_FIELDS)) { const i = norm.findIndex((h) => names.includes(h)); if (i >= 0) pos[f] = i; }
  const missing = ['date', 'email', 'out', 'in', 'minutes'].filter((f) => pos[f] == null);
  if (missing.length) throw new HttpError(503, `The Permissions table is missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Its headers are: ${cols.join(', ') || '(none)'}.`);
  return { width: cols.length, pos };
}
async function allPerms() {
  const layout = await permLayout();
  const rows = (await tableRows('Permissions', PERM_MISSING)).map((row, index) => {
    const v = (f) => (layout.pos[f] == null ? '' : row[layout.pos[f]]);
    return { index, raw: row, date: cellDay(v('date')), email: String(v('email')).trim().toLowerCase(), name: String(v('name') || ''),
      out: v('out') === '' ? '' : cellTime(v('out')), in: v('in') === '' ? '' : cellTime(v('in')),
      minutes: Number(v('minutes')) || 0, reason: String(v('reason') || ''), status: String(v('status') || ''),
      planned: Number(v('planned')) || 0, decidedBy: String(v('decidedBy') || '') };
  }).filter((p) => p.email);
  rows.layout = layout;
  return rows;
}
function permRow(p, layout) {
  const row = Array.from({ length: layout.width }, (_, i) => (p.raw && p.raw[i] != null ? p.raw[i] : ''));
  for (const f of Object.keys(PERM_FIELDS)) if (layout.pos[f] != null) row[layout.pos[f]] = p[f] == null ? '' : p[f];
  return row;
}
/** Sunday that starts the week containing `day`. */
function weekStart(day) {
  const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
function permSummary(perms, email, now = riyadh()) {
  const mine = perms.filter((p) => p.email === email);
  const ws = weekStart(now.day);
  const open = mine.find((p) => p.date === now.day && p.out && !p.in) || null;
  const liveMin = open ? Math.max(0, toMin(now.time) - toMin(open.out)) : 0;
  const dayMin = mine.filter((p) => p.date === now.day && p.in).reduce((a, p) => a + p.minutes, 0) + liveMin;
  const weekMin = mine.filter((p) => p.date >= ws && p.date <= now.day && p.in).reduce((a, p) => a + p.minutes, 0) + liveMin;
  const lim = permLimits();
  let allowed = null;
  if (open) { // what was left when they stepped out
    const dayDone = dayMin - liveMin, weekDone = weekMin - liveMin;
    allowed = Math.max(0, Math.min(lim.day - dayDone, lim.week - weekDone, open.planned || Infinity));
  }
  // today's request that hasn't been used yet (Requested / Approved / Declined)
  const req = [...mine].reverse().find((p) => p.date === now.day && !p.out && /^(requested|approved|declined)$/i.test(p.status)) || null;
  // short leave already taken today (can be split into several trips within the daily limit)
  const takenToday = mine.filter((p) => p.date === now.day && p.out && p.in);
  return { open: open ? { out: open.out, reason: open.reason, allowed, planned: open.planned || null } : null, dayMin, weekMin, limits: lim,
    leftMin: Math.max(0, Math.min(lim.day - dayMin, lim.week - weekMin)),
    usedToday: takenToday.map((p) => ({ out: p.out, in: p.in, minutes: p.minutes })),
    request: req ? { id: req.index, status: req.status.charAt(0).toUpperCase() + req.status.slice(1).toLowerCase(),
      planned: req.planned, reason: req.reason, decidedBy: req.decidedBy } : null };
}
async function closeOpenPerm(perms, email, time) {
  const now = riyadh();
  const open = perms.find((p) => p.email === email && p.date === now.day && p.out && !p.in);
  if (!open) return null;
  const before = permSummary(perms.filter((p) => p !== open), email, { day: now.day, time: open.out });
  open.in = time; open.minutes = Math.max(0, toMin(time) - toMin(open.out));
  open.status = open.minutes > before.leftMin ? `Over limit by ${open.minutes - before.leftMin} min`
    : open.planned && open.minutes > open.planned ? `Over approved time by ${open.minutes - open.planned} min` : 'Returned';
  await graph('PATCH', `/tables/Permissions/rows/itemAt(index=${open.index})`, { values: [permRow(open, perms.layout)] }, PERM_MISSING);
  return open;
}

/* ---------------------------------------------------------- monthly report */
/* Office day starts WORK_START (default 09:00); a check-in after WORK_START + LATE_GRACE_MIN
 * (default 15) is "late". Absent = a working day (Sun–Thu, not a holiday, on/after joining, up to
 * today) with no check-in and no approved leave. */
const toMin = (hm) => { const [h, m] = String(hm || '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };

/** Period from the request: { period: 'day'|'week'|'month', date: 'YYYY-MM-DD' } (or legacy { month }). */
function periodRange(b) {
  const today = riyadh().day;
  const kind = ['day', 'week', 'month'].includes(b.period) ? b.period : 'month';
  let date = isoDay(b.date) ? b.date : (/^\d{4}-\d{2}$/.test(String(b.month || '')) ? `${b.month}-01` : today);
  let from, to;
  if (kind === 'day') { from = to = date; }
  else if (kind === 'week') {
    from = weekStart(date);
    const e = new Date(from + 'T00:00:00Z'); e.setUTCDate(e.getUTCDate() + 6); to = e.toISOString().slice(0, 10);
  } else {
    const [y, m] = date.split('-').map(Number);
    from = `${date.slice(0, 7)}-01`; to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  }
  const days = [];
  for (let d = new Date(from + 'T00:00:00Z'); d <= new Date(to + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  return { kind, date, from, to, today, days, until: to < today ? to : today };
}

function reportScope(staff, team) {
  const scope = team.filter((s) => s.active && (staff.admin || canDecide(staff, s, team)));
  if (!staff.admin && !scope.length) throw new HttpError(403, 'Reports are for managers.');
  return scope;
}

async function handleReport(b, staff, team) {
  const scope = reportScope(staff, team);
  const range = periodRange(b);
  const { from, to, today, days } = range;
  const [att, leave, holidays, perms] = await Promise.all([
    tableRows('Attendance'), allLeave().catch(() => []), holidayList(), allPerms().catch(() => []),
  ]);
  const holidayName = Object.fromEntries(holidays.map((h) => [h.date, h.name || 'Public holiday']));
  const rules = dayRules();
  const nowMin = toMin(riyadh().time);
  const isWorkday = (d) => { const w = new Date(d + 'T00:00:00Z').getUTCDay(); return w !== 5 && w !== 6 && !holidayName[d]; };
  // a day is "due" (could be absent) once check-in has closed
  const isOver = (d) => d < today || (d === today && nowMin > rules.closesMin);

  const byPerson = {};
  for (const row of att) {
    const day = cellDay(row[0]); if (day < from || day > to) continue;
    const email = String(row[1]).trim().toLowerCase();
    const loc = (lat, lng, dist) => (Number(lat) && Number(lng) ? { lat: Number(lat), lng: Number(lng), distance: Number(dist) || 0 } : null);
    (byPerson[email] = byPerson[email] || {})[day] = { in: cellTime(row[3]), out: row[8] === '' ? '' : cellTime(row[8]), hours: Number(row[13]) || 0,
      inLoc: loc(row[6], row[7], row[4]), outLoc: row[8] === '' ? null : loc(row[11], row[12], row[9]) };
  }
  const label = (k) => (LEAVE_TYPES[k] || LEAVE_TYPES.annual).label;

  const rows = scope.map((s) => {
    const att1 = byPerson[s.email] || {};
    const myLeave = leave.filter((l) => l.email === s.email && /^approved$/i.test(l.status) && l.start <= to && l.end >= from);
    const myPerms = perms.filter((p) => p.email === s.email && p.date >= from && p.date <= to);
    const leaveOn = (d) => myLeave.find((l) => d >= l.start && d <= l.end);
    const daily = days.map((d) => {
      const a = att1[d], lv = leaveOn(d);
      const out = { date: d };
      if (s.joinDate && d < s.joinDate) return { ...out, status: 'not-joined' };
      const siteLv = lv && lv.type === 'site' ? lv : null;
      if (a && a.in && siteLv) {
        const sp = siteParts(siteLv.note), waive = siteWindow(siteLv, '00:00').waiveLate;
        const late = !waive && toMin(a.in) > rules.lateAfterMin ? toMin(a.in) - rules.startMin : 0;
        return { ...out, status: 'site', note: sp.name, siteFrom: sp.from, siteTo: sp.to, in: a.in, out: a.out, hours: a.hours, lateMin: late,
          shortMin: 0, outNow: '', inLoc: a.inLoc, outLoc: a.outLoc };
      }
      if (a && a.in) {
        const late = toMin(a.in) > rules.lateAfterMin ? toMin(a.in) - rules.startMin : 0;
        const openPerm = d === today && myPerms.find((p) => p.date === d && p.out && !p.in);
        return { ...out, status: late ? 'late' : 'ontime', in: a.in, out: a.out, hours: a.hours, lateMin: late, inLoc: a.inLoc, outLoc: a.outLoc,
          shortMin: myPerms.filter((p) => p.date === d && p.in).reduce((x, p) => x + p.minutes, 0), outNow: openPerm ? openPerm.out : '' };
      }
      if (!isWorkday(d)) return { ...out, status: 'off', note: holidayName[d] || 'Weekend' };
      if (siteLv) {
        const sp = siteParts(siteLv.note), morning = siteWindow(siteLv, '00:00').waiveLate;
        const visitOver = d < today || (d === today && sp.to && nowMin > toMin(sp.to));
        if (!morning && visitOver) return { ...out, status: 'absent', note: `No check-in (site visit ${sp.from}–${sp.to}: ${sp.name})` };
        return { ...out, status: 'site', note: sp.name, siteFrom: sp.from, siteTo: sp.to, noCheckin: d <= today };
      }
      if (lv) return { ...out, status: 'leave', note: label(lv.type) };
      if (d > today) return { ...out, status: 'future' };
      if (!isOver(d)) return { ...out, status: 'waiting' };
      return { ...out, status: 'absent' };
    });
    const worked = daily.filter((x) => x.status === 'ontime' || x.status === 'late' || (x.status === 'site' && x.in));
    const leaveByType = {};
    for (const x of daily) if (x.status === 'leave') leaveByType[x.note] = (leaveByType[x.note] || 0) + 1;
    const siteDays = daily.filter((x) => x.status === 'site' && x.date <= today).length;
    return {
      name: s.name || s.email, email: s.email,
      workingDays: daily.filter((x) => x.date <= range.until && x.status !== 'off' && x.status !== 'not-joined' && x.status !== 'future').length,
      present: worked.length + daily.filter((x) => x.status === 'site' && !x.in && x.date < today).length,
      hours: Math.round(worked.reduce((a, x) => a + x.hours, 0) * 10) / 10,
      late: worked.filter((x) => x.lateMin).length,
      lateDates: worked.filter((x) => x.lateMin).map((x) => `${x.date.slice(8)} (${x.in})`),
      lateMinutes: worked.reduce((a, x) => a + (x.lateMin || 0), 0),
      noCheckout: worked.filter((x) => !x.out && x.date < today).length,
      absent: daily.filter((x) => x.status === 'absent').length,
      shortLeaveHours: Math.round(myPerms.reduce((a, p) => a + p.minutes, 0) / 6) / 10,
      shortLeaveOver: myPerms.filter((p) => /^over/i.test(p.status)).length,
      leave: leaveByType,
      siteDays,
      daily: range.kind === 'month' ? undefined : daily,
    };
  }).sort((a, b2) => a.name.localeCompare(b2.name));

  const totals = rows.reduce((t, r) => {
    const last = r.daily ? r.daily[r.daily.length - 1] : null;
    if (range.kind === 'day' && last) t[last.status] = (t[last.status] || 0) + 1;
    return t;
  }, {});
  return { ok: true, period: range.kind, date: range.date, from, to, until: range.until, month: from.slice(0, 7),
    workStart: rules.workStart, graceMin: Number(env('LATE_GRACE_MIN', '15')), lateAfter: rules.lateAfter, closes: rules.closes,
    leaveTypes: Object.values(LEAVE_TYPES).map((t) => t.label), holidays: days.filter((d) => holidayName[d]).map((d) => ({ date: d, name: holidayName[d] })),
    totals, rows };
}

/** Leave dashboard for a day / week / month: who is on leave, pending requests, balances. */
async function handleLeaveReport(b, staff, team) {
  const scope = reportScope(staff, team);
  const range = periodRange(b);
  const { from, to } = range;
  const [leave, holidays] = await Promise.all([allLeave(), holidayList()]);
  const holidaySet = new Set(holidays.map((h) => h.date));
  const inScope = new Set(scope.map((s) => s.email));
  const label = (k) => (LEAVE_TYPES[k] || LEAVE_TYPES.annual).label;
  const clip = (l) => workingDays(l.start < from ? from : l.start, l.end > to ? to : l.end, holidaySet);
  const entries = leave.filter((l) => inScope.has(l.email) && /^(approved|pending)$/i.test(l.status) && l.start <= to && l.end >= from)
    .sort((x, y) => x.start.localeCompare(y.start))
    .map((l) => ({ id: l.id, name: l.name || l.email, email: l.email, type: label(l.type), start: l.start, end: l.end,
      days: l.days, daysInPeriod: clip(l), status: l.status, note: publicLeave(l).note, work: !!(LEAVE_TYPES[l.type] || {}).work }));
  const year = Number(from.slice(0, 4));
  const people = scope.map((s) => {
    const bal = balanceFor(s, leave, year);
    const mine = entries.filter((e) => e.email === s.email && /^approved$/i.test(e.status));
    const byType = {};
    for (const e of mine) byType[e.type] = (byType[e.type] || 0) + e.daysInPeriod;
    return { name: s.name || s.email, email: s.email, joinDate: s.joinDate || '',
      entitlement: bal.entitlement, carried: bal.carried, allowance: bal.allowance, used: bal.used, pending: bal.pending, remaining: bal.remaining,
      inPeriod: byType, pendingInPeriod: entries.filter((e) => e.email === s.email && /^pending$/i.test(e.status)).length };
  }).sort((a, b2) => a.name.localeCompare(b2.name));
  const onLeave = range.kind === 'day' ? entries.filter((e) => /^approved$/i.test(e.status)) : [];
  return { ok: true, period: range.kind, date: range.date, from, to, year, entries, people, onLeave,
    totals: { approvedDays: entries.filter((e) => /^approved$/i.test(e.status) && !e.work).reduce((a, e) => a + e.daysInPeriod, 0),
      pending: entries.filter((e) => /^pending$/i.test(e.status)).length,
      people: new Set(entries.filter((e) => /^approved$/i.test(e.status) && !e.work).map((e) => e.email)).size,
      siteVisits: entries.filter((e) => /^approved$/i.test(e.status) && e.work).length },
    leaveTypes: Object.values(LEAVE_TYPES).map((t) => t.label) };
}


/* ------------------------------------------------------------- admin panel */
const STAFF_LABELS = { email: 'Email', name: 'Name', active: 'Active', role: 'Role', annualDays: 'Annual Days',
  managerRef: 'Manager', joinDate: 'Joining Date', opening: 'Opening Balance' };

async function handleAdmin(b, staff, team) {
  if (!staff.admin) throw new HttpError(403, 'Only the admin can do this.');
  const year = Number(riyadh().day.slice(0, 4));
  const domain = env('ALLOWED_DOMAIN', 'adas.com.sa').toLowerCase();
  const leave = await allLeave().catch((e) => { if (e.status === 503) return Object.assign([], { adjustments: [], layout: null }); throw e; });

  const view = () => ({
    ok: true, year, columns: Object.fromEntries(Object.keys(STAFF_LABELS).map((f) => [f, team.pos[f] != null])),
    canAdjust: !!(leave.layout && leave.layout.pos.type != null),
    people: team.map((s) => ({
      index: s.index, email: s.email, name: s.name, active: s.active, role: s.role, managerRef: s.managerRef,
      joinDate: s.joinDate, annualDays: s.override, opening: s.opening,
      balance: balanceFor(s, leave, year),
      adjustments: (leave.adjustments || []).filter((l) => l.email === s.email).sort((x, y) => y.start.localeCompare(x.start)).slice(0, 10)
        .map((l) => ({ date: l.start, days: l.days, reason: l.note, by: l.decidedBy })),
    })).sort((a, b2) => (b2.active - a.active) || a.name.localeCompare(b2.name)),
  });
  if (b.action === 'adminTeam') return view();

  // validate + normalise the editable fields that were sent
  const clean = (f) => {
    const out = {};
    if ('name' in f) { out.name = String(f.name || '').trim().slice(0, 80); if (!out.name) throw new HttpError(400, 'Name is required.'); }
    if ('active' in f) out.active = !!f.active;
    if ('role' in f) { out.role = String(f.role || '').trim(); if (out.role && !/^(manager|admin|hr)$/i.test(out.role)) throw new HttpError(400, 'Role must be blank, Manager, HR or Admin.'); }
    if ('managerRef' in f) {
      out.managerRef = String(f.managerRef || '').trim().toLowerCase();
      if (out.managerRef && !team.some((s) => s.email === out.managerRef)) throw new HttpError(400, 'The manager must be someone on the staff list (their email).');
    }
    if ('joinDate' in f) { out.joinDate = String(f.joinDate || ''); if (out.joinDate && !isoDay(out.joinDate)) throw new HttpError(400, 'Joining date is not a valid date.'); }
    if ('annualDays' in f) {
      out.annualDays = f.annualDays === '' || f.annualDays == null ? '' : Number(f.annualDays);
      if (out.annualDays !== '' && !(out.annualDays > 0 && out.annualDays <= 60)) throw new HttpError(400, 'Annual days must be between 1 and 60 (or blank for automatic 22 / 30).');
    }
    if ('opening' in f) {
      out.opening = f.opening === '' || f.opening == null ? '' : Number(f.opening);
      if (out.opening !== '' && !(out.opening >= 0 && out.opening <= 365)) throw new HttpError(400, 'Opening balance must be between 0 and 365 days.');
    }
    const missing = Object.keys(out).filter((k) => team.pos[k] == null && !(k === 'active' && out[k] === true));
    if (missing.length) throw new HttpError(503, `Please add ${missing.length > 1 ? 'these columns' : 'this column'} to the Staff table first: ${missing.map((k) => STAFF_LABELS[k]).join(', ')}.`);
    return out;
  };
  const writeRow = (base, out) => {
    const row = Array.from({ length: team.width }, (_, i) => (base && base[i] != null ? base[i] : ''));
    for (const [k, v] of Object.entries(out)) if (team.pos[k] != null) row[team.pos[k]] = v;
    return row;
  };

  if (b.action === 'adminSave') {
    const s = team.find((x) => x.email === String(b.email || '').toLowerCase());
    if (!s) throw new HttpError(404, 'That person was not found. Please refresh.');
    const out = clean(b.fields || {});
    if (out.managerRef === s.email) throw new HttpError(400, 'Someone cannot be their own manager.');
    await graph('PATCH', `/tables/Staff/rows/itemAt(index=${s.index})`, { values: [writeRow(s.raw, out)] });
    Object.assign(s, out.annualDays !== undefined ? { override: out.annualDays === '' ? null : out.annualDays } : {},
      out.opening !== undefined ? { opening: Number(out.opening) || 0 } : {}, out.name !== undefined ? { name: out.name } : {},
      out.active !== undefined ? { active: out.active } : {}, out.role !== undefined ? { role: out.role, manager: /^(manager|admin|hr)$/i.test(out.role), admin: /^(admin|hr)$/i.test(out.role) } : {},
      out.managerRef !== undefined ? { managerRef: out.managerRef } : {}, out.joinDate !== undefined ? { joinDate: out.joinDate } : {});
    return { ...view(), saved: s.email };
  }

  if (b.action === 'adminAdd') {
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+$/.test(email) || !email.endsWith('@' + domain)) throw new HttpError(400, `Please use an @${domain} email.`);
    if (team.some((x) => x.email === email)) throw new HttpError(409, 'This person is already on the staff list.');
    const out = { email, active: true, ...clean({ name: b.fields && b.fields.name, ...(b.fields || {}) }) };
    await graph('POST', '/tables/Staff/rows', { values: [writeRow(null, out)] });
    team.push({ ...staffFrom(writeRow(null, out), team.pos), index: team.length, raw: writeRow(null, out) });
    return { ...view(), saved: email };
  }

  if (b.action === 'adminAdjust') {
    const s = team.find((x) => x.email === String(b.email || '').toLowerCase());
    if (!s) throw new HttpError(404, 'That person was not found. Please refresh.');
    if (!leave.layout) throw new HttpError(503, LEAVE_MISSING);
    if (leave.layout.pos.type == null) throw new HttpError(503, 'Balance adjustments need a "Type" column in the Leave table.');
    const days = Math.round(Number(b.days) * 2) / 2;
    if (!days || Math.abs(days) > 60) throw new HttpError(400, 'Enter a number of days between -60 and 60 (halves allowed), not 0.');
    const reason = String(b.reason || '').trim().slice(0, 200);
    if (!reason) throw new HttpError(400, 'Please write a reason — it is kept with the record.');
    const y = Number(b.year) || year;
    if (y < year - 1 || y > year + 1) throw new HttpError(400, 'Adjust this year, last year or next year only.');
    const { day, time } = riyadh();
    const date = y === year ? day : `${y}-${y < year ? '12-31' : '01-01'}`;
    const l = { id: 'A' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(), requested: `${day} ${time}`,
      email: s.email, name: s.name, start: date, end: date, days, note: reason, status: 'Approved', decidedBy: staff.name || staff.email, decidedAt: `${day} ${time}`, type: 'adjust' };
    await graph('POST', '/tables/Leave/rows', { values: [leaveRow(l, leave.layout)] }, LEAVE_MISSING);
    leave.adjustments.push(l);
    await notify([s.email], `Annual leave balance ${days > 0 ? 'increased' : 'reduced'} by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`,
      `${staff.name || 'The admin'} ${days > 0 ? 'added' : 'removed'} ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ${days > 0 ? 'to' : 'from'} your ${y} annual leave. Reason: ${reason}\\n\\nhttps://adas.com.sa/#/team`);
    return { ...view(), saved: s.email };
  }
  throw new HttpError(400, 'Unknown action.');
}

/* --------------------------------------------------------------- handler */

/* Scheduled reminders (vercel.json "crons"): GET /api/attendance?cron=checkin | checkout.
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set. */
async function runCron(job) {
  const day = riyadh().day, w = new Date(day + 'T00:00:00Z').getUTCDay();
  if (w === 5 || w === 6) return { skipped: 'weekend' };
  const [team, att, leave, holidays] = await Promise.all([loadStaff(), tableRows('Attendance'), allLeave().catch(() => []), holidayList()]);
  if (holidays.some((h) => h.date === day)) return { skipped: 'holiday' };
  const today = {};
  for (const row of att) if (cellDay(row[0]) === day) today[String(row[1]).trim().toLowerCase()] = { in: cellTime(row[3]), out: row[8] === '' ? '' : cellTime(row[8]) };
  const onLeave = (email) => leave.find((l) => l.email === email && /^approved$/i.test(l.status) && l.start <= day && l.end >= day && l.type !== 'site');
  const active = team.filter((s) => s.active && (!s.joinDate || s.joinDate <= day) && !onLeave(s.email));
  const rules = dayRules();
  let who = [], msg;
  if (job === 'checkin') {
    who = active.filter((s) => !today[s.email]);
    msg = { title: `Check-in closes at ${rules.closes}`, body: 'You haven\'t checked in yet today. Open the app to check in.', tag: 'checkin' };
  } else if (job === 'checkout') {
    who = active.filter((s) => today[s.email] && today[s.email].in && !today[s.email].out);
    msg = { title: 'Don\'t forget to check out', body: 'You\'re still checked in. Tap to check out when you leave.', tag: 'checkout' };
  } else throw new HttpError(400, 'Unknown job.');
  let sent = 0;
  for (const s of who) sent += await pushTo([s.email], msg);
  return { job, people: who.length, sent };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET' && req.query && req.query.cron) {
      const secret = env('CRON_SECRET');
      const auth = String(req.headers.authorization || '');
      const fromVercel = /vercel-cron/i.test(String(req.headers['user-agent'] || ''));
      if (secret ? auth !== `Bearer ${secret}` : !fromVercel) throw new HttpError(401, 'Not allowed.');
      return res.status(200).json({ ok: true, ...(await runCron(String(req.query.cron))) });
    }
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user = await verifyIdToken(idToken);
    const team = await loadStaff();
    let staff = team.find((s) => s.email === user.email && s.active);
    const isAdminEmail = adminEmails().includes(user.email);
    if (staff && isAdminEmail) staff = { ...staff, admin: true, manager: true };
    if (!staff && isAdminEmail) {
      staff = { email: user.email, name: 'ADAS Office', active: true, role: 'Admin', manager: true, admin: true, managerRef: '', override: null, joinDate: '', opening: 0, notStaff: true };
    }
    if (!staff) throw new HttpError(403, 'Your account is not on the team list. Please ask the admin to add you.');
    if (staff.notStaff && /^(checkIn|checkOut|perm(Request|Cancel|Out|In)|leaveRequest|leaveCancel)$/.test(String(b.action))) {
      throw new HttpError(403, 'The office admin account isn\'t on the staff list, so it can\'t check in or request leave.');
    }
    const name = staff.name || user.name;

    // short leave must never block check-in / check-out: if its table can't be read, carry on without it
    const permsOrNull = async () => {
      try { return await allPerms(); }
      catch (e) { if (e.status !== 503) console.warn('Permissions table unreadable:', e.message); return null; }
    };

    if (b.action === 'status') {
      const [rec, perms, site] = await Promise.all([todayRecord(user.email), permsOrNull(), siteVisitToday(user.email)]);
      const day = riyadh().day;
      const shortLeaveMin = perms ? perms.filter((x) => x.email === user.email && x.date === day && x.out && x.in)
        .reduce((a, x) => a + (Number(x.minutes) || 0), 0) : 0;
      return res.status(200).json({ ok: true, name, email: user.email, today: { ...summary(rec, site), shortLeaveMin },
        perm: perms ? permSummary(perms, user.email) : null, pushKey: vapidKeys() ? env('VAPID_PUBLIC_KEY') : null,
        admin: !!staff.admin, notStaff: !!staff.notStaff });
    }

    if (b.action === 'pushSubscribe' || b.action === 'pushUnsubscribe' || b.action === 'pushTest') {
      if (!vapidKeys()) throw new HttpError(503, 'Notifications are not set up yet (VAPID keys). Please ask the admin.');
      const devices = await allDevices();
      if (b.action === 'pushTest') {
        const n = await pushTo([user.email], { title: 'ADAS notifications are on', body: 'This is a test. You\'ll get alerts here for approvals and reminders.', tag: 'test' });
        return res.status(200).json({ ok: true, sent: n });
      }
      const endpoint = String((b.subscription && b.subscription.endpoint) || b.endpoint || '');
      if (!/^https:\/\//.test(endpoint)) throw new HttpError(400, 'Invalid notification subscription.');
      const existing = devices.find((d) => d.endpoint === endpoint);
      if (b.action === 'pushUnsubscribe') {
        if (existing && existing.email === user.email) await graph('DELETE', `/tables/Devices/rows/itemAt(index=${existing.index})`, null, DEVICES_MISSING);
        return res.status(200).json({ ok: true });
      }
      const keys = b.subscription.keys || {};
      if (!keys.p256dh || !keys.auth) throw new HttpError(400, 'Invalid notification subscription.');
      const d = { email: user.email, endpoint, p256dh: keys.p256dh, auth: keys.auth, added: riyadh().day, device: String(b.device || '').slice(0, 120) };
      if (existing) await graph('PATCH', `/tables/Devices/rows/itemAt(index=${existing.index})`, { values: [deviceRow(d, devices.layout)] }, DEVICES_MISSING);
      else await graph('POST', '/tables/Devices/rows', { values: [deviceRow(d, devices.layout)] }, DEVICES_MISSING);
      return res.status(200).json({ ok: true, devices: devices.filter((x) => x.email === user.email && x.endpoint !== endpoint).length + 1 });
    }

    if (b.action === 'permRequest' || b.action === 'permCancel') {
      const rec = await todayRecord(user.email);
      if (!rec) throw new HttpError(409, 'Please check in first.');
      if (rec.row[8]) throw new HttpError(409, 'You have already checked out today.');
      const perms = await allPerms();
      const now = riyadh();
      const sum = permSummary(perms, user.email, now);
      if (b.action === 'permCancel') {
        const p = sum.request && perms.find((x) => x.index === sum.request.id);
        if (!p || !/^(requested|approved)$/i.test(p.status)) throw new HttpError(409, 'There is no request to cancel.');
        p.status = 'Cancelled';
        await graph('PATCH', `/tables/Permissions/rows/itemAt(index=${p.index})`, { values: [permRow(p, perms.layout)] }, PERM_MISSING);
        return res.status(200).json({ ok: true, perm: permSummary(perms, user.email, now) });
      }
      if (sum.open) throw new HttpError(409, `You are already out since ${sum.open.out}.`);
      if (sum.request && /^(requested|approved)$/i.test(sum.request.status)) {
        throw new HttpError(409, sum.request.status === 'Approved' ? 'Your request is already approved — tap Step out when you leave.' : 'You already have a request waiting for approval.');
      }
      if (sum.leftMin <= 0) {
        throw new HttpError(409, sum.dayMin >= sum.limits.day
          ? `You've used today's ${sum.limits.day / 60} hours of short leave.` : `You've used this week's ${sum.limits.week / 60} hours of short leave.`);
      }
      const planned = Math.round(Number(b.planned) || 0);
      if (planned < 5) throw new HttpError(400, 'Please choose how long you need.');
      if (planned > sum.leftMin) throw new HttpError(400, `You have ${sum.leftMin} minutes of short leave left.`);
      const approvers = approversFor(staff, team);
      if (!approvers.length) throw new HttpError(409, 'No manager is set for you yet — please tell the admin.');
      const reason = String(b.reason || '').slice(0, 200);
      const row = { date: now.day, email: user.email, name, out: '', in: '', minutes: '', reason, status: 'Requested', planned, decidedBy: '' };
      await graph('POST', '/tables/Permissions/rows', { values: [permRow(row, perms.layout)] }, PERM_MISSING);
      perms.push({ ...row, minutes: 0, index: perms.length });
      await notify(approversFor(staff, team).map((s) => s.email), `Short leave request: ${name}, ${planned} min`,
        `${name} asks to step out for ${planned} minutes${reason ? ` (${reason})` : ''}, requested at ${now.time}.\n\nApprove or decline: https://adas.com.sa/#/team`);
      return res.status(200).json({ ok: true, perm: permSummary(perms, user.email, now) });
    }

    if (b.action === 'permQueue' || b.action === 'permDecide') {
      const perms = await allPerms();
      const now = riyadh();
      const byEmail = Object.fromEntries(team.map((x) => [x.email, x]));
      const mineToDecide = (p) => byEmail[p.email] && canDecide(staff, byEmail[p.email], team);
      if (b.action === 'permDecide') {
        const p = perms.find((x) => x.index === Number(b.id));
        if (!p || p.date !== now.day) throw new HttpError(404, 'That request was not found. Please refresh.');
        if (!mineToDecide(p)) throw new HttpError(403, 'Only this person\'s manager can decide.');
        if (!/^requested$/i.test(p.status)) throw new HttpError(409, `This request is already ${p.status.toLowerCase()}.`);
        const approve = b.decision === 'approve';
        p.status = approve ? 'Approved' : 'Declined'; p.decidedBy = name;
        await graph('PATCH', `/tables/Permissions/rows/itemAt(index=${p.index})`, { values: [permRow(p, perms.layout)] }, PERM_MISSING);
        await notify([p.email], `Short leave ${approve ? 'approved' : 'declined'}`,
          approve ? `${name} approved your short leave (${p.planned} min). Tap Step out on the Team page when you leave.\n\nhttps://adas.com.sa/#/team`
            : `${name} declined your short leave request for today.\n\nhttps://adas.com.sa/#/team`);
      }
      const today = perms.filter((p) => p.date === now.day && mineToDecide(p));
      const pub = (p) => ({ id: p.index, name: p.name, email: p.email, planned: p.planned, reason: p.reason, status: p.status, out: p.out, in: p.in, minutes: p.minutes,
        left: permSummary(perms, p.email, now).leftMin });
      const isApprover = staff.admin || team.some((x) => x.active && canDecide(staff, x, team));
      return res.status(200).json({ ok: true, manager: isApprover,
        requests: today.filter((p) => /^requested$/i.test(p.status)).map(pub),
        out: today.filter((p) => p.out && !p.in).map(pub),
        done: today.filter((p) => p.in || /^(approved|declined)$/i.test(p.status)).map(pub) });
    }

    if (b.action === 'permOut' || b.action === 'permIn') {
      const p = checkPlace(b);
      const rec = await todayRecord(user.email);
      if (!rec) throw new HttpError(409, 'Please check in first.');
      if (rec.row[8]) throw new HttpError(409, 'You have already checked out today.');
      const perms = await allPerms();
      const now = riyadh();
      const sum = permSummary(perms, user.email, now);
      if (b.action === 'permOut') {
        if (sum.open) throw new HttpError(409, `You stepped out at ${sum.open.out}. Tap Back in when you return.`);
        if (sum.leftMin <= 0) {
          throw new HttpError(409, sum.dayMin >= sum.limits.day
            ? `You've used today's ${sum.limits.day / 60} hours of short leave.`
            : `You've used this week's ${sum.limits.week / 60} hours of short leave.`);
        }
        const req = sum.request && perms.find((x) => x.index === sum.request.id);
        if (!req || !/^approved$/i.test(req.status)) {
          throw new HttpError(409, req && /^requested$/i.test(req.status) ? 'Your request is still waiting for your manager\'s approval.' : 'Please request short leave first and wait for approval.');
        }
        req.out = now.time; req.status = 'Out';
        await graph('PATCH', `/tables/Permissions/rows/itemAt(index=${req.index})`, { values: [permRow(req, perms.layout)] }, PERM_MISSING);
        return res.status(200).json({ ok: true, perm: permSummary(perms, user.email, now) });
      }
      if (!sum.open) throw new HttpError(409, 'You are not stepped out.');
      const closed = await closeOpenPerm(perms, user.email, now.time);
      return res.status(200).json({ ok: true, perm: permSummary(perms, user.email, now), closed: { minutes: closed.minutes, status: closed.status } });
    }

    if (b.action === 'checkIn') {
      const site = await siteVisitToday(user.email);
      const win = siteWindow(site, riyadh().time);
      const p = win.anywhere ? checkPlaceAnywhere(b) : checkPlace(b);
      if (await todayRecord(user.email)) throw new HttpError(409, 'You have already checked in today.');
      const { day, time } = riyadh();
      const rules = dayRules();
      if (!win.waiveLate && toMin(time) > rules.closesMin) {
        throw new HttpError(409, `Check-in closed at ${rules.closes}. Today is recorded as absent unless you have approved leave — please speak to your manager.`);
      }
      const row = [day, user.email, name, time, p.distance, p.accuracy, p.lat, p.lng, '', '', '', '', '', ''];
      await graph('POST', '/tables/Attendance/rows', { values: [row] });
      return res.status(200).json({ ok: true, today: summary({ row }, site) });
    }

    if (b.action === 'checkOut') {
      const site = await siteVisitToday(user.email);
      const p = siteWindow(site, riyadh().time).anywhere || (site && siteParts(site.note).from && toMin(riyadh().time) >= toMin(siteParts(site.note).from))
        ? checkPlaceAnywhere(b) : checkPlace(b);
      const rec = await todayRecord(user.email);
      if (!rec) throw new HttpError(409, 'You have not checked in today.');
      if (rec.row[8]) throw new HttpError(409, 'You have already checked out today.');
      const { day, time } = riyadh();
      const perms = await permsOrNull();
      if (perms) await closeOpenPerm(perms, user.email, time); // stepped out and went home
      // short leave actually taken today (stepped out and back) is not working time
      const shortMin = perms ? perms.filter((x) => x.email === user.email && x.date === day && x.out && x.in)
        .reduce((a, x) => a + (Number(x.minutes) || 0), 0) : 0;
      const [ih, im] = String(rec.row[3]).split(':').map(Number);
      const [oh, om] = time.split(':').map(Number);
      const hours = Math.max(0, ((oh * 60 + om) - (ih * 60 + im) - shortMin) / 60).toFixed(2);
      const row = rec.row.slice(0, LOG_COLUMNS);
      row.splice(8, 6, time, p.distance, p.accuracy, p.lat, p.lng, hours);
      await graph('PATCH', `/tables/Attendance/rows/itemAt(index=${rec.index})`, { values: [row] });
      return res.status(200).json({ ok: true, today: { ...summary({ row }, site), shortLeaveMin: shortMin }, perm: perms ? permSummary(perms, user.email) : null });
    }

    if (String(b.action || '').startsWith('admin')) return res.status(200).json(await handleAdmin(b, staff, team));
    if (b.action === 'report') return res.status(200).json(await handleReport(b, staff, team));
    if (b.action === 'leaveReport') return res.status(200).json(await handleLeaveReport(b, staff, team));

    if (String(b.action || '').startsWith('leave')) {
      return res.status(200).json(await handleLeave(b, staff, name, team));
    }

    throw new HttpError(400, 'Unknown action.');
  } catch (err) {
    const status = err.status || 500;
    if (status === 500 && !err.status) console.error(err);
    return res.status(status).json({ ok: false, error: err.status ? err.message : 'Something went wrong. Please try again.' });
  }
};

module.exports.config = { maxDuration: 15 };
module.exports._test = { riyadh, metres, verifyIdToken, checkPlace, cellDay, cellTime, parseCoord, officeLocation, workingDays, staffFrom, approversFor, canDecide, entitlementFor, balanceFor, anyDay, leaveTypeKey, permSummary, weekStart, periodRange, encryptPush, vapidHeader, vapidKeys, runCron, b64u, fromB64u };
