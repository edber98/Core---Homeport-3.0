const { Schema, model, Types } = require('mongoose');

// PAT = Personal Access Token. Le token clair est généré une seule fois et
// retourné au user, on stocke seulement le hash SHA-256 + un préfixe affichable.
const PatSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  prefix: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, index: true },
  scopes: { type: [String], default: [] },
  lastUsedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = model('PersonalAccessToken', PatSchema);
