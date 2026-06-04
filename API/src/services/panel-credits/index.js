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
  const canonical = `${method}\n${path}\n${ts}\n${rawBody}`;
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
  const headers = sign({ method, path, body });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CFG.timeoutMs);
  try {
    const res = await fetch(`${CFG.url}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(json?.error?.code || `panel_http_${res.status}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  } catch (e) {
    if (CFG.failOpen) {
      console.warn(`[panel-credits] fail-open: ${e?.message || e}`);
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
