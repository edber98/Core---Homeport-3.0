const { Schema, model, Types } = require('mongoose');

// Session SSO : 1 session = 1 appareil/onglet pour 1 user.
// Stocke les tokens chiffrés (refresh + access) pour pouvoir refresh sans
// redirect Zitadel + le nonce/state PKCE pour le flow OIDC.
//
// Lifecycle :
//   - Création au callback /api/auth/sso/callback
//   - Mise à jour à chaque /api/auth/sso/refresh
//   - Suppression au logout

const SessionSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  // Tokens chiffrés au repos (utils/enc.js — clef AES depuis HMAC_SECRET)
  refreshTokenEnc: { type: String, default: null },
  accessTokenEnc: { type: String, default: null },
  idTokenEnc: { type: String, default: null },
  // Quand expire l'accessToken (informational, on refresh avant si possible)
  accessTokenExpiresAt: { type: Date, default: null },
  // Empreinte du sub Zitadel pour validation rapide
  zitadelSub: { type: String, default: null, index: true },
  // Snapshot sessionVersion User au moment où la session a été créée
  sessionVersion: { type: Number, default: 0 },
  // Audit / debug
  deviceInfo: { type: String, default: null },
  ipAddress: { type: String, default: null },
  lastUsedAt: { type: Date, default: () => new Date() },
}, { timestamps: true });

module.exports = model('Session', SessionSchema);
