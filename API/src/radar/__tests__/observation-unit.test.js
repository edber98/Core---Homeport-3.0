// Tests unitaires (sans DB) des parties pures de l'observation :
// extraction/normalisation des entités du collecteur, et politique
// d'échéance/backoff/fenêtre calme du scheduler.

const test = require('node:test');
const assert = require('node:assert/strict');

const { extractItems, normalizeEntity, diffChangedFields } = require('../collector');
const { isDue, effectiveIntervalMs, isInQuietHours, quietWindowStart, DEFAULT_INTERVALS_MS } = require('../scheduler');

// --- collector (pur) ---

test('extractItems : itemsField explicite, sinon premier tableau d\'objets', () => {
  const items = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(extractItems({ ok: true, invoices: items }, { itemsField: 'invoices' }), items);
  assert.deepEqual(extractItems({ ok: true, totalCount: 2, files: items }, {}), items);
  assert.deepEqual(extractItems({ ok: true, files: [] }, {}), []);
  assert.deepEqual(extractItems({ ok: true }, {}), []);
  assert.deepEqual(extractItems(null, {}), []);
  // itemsField pointant vers autre chose qu'un tableau → vide
  assert.deepEqual(extractItems({ ok: true, invoices: 'oops' }, { itemsField: 'invoices' }), []);
  // tableau de non-objets ignoré
  assert.deepEqual(extractItems({ ok: true, tags: ['a', 'b'], rows: items }, {}), items);
});

test('normalizeEntity : clé stable + hash limité aux hashFields', () => {
  const spec = { key: 'id', hashFields: ['state', 'amount'] };
  const a = normalizeEntity({ id: 7, state: 'draft', amount: 100, partner: 'ABC' }, spec);
  assert.equal(a.entityKey, '7');
  // un champ hors hashFields ne change pas le hash
  const b = normalizeEntity({ id: 7, state: 'draft', amount: 100, partner: 'XYZ' }, spec);
  assert.equal(a.contentHash, b.contentHash);
  // un hashField qui change → hash différent
  const c = normalizeEntity({ id: 7, state: 'posted', amount: 100 }, spec);
  assert.notEqual(a.contentHash, c.contentHash);
  // sans hashFields → l'entité entière compte
  const d1 = normalizeEntity({ id: 7, x: 1 }, { key: 'id' });
  const d2 = normalizeEntity({ id: 7, x: 2 }, { key: 'id' });
  assert.notEqual(d1.contentHash, d2.contentHash);
  // clé manquante → null
  assert.equal(normalizeEntity({ state: 'draft' }, spec), null);
  assert.equal(normalizeEntity({ id: '' }, spec), null);
});

test('diffChangedFields : liste les hashFields modifiés', () => {
  const before = { state: 'draft', amount: 100, partner: 'ABC' };
  const after = { state: 'posted', amount: 100, partner: 'XYZ' };
  assert.deepEqual(diffChangedFields(before, after, ['state', 'amount']), ['state']);
  assert.deepEqual(diffChangedFields(before, after, ['amount']), []);
  assert.equal(diffChangedFields(before, after, undefined), undefined);
});

// --- scheduler (pur) ---

function conn(over = {}) {
  return { status: 'active', family: 'email', pollingPolicy: {}, health: {}, ...over };
}

test('effectiveIntervalMs : politique connecteur > défaut famille, backoff exponentiel borné', () => {
  assert.equal(effectiveIntervalMs(conn()), DEFAULT_INTERVALS_MS.email);
  assert.equal(effectiveIntervalMs(conn({ pollingPolicy: { intervalMs: 5000 } })), 5000);
  assert.equal(effectiveIntervalMs(conn({ pollingPolicy: { intervalMs: 5000 }, health: { consecutiveErrors: 3 } })), 40000);
  assert.equal(effectiveIntervalMs(conn({ pollingPolicy: { intervalMs: 5000 }, health: { consecutiveErrors: 99 } })), 5000 * 32);
  assert.equal(effectiveIntervalMs(conn({ family: 'famille_inconnue' })), 15 * 60_000);
});

test('isDue : baseline immédiate, puis selon intervalle', () => {
  const now = new Date('2026-06-11T10:00:00');
  assert.equal(isDue(conn(), now), true); // jamais pollé
  assert.equal(isDue(conn({ lastPollAt: new Date('2026-06-11T09:59:00') }), now), false); // email = 3 min
  assert.equal(isDue(conn({ lastPollAt: new Date('2026-06-11T09:56:00') }), now), true);
});

test('isDue : paused/verrouillé/rate-limited jamais dus', () => {
  const now = new Date('2026-06-11T10:00:00');
  assert.equal(isDue(conn({ status: 'paused' }), now), false);
  assert.equal(isDue(conn({ lockedUntil: new Date('2026-06-11T10:01:00') }), now), false);
  assert.equal(isDue(conn({ health: { rateLimitedUntil: new Date('2026-06-11T10:10:00') } }), now), false);
  // verrou expiré → de nouveau éligible
  assert.equal(isDue(conn({ lockedUntil: new Date('2026-06-11T09:00:00') }), now), true);
});

test('isDue : statut error réessayé avec backoff', () => {
  const now = new Date('2026-06-11T10:00:00');
  const c = conn({ status: 'error', pollingPolicy: { intervalMs: 60_000 }, health: { consecutiveErrors: 2 }, lastPollAt: new Date('2026-06-11T09:57:00') });
  assert.equal(isDue(c, now), false); // 60s × 4 = 4 min de backoff
  c.lastPollAt = new Date('2026-06-11T09:55:00');
  assert.equal(isDue(c, now), true);
});

test('isInQuietHours : fenêtre simple et fenêtre passant minuit', () => {
  assert.equal(isInQuietHours(new Date('2026-06-11T03:00:00'), [2, 5]), true);
  assert.equal(isInQuietHours(new Date('2026-06-11T05:00:00'), [2, 5]), false);
  assert.equal(isInQuietHours(new Date('2026-06-11T23:30:00'), [22, 6]), true);
  assert.equal(isInQuietHours(new Date('2026-06-11T03:00:00'), [22, 6]), true);
  assert.equal(isInQuietHours(new Date('2026-06-11T12:00:00'), [22, 6]), false);
  assert.equal(isInQuietHours(new Date('2026-06-11T03:00:00'), null), false);
  assert.equal(isInQuietHours(new Date('2026-06-11T03:00:00'), [3, 3]), false);
});

test('isDue en fenêtre calme : seulement la collecte nocturne, une fois par nuit', () => {
  const now = new Date('2026-06-11T03:00:00');
  const base = { status: 'active', family: 'email', health: {}, lastPollAt: new Date('2026-06-10T20:00:00') };
  // nightlyFull (défaut) : due si pas encore de full sync cette nuit
  assert.equal(isDue({ ...base, pollingPolicy: { quietHours: [2, 5] } }, now), true);
  // déjà synchronisé cette nuit → plus dû
  assert.equal(isDue({ ...base, pollingPolicy: { quietHours: [2, 5] }, lastFullSyncAt: new Date('2026-06-11T02:10:00') }, now), false);
  // full sync d'hier → dû à nouveau
  assert.equal(isDue({ ...base, pollingPolicy: { quietHours: [2, 5] }, lastFullSyncAt: new Date('2026-06-10T02:30:00') }, now), true);
  // nightlyFull désactivé → jamais dû dans la fenêtre
  assert.equal(isDue({ ...base, pollingPolicy: { quietHours: [2, 5], nightlyFull: false } }, now), false);
});

test('quietWindowStart : gère la fenêtre entamée la veille', () => {
  assert.equal(quietWindowStart(new Date('2026-06-11T03:00:00'), [2, 5]).getTime(), new Date('2026-06-11T02:00:00').getTime());
  assert.equal(quietWindowStart(new Date('2026-06-11T23:30:00'), [22, 6]).getTime(), new Date('2026-06-11T22:00:00').getTime());
  assert.equal(quietWindowStart(new Date('2026-06-11T03:00:00'), [22, 6]).getTime(), new Date('2026-06-10T22:00:00').getTime());
});
