// Registry en mémoire des relais Kinn webhook actifs.
// Sert de pont entre :
//   - L'adapter (KinnWebhookAdapter) qui s'enregistre au start du flow déployé
//   - La route receiver (POST /api/webhooks/receive/:relayId) qui reçoit les
//     pushs de Kinn distant et doit invoquer le bon callback
//
// Le registry est en mémoire process — donc reset au restart de l'API. Au
// restart, les flows déployés sont ré-démarrés (cf. trigger-manager bootstrap),
// ce qui reconstruit les entrées du registry. Pas besoin de persistence.

const crypto = require('crypto');

class KinnWebhookRegistry {
  constructor() {
    this._entries = new Map(); // relayId → { secret, onEvent, flowLabel, events }
  }

  /**
   * Enregistre un nouveau relais. Retourne une fonction d'unregister.
   * @param {string} relayId
   * @param {object} entry - { secret, onEvent, flowLabel, events }
   * @returns {Function} unregister
   */
  register(relayId, entry) {
    if (!relayId || typeof relayId !== 'string') throw new Error('relayId invalide');
    if (!entry || typeof entry.onEvent !== 'function') throw new Error('onEvent callback requis');
    if (!entry.secret) throw new Error('secret requis');
    this._entries.set(relayId, entry);
    return () => { this._entries.delete(relayId); };
  }

  /** Récupère un relais par son id (ou undefined si absent). */
  get(relayId) {
    return this._entries.get(relayId);
  }

  /** Liste les relais actifs (debug). */
  list() {
    return [...this._entries.entries()].map(([id, e]) => ({
      relayId: id,
      flowLabel: e.flowLabel,
      events: e.events,
    }));
  }

  /**
   * Vérifie une signature HMAC-SHA256 contre le secret du relais.
   * @param {string} relayId
   * @param {string} bodyJson - body brut reçu (string, pas parsé)
   * @param {string} signatureHeader - X-Kinn-Signature reçu
   * @returns {boolean}
   */
  verify(relayId, bodyJson, signatureHeader) {
    const entry = this._entries.get(relayId);
    if (!entry) return false;
    if (!signatureHeader) return false;
    const expected = `sha256=${crypto.createHmac('sha256', entry.secret).update(bodyJson).digest('hex')}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signatureHeader));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}

const kinnWebhookRegistry = new KinnWebhookRegistry();

module.exports = { kinnWebhookRegistry, KinnWebhookRegistry };
