// CalDAV — agenda générique (serveurs mail auto-hébergés : SOGo, Stalwart,
// Nextcloud, Radicale, Baïkal…). Requêtes WebDAV brutes via https (pas de
// dépendance), TLS permissif comme l'IMAP/SMTP du même écosystème.

const https = require('https');
const http = require('http');
const crypto = require('crypto');

function davRequest(creds, { method, path = '', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    let base;
    try { base = new URL(creds.serverUrl); } catch { return reject(new Error('serverUrl invalide')); }
    const url = new URL(path || '', base.href.endsWith('/') ? base.href : base.href + '/');
    const mod = url.protocol === 'http:' ? http : https;
    const req = mod.request(url, {
      method,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${creds.username}:${creds.password}`).toString('base64'),
        ...headers,
      },
      rejectUnauthorized: false,
      timeout: 20000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('timeout', () => { req.destroy(new Error('caldav_timeout')); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Déplie les lignes ICS (continuations par espace) puis parse les VEVENT
function parseIcsEvents(ics) {
  const unfolded = String(ics).replace(/\r?\n[ \t]/g, '');
  const events = [];
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0];
    const get = (prop) => {
      const m = new RegExp(`^${prop}(;[^:\\n]*)?:(.*)$`, 'mi').exec(body);
      return m ? { params: m[1] || '', value: m[2].trim() } : null;
    };
    const uid = get('UID');
    const dtstart = get('DTSTART');
    const dtend = get('DTEND');
    events.push({
      id: (uid && uid.value) || crypto.createHash('md5').update(body).digest('hex').slice(0, 12),
      summary: unescapeIcs(get('SUMMARY')?.value || '(sans titre)'),
      start: icsToIso(dtstart),
      end: icsToIso(dtend),
      allDay: !!(dtstart && /VALUE=DATE(?!-TIME)/i.test(dtstart.params)),
      location: unescapeIcs(get('LOCATION')?.value || ''),
      description: unescapeIcs(get('DESCRIPTION')?.value || '').slice(0, 1000),
      status: (get('STATUS')?.value || 'CONFIRMED').toUpperCase(),
      organizer: get('ORGANIZER')?.value || '',
    });
  }
  return events;
}

function unescapeIcs(s) { return String(s).replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1'); }

function icsToIso(prop) {
  if (!prop || !prop.value) return null;
  const v = prop.value;
  let m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] || ''}`;
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return v;
}

function toIcsDate(input, allDay) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error(`date invalide: ${input}`);
  if (allDay) return d.toISOString().slice(0, 10).replace(/-/g, '');
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

module.exports = {
  // Liste les événements d'une période (défaut : -7 j → +60 j)
  async caldav_events_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    if (!creds.serverUrl || !creds.username) return { ok: false, error: 'missing_caldav_credentials (serverUrl / username / password requis)' };
    const d = inputs || {};
    const from = d.from ? new Date(d.from) : new Date(Date.now() - 7 * 864e5);
    const to = d.to ? new Date(d.to) : new Date(Date.now() + 60 * 864e5);
    const limit = Math.max(1, Math.min(parseInt(d.limit, 10) || 100, 500));
    const fmt = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    const body = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${fmt(from)}" end="${fmt(to)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

    try {
      const res = await davRequest(creds, {
        method: 'REPORT',
        headers: { 'Content-Type': 'application/xml; charset=utf-8', Depth: '1' },
        body,
      });
      if (res.status === 401 || res.status === 403) return { ok: false, error: `caldav_auth_failed (${res.status})` };
      if (res.status >= 400) return { ok: false, error: `caldav_report_failed (${res.status}): ${String(res.data).slice(0, 200)}` };
      // Les calendar-data sont des blocs ICS encodés XML dans le multistatus
      const decoded = String(res.data)
        .replace(/&#13;/g, '\r').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const events = parseIcsEvents(decoded)
        .sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')))
        .slice(0, limit);
      log(`[caldav] ${events.length} événement(s) entre ${from.toISOString().slice(0, 10)} et ${to.toISOString().slice(0, 10)}`);
      return { ok: true, totalCount: events.length, events };
    } catch (e) {
      return { ok: false, error: `caldav_unreachable: ${e.message}` };
    }
  },

  // Crée un événement (PUT d'un VEVENT)
  async caldav_event_create(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    if (!creds.serverUrl || !creds.username) return { ok: false, error: 'missing_caldav_credentials' };
    const d = inputs || {};
    if (!d.summary || !d.start) return { ok: false, error: 'summary et start requis' };
    const allDay = d.allDay === true || d.allDay === 'true';
    const uid = `kinn-${crypto.randomUUID()}`;
    const dtStamp = toIcsDate(new Date(), false);
    const dtStart = toIcsDate(d.start, allDay);
    const dtEnd = d.end ? toIcsDate(d.end, allDay) : null;
    const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kinn Homeport//Radar//FR', 'BEGIN:VEVENT',
      `UID:${uid}`, `DTSTAMP:${dtStamp}`,
      allDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
      ...(dtEnd ? [allDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`] : []),
      `SUMMARY:${esc(d.summary)}`,
      ...(d.location ? [`LOCATION:${esc(d.location)}`] : []),
      ...(d.description ? [`DESCRIPTION:${esc(d.description)}`] : []),
      'END:VEVENT', 'END:VCALENDAR', '',
    ];
    try {
      const res = await davRequest(creds, {
        method: 'PUT',
        path: `${uid}.ics`,
        headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
        body: lines.join('\r\n'),
      });
      if (res.status >= 400) return { ok: false, error: `caldav_put_failed (${res.status}): ${String(res.data).slice(0, 200)}` };
      return { ok: true, id: uid, summary: d.summary, start: d.start, end: d.end || null };
    } catch (e) {
      return { ok: false, error: `caldav_unreachable: ${e.message}` };
    }
  },
};
