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

async function graph(method, path, body) {
  const base = `https://graph.microsoft.com/v1.0${env('ATT_DRIVE')}/root:/${encodeURI(env('ATT_WORKBOOK_PATH'))}:/workbook`;
  const r = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${await graphToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    console.error('Graph', method, path, r.status, detail.slice(0, 500));
    throw new HttpError(502, 'Could not reach the attendance workbook. Please try again.');
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

const tableRows = async (table) => ((await graph('GET', `/tables/${table}/rows`)).value || []).map((r) => r.values[0]);

async function staffMember(email) {
  const row = (await tableRows('Staff')).find((r) => String(r[0]).trim().toLowerCase() === email);
  if (!row) return null;
  const active = String(row[2]).trim().toUpperCase();
  if (['FALSE', 'NO', '0'].includes(active)) return null;
  return { email, name: String(row[1] || '').trim() };
}

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

function checkPlace(b) {
  const lat = Number(b.lat), lng = Number(b.lng), acc = Number(b.accuracy);
  // ADAS office, Jeddah (21°43'22.9"N 39°08'03.8"E); Vercel env vars override.
  const oLat = Number(env('OFFICE_LAT', '21.723028')), oLng = Number(env('OFFICE_LNG', '39.134389'));
  const radius = Number(env('RADIUS_M', '150'));
  if (!oLat || !oLng) throw new HttpError(500, 'Office location is not set up yet. Please tell the admin.');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new HttpError(400, 'Location is missing. Please allow location access and try again.');
  if (!Number.isFinite(acc) || acc > MAX_ACCURACY_M) {
    throw new HttpError(400, `Your location is not precise enough (±${Math.round(acc || 0)} m). Turn on GPS / precise location and try again.`);
  }
  const distance = metres(lat, lng, oLat, oLng);
  if (distance > radius) throw new HttpError(400, `You are about ${distance} m from the office. Check-in works within ${radius} m.`);
  return { distance, accuracy: Math.round(acc), lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

/* --------------------------------------------------------------- handler */

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user = await verifyIdToken(idToken);
    const staff = await staffMember(user.email);
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

    throw new HttpError(400, 'Unknown action.');
  } catch (err) {
    const status = err.status || 500;
    if (status === 500 && !err.status) console.error(err);
    return res.status(status).json({ ok: false, error: err.status ? err.message : 'Something went wrong. Please try again.' });
  }
};

module.exports.config = { maxDuration: 15 };
module.exports._test = { riyadh, metres, verifyIdToken, checkPlace, cellDay, cellTime };
