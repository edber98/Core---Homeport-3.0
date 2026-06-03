function str(v) {
  return String(v === undefined || v === null ? '' : v).trim();
}

function toNum(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function parseJson(v, label, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(String(v)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

function listResult(items, raw) {
  return { ok: true, items, totalCount: items.length, nextCursor: null, raw: raw || items };
}

function itemResult(raw, name) {
  const r = raw || {};
  return {
    ok: true,
    id: str(r.id || ''),
    name: str(r.name || name || ''),
    url: '',
    status: str(r.status || ''),
    created_at: '',
    updated_at: '',
    raw: r
  };
}

function actionResult(message, raw) {
  return { ok: true, status: 200, message, raw: raw || null };
}

function decodePayload(msg) {
  if (!msg || !msg.data) return '';
  try { return new TextDecoder().decode(msg.data); } catch { return ''; }
}

function decodeHeaders(msg) {
  const out = {};
  if (!msg || !msg.headers) return out;
  for (const [k, vals] of msg.headers) {
    out[k] = Array.isArray(vals) ? vals.join(', ') : String(vals);
  }
  return out;
}

function getConnOptions(opts) {
  const c = (opts && opts.credentials) || {};
  const servers = str(c.servers || c.server || c.baseUrl || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!servers.length) throw new Error('Identifiant NATS requis: servers (ex: nats://localhost:4222).');

  const out = { servers };
  if (c.token) out.token = String(c.token);
  if (c.user && c.password) {
    out.user = String(c.user);
    out.pass = String(c.password);
  }
  return out;
}

async function withConn(opts, fn) {
  let connect;
  try {
    ({ connect } = require('nats'));
  } catch {
    return { ok: false, error: "Le package 'nats' n'est pas installé. Exécuter: npm i nats (dans API/)." };
  }

  let nc;
  try {
    nc = await connect(getConnOptions(opts));
    return await fn(nc);
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { if (nc) await nc.close(); } catch {}
  }
}

async function run(key, inputs, opts) {
  const d = inputs || {};

  try {
    if (key === 'nats_message_publish') {
      const subject = str(d.subject);
      const payload = str(d.payload);
      if (!subject) return { ok: false, error: 'subject requis.' };

      return withConn(opts, async (nc) => {
        const headersObj = parseJson(d.headers, 'headers', {});
        let headers;
        if (headersObj && typeof headersObj === 'object' && Object.keys(headersObj).length) {
          const n = require('nats');
          headers = n.headers();
          Object.entries(headersObj).forEach(([k, v]) => headers.set(String(k), String(v)));
        }
        nc.publish(subject, payload, headers ? { headers } : undefined);
        await nc.flush();
        return actionResult('Message publié.', { subject });
      });
    }

    if (key === 'nats_message_request') {
      const subject = str(d.subject);
      if (!subject) return { ok: false, error: 'subject requis.' };
      const timeout = Math.max(100, Math.min(120000, toNum(d.timeout_ms, 5000)));

      return withConn(opts, async (nc) => {
        const msg = await nc.request(subject, str(d.payload), { timeout });
        const text = decodePayload(msg);
        return itemResult({
          id: msg.sid || '',
          name: subject,
          status: 'replied',
          payload: text,
          headers: decodeHeaders(msg)
        }, subject);
      });
    }

    if (key === 'nats_message_subscribe_once') {
      const subject = str(d.subject);
      if (!subject) return { ok: false, error: 'subject requis.' };
      const timeout = Math.max(100, Math.min(120000, toNum(d.timeout_ms, 5000)));

      return withConn(opts, async (nc) => {
        const sub = nc.subscribe(subject, { max: 1 });
        const timer = setTimeout(() => {
          try { sub.unsubscribe(); } catch {}
        }, timeout);

        for await (const msg of sub) {
          clearTimeout(timer);
          return itemResult({
            id: `${subject}:${msg.seq || ''}`,
            name: subject,
            status: 'received',
            payload: decodePayload(msg),
            headers: decodeHeaders(msg)
          }, subject);
        }

        clearTimeout(timer);
        return itemResult({ id: '', name: subject, status: 'timeout', payload: '' }, subject);
      });
    }

    if (key === 'nats_jetstream_js_publish') {
      const subject = str(d.subject);
      const payload = str(d.payload);
      if (!subject) return { ok: false, error: 'subject requis.' };

      return withConn(opts, async (nc) => {
        const js = nc.jetstream();
        const optsPub = {};
        const msgId = str(d.msg_id || d.msgId);
        if (msgId) optsPub.msgID = msgId;
        const ack = await js.publish(subject, payload, optsPub);
        return actionResult('Message JetStream publié.', ack);
      });
    }

    if (key === 'nats_jetstream_js_fetch') {
      const stream = str(d.stream);
      const consumer = str(d.consumer);
      if (!stream || !consumer) return { ok: false, error: 'stream et consumer requis.' };
      const maxMessages = Math.max(1, Math.min(1000, toNum(d.max_messages, 10)));
      const expires = Math.max(100, Math.min(120000, toNum(d.expires_ms, 5000)));

      return withConn(opts, async (nc) => {
        const js = nc.jetstream();
        const con = await js.consumers.get(stream, consumer);
        const iter = await con.fetch({ max_messages: maxMessages, expires });

        const items = [];
        for await (const m of iter) {
          const payload = decodePayload(m);
          items.push({
            id: `${m.subject}:${m.info?.streamSequence || ''}`,
            name: m.subject,
            url: '',
            status: 'fetched',
            created_at: '',
            updated_at: '',
            raw: {
              subject: m.subject,
              stream: m.info?.stream,
              streamSequence: m.info?.streamSequence,
              deliverySequence: m.info?.deliverySequence,
              payload,
              headers: decodeHeaders(m)
            }
          });
          try { m.ack(); } catch {}
        }

        return listResult(items, { stream, consumer, returned: items.length });
      });
    }

    if (key === 'nats_jetstream_js_stream_info') {
      const stream = str(d.stream);
      if (!stream) return { ok: false, error: 'stream requis.' };

      return withConn(opts, async (nc) => {
        const jsm = await nc.jetstreamManager();
        const info = await jsm.streams.info(stream);
        return itemResult({ id: stream, name: stream, status: 'ok', info }, stream);
      });
    }

    if (key === 'nats_jetstream_js_consumer_info') {
      const stream = str(d.stream);
      const consumer = str(d.consumer);
      if (!stream || !consumer) return { ok: false, error: 'stream et consumer requis.' };

      return withConn(opts, async (nc) => {
        const jsm = await nc.jetstreamManager();
        const info = await jsm.consumers.info(stream, consumer);
        return itemResult({ id: `${stream}:${consumer}`, name: consumer, status: 'ok', info }, consumer);
      });
    }

    if (key === 'nats_jetstream_js_streams_list') {
      return withConn(opts, async (nc) => {
        const jsm = await nc.jetstreamManager();
        const iter = await jsm.streams.list();
        const items = [];
        for await (const info of iter) {
          const cfg = info?.config || {};
          items.push({
            id: str(cfg.name || ''),
            name: str(cfg.name || ''),
            url: '',
            status: 'ok',
            created_at: '',
            updated_at: '',
            raw: info
          });
        }
        return listResult(items, items);
      });
    }

    if (key === 'nats_jetstream_js_consumers_list') {
      const stream = str(d.stream);
      if (!stream) return { ok: false, error: 'stream requis.' };
      return withConn(opts, async (nc) => {
        const jsm = await nc.jetstreamManager();
        const iter = await jsm.consumers.list(stream);
        const items = [];
        for await (const info of iter) {
          items.push({
            id: `${stream}:${str(info?.name || '')}`,
            name: str(info?.name || ''),
            url: '',
            status: 'ok',
            created_at: '',
            updated_at: '',
            raw: info
          });
        }
        return listResult(items, items);
      });
    }

    return { ok: false, error: `Action inconnue: ${key}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, parseJson } };
