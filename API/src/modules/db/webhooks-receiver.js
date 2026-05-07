// Endpoint qui reçoit les webhooks venant d'un Kinn distant.
//
// Flow :
//   1. Kinn distant POST `/api/webhooks/receive/:relayId` avec body JSON +
//      header X-Kinn-Signature: sha256=<hex>
//   2. On lit le body BRUT (Buffer) — c'est CRITIQUE pour HMAC car le body
//      stringifié par JSON.stringify peut différer de l'original (ordre des
//      keys, espaces, etc.)
//   3. On cherche le relais dans le registry en mémoire (kinnWebhookRegistry)
//   4. On vérifie la signature avec le secret du relais
//   5. On parse le JSON et on appelle entry.onEvent(envelope)
//   6. L'adapter relaie au flow via this._emit()
//
// Ce module est monté AVANT express.json dans app.js → le body est un Buffer.

const express = require('express');
const { kinnWebhookRegistry } = require('../../services/triggers/kinn-webhook-registry');

module.exports = function () {
  const r = express.Router();

  // Raw body pour pouvoir vérifier la signature sur les bytes exacts envoyés
  r.use(express.raw({ type: ['application/json', 'application/*+json'], limit: '5mb' }));

  r.post('/:relayId', async (req, res) => {
    const { relayId } = req.params;
    const sig = req.headers['x-kinn-signature'];
    const event = req.headers['x-kinn-event'];
    const delivery = req.headers['x-kinn-delivery'];

    const entry = kinnWebhookRegistry.get(relayId);
    if (!entry) {
      // Relais inconnu (flow undeployed entre temps, ou relayId invalide)
      return res.status(404).json({ ok: false, error: 'relay_not_found' });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ ok: false, error: 'body_not_raw' });
    }
    const bodyJson = req.body.toString('utf8');

    if (!kinnWebhookRegistry.verify(relayId, bodyJson, sig)) {
      console.warn(`[kinn-receiver] bad signature for relay ${relayId} (delivery ${delivery})`);
      return res.status(401).json({ ok: false, error: 'bad_signature' });
    }

    let envelope;
    try {
      envelope = JSON.parse(bodyJson);
    } catch {
      return res.status(400).json({ ok: false, error: 'invalid_json' });
    }

    // Appel async fire-and-forget : le receiver répond 200 immédiatement (max 1s)
    // pour éviter que le dispatcher distant retry inutilement. Les éventuelles
    // erreurs côté flow seront loggées séparément.
    setImmediate(() => {
      entry.onEvent(envelope).catch(e => {
        console.error(`[kinn-receiver] relay ${relayId} onEvent error:`, e?.message);
      });
    });

    res.status(200).json({ ok: true, event, delivery });
  });

  // Endpoint debug : liste les relais actifs (utile en dev)
  r.get('/_debug/list', (req, res) => {
    res.json({ relays: kinnWebhookRegistry.list() });
  });

  return r;
};
