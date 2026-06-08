// panel-credits/index.js — Helper pour appeler le système de crédits du Panel
// Kinn depuis kinn-app. Signe les requêtes en HMAC partagé (KINN_PANEL_HMAC_SECRET)
// et gère le mode DEV STANDALONE qui no-op tous les appels pour le développement
// local sans dépendance au Panel.
//
// ══════════════════════════════════════════════════════════════════════════
// MODE DE FONCTIONNEMENT
// ══════════════════════════════════════════════════════════════════════════
//
//   1. PRODUCTION (Panel branché)
//      KINN_PANEL_CREDITS_ENABLED=true
//      KINN_PANEL_INTERNAL_URL=https://api.kinn.fr
//      KINN_PANEL_HMAC_SECRET=<shared secret>
//      KINN_PANEL_APP_ID=<ObjectId Application Panel>
//      KINN_PANEL_CLIENT_ID=<ObjectId ClientAccount Panel>
//
//      → Tous les appels frappent le Panel.
//      → Échecs réseau gérés selon KINN_PANEL_CREDITS_FAIL_OPEN.
//
//   2. DEV STANDALONE (DÉFAUT)
//      KINN_PANEL_CREDITS_ENABLED absent ou ≠ 'true'
//
//      → AUCUN appel réseau.
//      → Mock cohérent : solde virtuel illimité, debit=0 crédit.
//      → Idéal pour développement local sans Panel.
//
//   3. FAIL-OPEN
//      KINN_PANEL_CREDITS_FAIL_OPEN=true
//      → En cas d'erreur réseau, log + retourne mock OK.
// ══════════════════════════════════════════════════════════════════════════

const crypto = require('crypto');

const CFG = {
  enabled:    process.env.KINN_PANEL_CREDITS_ENABLED === 'true',
  url:        (process.env.KINN_PANEL_INTERNAL_URL || '').replace(/\/+$/, ''),
  secret:     process.env.KINN_PANEL_HMAC_SECRET || '',
  appId:      process.env.KINN_PANEL_APP_ID || '',
  clientId:   process.env.KINN_PANEL_CLIENT_ID || '',
  failOpen:   process.env.KINN_PANEL_CREDITS_FAIL_OPEN === 'true',
  timeoutMs:  Number(process.env.KINN_PANEL_CREDITS_TIMEOUT_MS || 3000)
};

const MOCK_BALANCE = { included: 99999, recharged: 0, total: 99999 };

let _bootLogged = false;
function logBootOnce() {
  if (_bootLogged) return;
  _bootLogged = true;
  if (!CFG.enabled) {
    console.warn('[panel-credits] DEV MODE — KINN_PANEL_CREDITS_ENABLED!=true, all calls are no-op mocks');
    return;
  }
  if (!CFG.url || !CFG.secret) {
    console.error('[panel-credits] enabled=true but URL or SECRET missing — falling back to mock mode');
    return;
  }
  console.log(`[panel-credits] ENABLED · url=${CFG.url} · appId=${CFG.appId} · failOpen=${CFG.failOpen}`);
}

function isEnabled() {
  logBootOnce();
  return CFG.enabled && CFG.url && CFG.secret;
}

function getConfig() { return { ...CFG, secret: CFG.secret ? '***' : '' }; }

function sign({ method, path, body }) {
  const ts = Math.floor(Date.now() / 1000);
  const rawBody = body ? JSON.stringify(body) : '';
  // CRITIQUE : on signe SANS la query string pour matcher le middleware Panel
  // (`req.originalUrl.split('?')[0]`). Si on inclut la query, le canonical
  // diverge dès qu'il y a un userId / param supplémentaire → 401 garanti.
  const pathNoQuery = String(path || '').split('?')[0];
  const canonical = `${method}\n${pathNoQuery}\n${ts}\n${rawBody}`;
  const sig = crypto.createHmac('sha256', CFG.secret).update(canonical, 'utf8').digest('hex');
  return {
    'X-Kinn-Panel-Signature': `sha256=${sig}`,
    'X-Kinn-Panel-Timestamp': String(ts),
    'Content-Type': 'application/json'
  };
}

async function panelCall(method, path, body = null) {
  if (!isEnabled()) {
    return { ok: true, mocked: true, _mockReason: 'panel-credits-dev-mode' };
  }
  const fullUrl = `${CFG.url}${path}`;
  const headers = sign({ method, path, body });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CFG.timeoutMs);
  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    // Lecture du body en texte d'abord pour pouvoir le logger en cas de JSON
    // invalide (cas typique : un ingress/proxy intermédiaire renvoie du HTML
    // ou un 200 vide → res.json() throw silencieusement et on perd la trace).
    const rawText = await res.text().catch(() => '');
    let json = null;
    try { json = rawText ? JSON.parse(rawText) : null; } catch { /* not JSON */ }
    // Log structuré obligatoire : status + content-type + taille body + json valide ?
    // Permet de détecter immédiatement un ingress qui répond à la place du backend.
    const ct = res.headers.get('content-type') || '';
    const isJson = json !== null;
    console.log(`[panel-credits] ${method} ${fullUrl} → HTTP ${res.status} ct=${ct} bytes=${rawText.length} json=${isJson}`);
    if (!isJson && rawText) {
      // Dump les 300 premiers chars du body non-JSON pour identifier l'expéditeur
      // réel (ex: nginx default page, "404 Not Found", HTML d'erreur, etc.)
      console.warn(`[panel-credits] non-JSON body (likely intercepted by proxy/ingress): ${rawText.slice(0, 300)}`);
    }
    if (!res.ok) {
      const err = new Error(json?.error?.code || `panel_http_${res.status}`);
      err.status = res.status;
      err.body = json || rawText.slice(0, 300);
      throw err;
    }
    // Si HTTP 200 mais pas de JSON → c'est suspect : on throw plutôt que retourner null
    // (sinon le badge frontend affiche « Aucun wallet provisionné » alors que
    // le vrai problème est que la requête n'arrive PAS au backend Panel).
    if (!isJson) {
      const err = new Error('panel_returned_non_json');
      err.status = res.status;
      err.body = rawText.slice(0, 300);
      throw err;
    }
    return json;
  } catch (e) {
    // Log toujours en warn (même hors fail-open) : sinon impossible de
    // diagnostiquer pourquoi le badge frontend dit « Impossible de
    // récupérer le solde ». L'appelant peut décider de re-throw ou pas.
    const status = e?.status ? ` [HTTP ${e.status}]` : '';
    const bodyHint = e?.body ? ` body=${typeof e.body === 'string' ? e.body.slice(0, 200) : JSON.stringify(e.body).slice(0, 200)}` : '';
    console.warn(`[panel-credits] call failed: ${method} ${fullUrl}${status} — ${e?.message || e}${bodyHint}`);
    if (CFG.failOpen) {
      return { ok: true, mocked: true, _mockReason: 'panel-credits-fail-open', _error: String(e?.message || e) };
    }
    throw e;
  } finally { clearTimeout(timer); }
}

async function getBalance({ userId = null } = {}) {
  if (!isEnabled()) {
    return { ok: true, mocked: true, balance: MOCK_BALANCE, exists: true, currency: 'EUR' };
  }
  const qs = new URLSearchParams({ clientId: CFG.clientId, applicationId: CFG.appId, ...(userId ? { userId: String(userId) } : {}) });
  return panelCall('GET', `/internal/credits/balance?${qs.toString()}`);
}

async function checkCredits({ userId = null, input }) {
  if (!isEnabled()) return { ok: true, mocked: true, sufficient: true, estimated: { credits: 0, costEur: 0 } };
  return panelCall('POST', '/internal/credits/check', {
    clientId: CFG.clientId, applicationId: CFG.appId, userId, input
  });
}

async function debit({ userId, idempotencyKey, input, context = null }) {
  if (!isEnabled()) {
    return {
      ok: true, mocked: true,
      debited: { credits: 0, costEur: 0 },
      balance: MOCK_BALANCE,
      ledgerId: null
    };
  }
  if (!idempotencyKey) throw new Error('panel-credits.debit: idempotencyKey required');
  return panelCall('POST', '/internal/credits/debit', {
    clientId: CFG.clientId, applicationId: CFG.appId, userId, idempotencyKey, input, context
  });
}

async function refund({ originalLedgerId, refundedCredits, idempotencyKey, notes = '' }) {
  if (!isEnabled()) return { ok: true, mocked: true, balance: MOCK_BALANCE };
  if (!idempotencyKey) throw new Error('panel-credits.refund: idempotencyKey required');
  return panelCall('POST', '/internal/credits/refund', {
    clientId: CFG.clientId, applicationId: CFG.appId,
    originalLedgerId, refundedCredits, idempotencyKey, notes
  });
}

async function getCatalog() {
  if (!isEnabled()) {
    return {
      ok: true, mocked: true, method: 'token_based',
      models: [
        { key: 'anthropic:claude-opus-4-7', provider: 'anthropic', modelId: 'claude-opus-4-7', displayName: 'Claude Opus 4.7 (mock)', kind: 'llm' }
      ]
    };
  }
  const qs = new URLSearchParams({ applicationId: CFG.appId });
  return panelCall('GET', `/internal/credits/catalog?${qs.toString()}`);
}

async function getConversationCost(conversationId) {
  if (!isEnabled()) return { ok: true, mocked: true, totalCredits: 0, totalCostEur: 0, eventCount: 0 };
  const qs = new URLSearchParams({ clientId: CFG.clientId, applicationId: CFG.appId, conversationId });
  return panelCall('GET', `/internal/credits/conversation-cost?${qs.toString()}`);
}

async function getUserQuota(userId) {
  if (!isEnabled()) return { ok: true, mocked: true, userQuota: null };
  const qs = new URLSearchParams({ clientId: CFG.clientId, applicationId: CFG.appId });
  return panelCall('GET', `/internal/credits/quota/${encodeURIComponent(userId)}?${qs.toString()}`);
}

async function setUserQuota({ userId, monthlyMax, setBy }) {
  if (!isEnabled()) return { ok: true, mocked: true };
  return panelCall('POST', `/internal/credits/quota/${encodeURIComponent(userId)}`, {
    clientId: CFG.clientId, applicationId: CFG.appId, monthlyMax, setBy
  });
}

async function pingPanel() {
  if (!isEnabled()) return { ok: true, mocked: true };
  try {
    return await panelCall('GET', '/internal/credits/health');
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

module.exports = {
  isEnabled, getConfig,
  getBalance, checkCredits, debit, refund,
  getCatalog, getConversationCost,
  getUserQuota, setUserQuota,
  pingPanel
};
// Default export pour symétrie ESM consumers
module.exports.default = module.exports;
