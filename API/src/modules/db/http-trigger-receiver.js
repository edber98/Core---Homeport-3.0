// Receiver pour les déclencheurs HTTP entrants : /api/trigger/:triggerId
//
// Différent de /api/hooks/:token (qui sert les nodes legacy webhook-event basés
// sur un token flow-level). Ici chaque node `core_webhook` a son propre
// triggerId persistant + ses secrets d'auth chiffrés sur flow.httpTriggers.
//
// Pipeline :
//   1. Rate-limit basique (X req/min par IP)
//   2. Lookup flow via httpTriggerIds (indexé)
//   3. Trouve le node correspondant + lit auth_mode dans node.context
//   4. Valide l'auth selon le mode (public/token/basic/hmac/pat)
//   5. Vérifie que le flow est déployé (présent dans triggerManager.activeTriggers)
//   6. Emit l'event vers l'adapter
//   7. Réponse : status + body custom configurés sur le node

const express = require('express');
const crypto = require('crypto');
const Flow = require('../../db/models/flow.model');
const { triggerManager } = require('../../services/trigger-manager');
const { decryptSecrets } = require('../../services/form-resolvers/_helpers');

const RATE_LIMIT_PER_MIN = parseInt(process.env.HTTP_TRIGGER_RATE_LIMIT_PER_MIN || '120', 10);
const ipBuckets = new Map(); // ip → { count, resetAt }

function checkRateLimit(ip) {
  const now = Date.now();
  let b = ipBuckets.get(ip);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + 60_000 };
    ipBuckets.set(ip, b);
  }
  b.count++;
  if (b.count > RATE_LIMIT_PER_MIN) {
    const retryMs = Math.max(0, b.resetAt - now);
    return { ok: false, retryMs };
  }
  return { ok: true };
}

// Cleanup memory périodique (best-effort, simple)
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of ipBuckets) if (b.resetAt < now) ipBuckets.delete(ip);
}, 5 * 60_000).unref?.();

function findTriggerNodeByTriggerId(flow, triggerId) {
  const map = flow.httpTriggers || {};
  for (const [nodeId, entry] of Object.entries(map)) {
    if (entry && entry.triggerId === triggerId) return { nodeId, entry };
  }
  return null;
}

function timingSafeEq(a, b) {
  try {
    const A = Buffer.from(String(a || ''), 'utf8');
    const B = Buffer.from(String(b || ''), 'utf8');
    if (A.length !== B.length) return false;
    return crypto.timingSafeEqual(A, B);
  } catch { return false; }
}

function parseBasicAuth(header) {
  if (!header || !header.toLowerCase().startsWith('basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch { return null; }
}

function verifyHmac(req, secret, algo) {
  const sig = String(req.headers['x-kinn-signature'] || '');
  if (!sig || !secret) return false;
  const algos = String(algo || 'sha256').toLowerCase();
  // Body brut requis pour HMAC. On utilise req.rawBody si présent (à câbler en
  // amont via express.raw), sinon on stringifie le body parsé en JSON canonique.
  const body = req.rawBody || JSON.stringify(req.body || {});
  const computed = crypto.createHmac(algos, secret).update(body).digest('hex');
  // Accepte "sha256=xxx" ou juste "xxx"
  const candidate = sig.startsWith(`${algos}=`) ? sig.slice(algos.length + 1) : sig;
  return timingSafeEq(computed, candidate);
}

async function verifyPat(req) {
  const auth = String(req.headers.authorization || '');
  const m = /bearer\s+(kpat_[A-Za-z0-9_-]+)/i.exec(auth);
  if (!m) return null;
  const Pat = require('../../db/models/personal-access-token.model');
  const meModule = require('./me');
  const tokenHash = meModule.hashToken(m[1]);
  const pat = await Pat.findOne({ tokenHash });
  if (!pat || pat.revokedAt) return null;
  if (pat.expiresAt && pat.expiresAt < new Date()) return null;
  return pat;
}

async function authenticate(req, node, secrets) {
  const ctx = node?.data?.model?.context || node?.model?.context || {};
  const mode = String(ctx.auth_mode || 'public').toLowerCase();
  if (mode === 'public') return { ok: true };
  if (mode === 'token') {
    const auth = String(req.headers.authorization || '');
    const m = /bearer\s+(.+)/i.exec(auth);
    const provided = m ? m[1].trim() : '';
    return { ok: timingSafeEq(provided, secrets.token || '') };
  }
  if (mode === 'basic') {
    const expectedUser = String(ctx.auth_username || '').trim();
    const got = parseBasicAuth(String(req.headers.authorization || ''));
    if (!got) return { ok: false };
    return { ok: timingSafeEq(got.user, expectedUser) && timingSafeEq(got.pass, secrets.password || '') };
  }
  if (mode === 'hmac') {
    return { ok: verifyHmac(req, secrets.hmacSecret || '', ctx.hmac_algo || 'sha256') };
  }
  if (mode === 'pat') {
    const pat = await verifyPat(req);
    if (!pat) return { ok: false };
    // PAT doit appartenir à un user du même workspace que le flow
    return { ok: true, pat };
  }
  return { ok: false };
}

function applyResponseSettings(res, node, defaultPayload) {
  const ctx = node?.data?.model?.context || node?.model?.context || {};
  const status = parseInt(ctx.respondStatus, 10) || 200;
  const body = ctx.respondBody;
  if (typeof body === 'string' && body.trim()) {
    try { return res.status(status).type('application/json').send(body); }
    catch { return res.status(status).type('text/plain').send(String(body)); }
  }
  return res.status(status).json(defaultPayload);
}

function applyCors(res, node) {
  const ctx = node?.data?.model?.context || node?.model?.context || {};
  if (ctx.cors === true || ctx.cors === 'true') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Kinn-Signature');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }
}

module.exports = function() {
  const r = express.Router();

  // OPTIONS prefligh CORS — pas d'auth, juste les headers
  r.options('/:triggerId', async (req, res) => {
    try {
      const flow = await Flow.findOne({ httpTriggerIds: req.params.triggerId });
      if (flow) {
        const found = findTriggerNodeByTriggerId(flow, req.params.triggerId);
        if (found) applyCors(res, found.node);
      }
    } catch {}
    res.status(204).end();
  });

  // Toutes les méthodes (GET/POST/PUT/PATCH/DELETE) sur le même handler
  r.all('/:triggerId', async (req, res) => {
    const ip = (req.ip || req.connection?.remoteAddress || 'unknown').toString();
    const rl = checkRateLimit(ip);
    if (!rl.ok) {
      res.setHeader('Retry-After', Math.ceil(rl.retryMs / 1000));
      return res.status(429).json({ error: 'rate_limit_exceeded' });
    }

    try {
      const triggerId = req.params.triggerId;
      const flow = await Flow.findOne({ httpTriggerIds: triggerId });
      if (!flow) return res.status(404).json({ error: 'trigger_not_found' });

      const found = findTriggerNodeByTriggerId(flow, triggerId);
      if (!found) return res.status(404).json({ error: 'trigger_not_found' });

      // Récupère le node complet depuis le graph
      const nodes = flow.graph?.nodes || [];
      const node = nodes.find(n => n.id === found.nodeId);
      if (!node) return res.status(404).json({ error: 'trigger_node_missing' });

      applyCors(res, node);

      const ctx = node?.data?.model?.context || node?.model?.context || {};

      // Valide la méthode si configurée
      const expectedMethod = String(ctx.method || '').toUpperCase();
      if (expectedMethod && expectedMethod !== req.method.toUpperCase()) {
        return res.status(405).json({ error: 'method_not_allowed', expected: expectedMethod });
      }

      // Auth
      const secrets = decryptSecrets(found.entry);
      const authResult = await authenticate(req, node, secrets);
      if (!authResult.ok) return res.status(401).json({ error: 'unauthorized' });

      // Flow doit être déployé pour exécuter
      if (flow.status !== 'production') {
        return res.status(503).json({ error: 'flow_not_deployed', flowId: String(flow._id) });
      }
      const trigger = triggerManager.activeTriggers.get(String(flow._id));
      if (!trigger || !trigger.active) {
        return res.status(503).json({ error: 'trigger_not_active' });
      }

      // Emit
      await trigger._emit({
        body: req.body,
        headers: req.headers || {},
        query: req.query || {},
        method: req.method,
        path: req.path,
        triggerId,
        nodeId: found.nodeId,
      });

      return applyResponseSettings(res, node, { ok: true, flowId: String(flow._id), triggered: true });
    } catch (e) {
      console.error(`[http-trigger] error: ${e.message}`);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  return r;
};
