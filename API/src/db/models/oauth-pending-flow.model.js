const { Schema, model, Types } = require('mongoose');

/**
 * Flow OAuth2 en cours, indexé par `nonce`. Remplace l'ancienne Map en mémoire
 * → partagé entre replicas (multi-instance safe) et auto-expiré par Mongo.
 *
 * Le `codeVerifier` PKCE est stocké ICI (serveur) et JAMAIS dans le `state`
 * JWT (qui transite par le navigateur/provider/bouncer en clair signé).
 */
const OAuthPendingFlowSchema = new Schema({
  nonce: { type: String, required: true, unique: true, index: true },
  vendor: { type: String, required: true },
  providerKey: { type: String, required: true },
  providerTitle: { type: String },
  codeVerifier: { type: String, default: null },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true },
  userId: { type: String },
  companyId: { type: String },
  frontendOrigin: { type: String },
  // TTL : Mongo supprime le doc 900s après createdAt (state JWT exp = 600s,
  // marge de 5 min pour retry/refresh navigateur).
  createdAt: { type: Date, default: Date.now, expires: 900 },
}, { versionKey: false });

module.exports = model('OAuthPendingFlow', OAuthPendingFlowSchema);
