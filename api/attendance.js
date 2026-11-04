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
    allowance: Number.isFinite(days) && days > 0 ? days : Number(env('ANNUAL_LEAVE_DAYS', '22')),
  };
}

/** All staff rows (active and inactive), read once per request. */
async function loadStaff() {
  const [pos, rows] = await Promise.all([staffLayout(), tableRows('Staff')]);
  return rows.map((row) => staffFrom(row, pos)).filter((s) => s.email);
}

/** Who approves this employee's leave: their own Manager if set, otherwise everyone with Role = Manager. */
function approversFor(employee, team) {
  const active = team.filter((s) => s.active && s.email !== employee.email);
  if (employee.managerRef) {
    const own = active.filter((s) => s.email === employee.managerRef || s.name.toLowerCase() === employee.managerRef);
    if (own.length) return own;
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

const summary = (rec) => (rec
  ? { checkIn: String(rec.row[3] || ''), checkOut: String(rec.row[8] || ''), hours: rec.row[13] === '' ? '' : String(rec.row[13]) }
  : { checkIn: '', checkOut: '', hours: '' });

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

function leaveFrom(row, index, layout) {
  const v = (f) => (layout.pos[f] == null ? '' : row[layout.pos[f]]);
  return {
    index, raw: row, id: String(v('id')), requested: String(v('requested') || ''), email: String(v('email')).trim().toLowerCase(),
    name: String(v('name') || ''), start: cellDay(v('start')), end: cellDay(v('end')), days: Number(v('days')) || 0,
    note: String(v('note') || ''), status: String(v('status') || 'Pending').trim() || 'Pending',
    decidedBy: String(v('decidedBy') || ''), decidedAt: String(v('decidedAt') || ''),
  };
}
/** Full-width row for the table; keeps any extra columns the admin added. */
function leaveRow(l, layout) {
  const row = Array.from({ length: layout.width }, (_, i) => (l.raw && l.raw[i] != null ? l.raw[i] : ''));
  for (const f of Object.keys(LEAVE_FIELDS)) if (layout.pos[f] != null) row[layout.pos[f]] = l[f] == null ? '' : l[f];
  return row;
}
const publicLeave = ({ index, raw, ...l }) => l;

async function allLeave() {
  const layout = await leaveLayout();
  const rows = (await tableRows('Leave', LEAVE_MISSING)).map((row, i) => leaveFrom(row, i, layout))
    .filter((l) => l.id || l.email); // skip blank rows inside the table
  rows.layout = layout;
  return rows;
}

function balanceFor(staff, leave, year) {
  const mine = leave.filter((l) => l.email === staff.email && l.start.slice(0, 4) === String(year));
  const used = mine.filter((l) => /^approved$/i.test(l.status)).reduce((a, l) => a + l.days, 0);
  const pending = mine.filter((l) => /^pending$/i.test(l.status)).reduce((a, l) => a + l.days, 0);
  return { year, allowance: staff.allowance, used, pending, remaining: staff.allowance - used - pending };
}

/** Best-effort email via Microsoft Graph (needs MAIL_FROM + Mail.Send). Never blocks the request. */
async function notify(to, subject, text) {
  const from = env('MAIL_FROM');
  if (!from || !to.length) return;
  try {
    await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await graphToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { subject, body: { contentType: 'Text', content: text },
        toRecipients: to.map((address) => ({ emailAddress: { address } })) }, saveToSentItems: false }),
    });
  } catch (e) { console.warn('leave email not sent:', e.message); }
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

  if (b.action === 'leaveRequest') {
    const start = String(b.start || ''), end = String(b.end || ''), note = String(b.note || '').slice(0, 300);
    if (!isoDay(start) || !isoDay(end)) throw new HttpError(400, 'Please choose a start and end date.');
    if (end < start) throw new HttpError(400, 'The end date is before the start date.');
    if (start < riyadh().day) throw new HttpError(400, 'Leave can only be requested from today onwards.');
    if (start.slice(0, 4) !== end.slice(0, 4)) throw new HttpError(400, 'Please split leave that crosses the new year into two requests.');
    const days = workingDays(start, end, holidaySet);
    if (days === 0) throw new HttpError(400, 'Those dates are only weekends or public holidays — no working days to request.');
    const clash = leave.find((l) => l.email === staff.email && /^(pending|approved)$/i.test(l.status) && l.start <= end && start <= l.end);
    if (clash) throw new HttpError(409, `You already have a ${clash.status.toLowerCase()} request for ${clash.start} — ${clash.end}.`);
    const bal = balanceFor(staff, leave, Number(start.slice(0, 4)));
    if (days > bal.remaining) throw new HttpError(400, `That is ${days} working days, but you have ${bal.remaining} left for ${bal.year}.`);
    const { day, time } = riyadh();
    const l = { id: 'L' + Date.now().toString(36).toUpperCase(), requested: `${day} ${time}`, email: staff.email, name,
      start, end, days, note, status: 'Pending', decidedBy: '', decidedAt: '' };
    await graph('POST', '/tables/Leave/rows', { values: [leaveRow(l, leave.layout)] }, LEAVE_MISSING);
    leave.push({ ...l, index: leave.length });
    const managers = approversFor(staff, team).map((s) => s.email);
    await notify(managers, `Leave request: ${name}, ${days} day${days === 1 ? '' : 's'}`,
      `${name} requested annual leave from ${start} to ${end} (${days} working day${days === 1 ? '' : 's'}).\n${note ? 'Note: ' + note + '\n' : ''}\nReview it at https://adas.com.sa/#/team`);
    return view();
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
    await notify([l.email], `Your leave request was ${approve ? 'approved' : 'not approved'}`,
      `Your annual leave ${l.start} to ${l.end} (${l.days} working day${l.days === 1 ? '' : 's'}) was ${approve ? 'approved' : 'not approved'} by ${name}.\n\nSee your balance at https://adas.com.sa/#/team`);
    return view();
  }

  throw new HttpError(400, 'Unknown action.');
}

/* --------------------------------------------------------------- handler */

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user = await verifyIdToken(idToken);
    const team = await loadStaff();
    const staff = team.find((s) => s.email === user.email && s.active);
    if (!staff) throw new HttpError(403, 'Your account is not on the team list. Please ask the admin to add you.');
    const name = staff.name || user.name;

    if (b.action === 'status') {
      return res.status(200).json({ ok: true, name, email: user.email, today: summary(await todayRecord(user.email)) });
    }

    if (b.action === 'checkIn') {
      const p = checkPlace(b);
      if (await todayRecord(user.email)) throw new HttpError(409, 'You have already checked in today.');
      const { day, time } = riyadh();
      const row = [day, user.email, name, time, p.distance, p.accuracy, p.lat, p.lng, '', '', '', '', '', ''];
      await graph('POST', '/tables/Attendance/rows', { values: [row] });
      return res.status(200).json({ ok: true, today: summary({ row }) });
    }

    if (b.action === 'checkOut') {
      const p = checkPlace(b);
      const rec = await todayRecord(user.email);
      if (!rec) throw new HttpError(409, 'You have not checked in today.');
      if (rec.row[8]) throw new HttpError(409, 'You have already checked out today.');
      const { time } = riyadh();
      const [ih, im] = String(rec.row[3]).split(':').map(Number);
      const [oh, om] = time.split(':').map(Number);
      const hours = Math.max(0, ((oh * 60 + om) - (ih * 60 + im)) / 60).toFixed(2);
      const row = rec.row.slice(0, LOG_COLUMNS);
      row.splice(8, 6, time, p.distance, p.accuracy, p.lat, p.lng, hours);
      await graph('PATCH', `/tables/Attendance/rows/itemAt(index=${rec.index})`, { values: [row] });
      return res.status(200).json({ ok: true, today: summary({ row }) });
    }

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
module.exports._test = { riyadh, metres, verifyIdToken, checkPlace, cellDay, cellTime, parseCoord, officeLocation, workingDays, staffFrom, approversFor, canDecide };
