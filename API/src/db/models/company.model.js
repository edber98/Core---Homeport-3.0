const { Schema, model } = require('mongoose');

const CompanySchema = new Schema({
  name: { type: String, required: true, index: true },
  // Identifiant org Zitadel (1 Company Kinn = 1 org Zitadel) — set par Kinn-panel
  // au provisioning. Indexé pour lookup au login SSO si besoin (fallback,
  // sinon on utilise claims.kinn_client_id directement).
  zitadelOrgId: { type: String, default: null, index: true, sparse: true },
}, { timestamps: true });

module.exports = model('Company', CompanySchema);
