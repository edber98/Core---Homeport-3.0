const { Schema, model, Types } = require('mongoose');

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  // Identité (synced depuis claims SSO : given_name, family_name, name)
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  name: { type: String, default: null }, // fallback display (Zitadel claim `name`)
  // Optionnel : null pour les users SSO-only sans password local
  pwdHash: { type: String, default: null },
  // Rôles 3-tiers (était admin/user, étendu pour aligner avec Zitadel project roles)
  role: { type: String, enum: ['admin','editor','viewer'], default: 'editor' },
  // Override local en cas d'urgence (Zitadel down, lockout, etc.).
  // Au sync login, on touche role mais PAS localPromotion. Effective = localPromotion || role.
  localPromotion: { type: String, enum: ['admin','editor','viewer', null], default: null },
  localPromotionBy: { type: Types.ObjectId, ref: 'User', default: null },
  localPromotionAt: { type: Date, default: null },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  defaultWorkspaceId: { type: Types.ObjectId, ref: 'Workspace', default: null },
  // Champs Zitadel SSO (null pour users locaux)
  zitadelSub: { type: String, default: null, index: true, sparse: true },
  // Source claims Zitadel (User Metadata posée par Kinn-panel) — sync à chaque login
  kind: { type: String, default: 'client_user' },
  groups: { type: [String], default: [] },
  // Bypass SSO pour comptes break-glass (ex: system@kinn.local)
  bypassSSO: { type: Boolean, default: false },
  // Incrémenté pour invalider toutes les sessions actives (logout global, révocation Zitadel push)
  sessionVersion: { type: Number, default: 0 },
}, { timestamps: true });

// Helper : rôle effectif (localPromotion override le role synced de Zitadel)
UserSchema.methods.effectiveRole = function() {
  return this.localPromotion || this.role;
};

module.exports = model('User', UserSchema);

