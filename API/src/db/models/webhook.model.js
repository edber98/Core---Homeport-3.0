// Webhooks Kinn — abonnements à des événements internes (run.completed,
// thread.message.created, deployment.changed…). Chaque webhook est un endpoint
// HTTPS appartenant à un workspace ; le dispatcher push les payloads avec
// signature HMAC-SHA256 dans le header X-Kinn-Signature.

const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');
const crypto = require('crypto');

// Liste des events que Kinn peut émettre. Si tu en ajoutes, mets aussi à jour
// le dispatcher (services/webhook-dispatcher.js) et la doc côté plugin.
const WEBHOOK_EVENTS = [
  'run.started',
  'run.completed',
  'run.failed',
  'run.cancelled',
  'thread.message.created',
  'thread.message.updated',
  'deployment.activated',
  'deployment.deactivated',
  'deployment.event',     // relais générique d'un trigger d'un flow déployé
];

const DeliveryStatSchema = new Schema({
  at: { type: Date },
  event: { type: String },
  status: { type: Number },           // HTTP status reçu (200 = ok)
  durationMs: { type: Number },
  error: { type: String },
  attempt: { type: Number, default: 1 },
}, { _id: false });

const WebhookSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },

  // Description / nom donné par l'user (libre)
  name: { type: String, default: '' },
  description: { type: String, default: '' },

  // URL HTTPS cible — le dispatcher POST ici à chaque event matchant
  url: { type: String, required: true },

  // Liste des events auxquels ce webhook est abonné (sous-ensemble de WEBHOOK_EVENTS)
  // Vide = aucun abonnement (équivalent à inactif). [] reset l'abonnement.
  events: { type: [String], default: [] },

  // Filtres optionnels pour réduire le bruit (ex: ne réagir qu'à certains flows)
  filters: {
    flowIds: { type: [String], default: [] },     // si non vide, n'envoie que pour ces flowIds
    threadIds: { type: [String], default: [] },
    runStatuses: { type: [String], default: [] }, // ex: ['failed'] pour ne recevoir que les échecs
  },

  // Secret HMAC partagé avec le receiver. Le dispatcher signe le body avec
  // ce secret → le receiver vérifie la signature pour rejeter les forgeries.
  // Stocké en clair côté serveur Kinn (zone de confiance), affiché à l'user
  // UNIQUEMENT à la création (one-shot dans la modale).
  secret: { type: String, required: true },

  active: { type: Boolean, default: true, index: true },

  // Stats de delivery — mises à jour par le dispatcher
  deliveryCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  lastSentAt: { type: Date },
  lastSuccessAt: { type: Date },
  lastError: { type: String, default: '' },
  // Historique court (50 derniers events) pour debug
  recentDeliveries: { type: [DeliveryStatSchema], default: [] },

  // Auth
  createdBy: { type: Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'webhooks' });

WebhookSchema.pre('save', function preSave(next) {
  if (!this.id) this.id = newId('whk_');
  this.updatedAt = new Date();
  next();
});

WebhookSchema.statics.WEBHOOK_EVENTS = WEBHOOK_EVENTS;

WebhookSchema.statics.generateSecret = function generateSecret() {
  // 32 bytes hex = 256 bits d'entropie, format simple à copier-coller
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Calcule la signature HMAC-SHA256 d'un body JSON pour ce webhook.
 * @param {string} bodyJson - le JSON.stringify(payload) qui sera envoyé
 * @returns {string} signature au format "sha256=<hex>"
 */
WebhookSchema.methods.signBody = function signBody(bodyJson) {
  const h = crypto.createHmac('sha256', this.secret);
  h.update(bodyJson);
  return `sha256=${h.digest('hex')}`;
};

/**
 * Vérifie qu'une signature reçue correspond au body fourni.
 * Constant-time comparison pour éviter les timing attacks.
 * @param {string} bodyJson
 * @param {string} signatureHeader - valeur reçue dans X-Kinn-Signature
 * @returns {boolean}
 */
WebhookSchema.methods.verifySignature = function verifySignature(bodyJson, signatureHeader) {
  if (!signatureHeader) return false;
  const expected = this.signBody(bodyJson);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Indique si ce webhook est concerné par un event donné (event + filtres).
 * @param {string} eventType - ex: "run.completed"
 * @param {object} payload - payload de l'event
 * @returns {boolean}
 */
WebhookSchema.methods.matches = function matches(eventType, payload) {
  if (!this.active) return false;
  if (!Array.isArray(this.events) || !this.events.includes(eventType)) return false;
  const f = this.filters || {};
  if (Array.isArray(f.flowIds) && f.flowIds.length > 0) {
    const flowId = String(payload?.flowId || payload?.flow?.id || '');
    if (!flowId || !f.flowIds.includes(flowId)) return false;
  }
  if (Array.isArray(f.threadIds) && f.threadIds.length > 0) {
    const threadId = String(payload?.threadId || payload?.thread?.id || '');
    if (!threadId || !f.threadIds.includes(threadId)) return false;
  }
  if (Array.isArray(f.runStatuses) && f.runStatuses.length > 0) {
    const status = String(payload?.status || payload?.run?.status || '');
    if (!status || !f.runStatuses.includes(status)) return false;
  }
  return true;
};

module.exports = model('Webhook', WebhookSchema);
module.exports.WEBHOOK_EVENTS = WEBHOOK_EVENTS;
