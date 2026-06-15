const { Schema, model, Types } = require('mongoose');

const ProviderSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  title: { type: String },
  iconClass: { type: String },
  iconUrl: { type: String },
  color: { type: String },
  tags: { type: [String], default: [] },
  categories: { type: [String], default: [] },
  order: { type: Number },
  enabled: { type: Boolean, default: true },
  hasCredentials: { type: Boolean, default: false },
  allowWithoutCredentials: { type: Boolean, default: false },
  credentialsForm: { type: Schema.Types.Mixed },
  // Config d'authentification managée (ex: OAuth2). { type:'oauth2', oauth2:{ vendor, useBouncer, authorizeUrl, ... } }
  auth: { type: Schema.Types.Mixed },
  // Blocs radar (familles + capacités + watch) — tableau normalisé, voir radar/families.js
  radar: { type: Schema.Types.Mixed },
  checksum: { type: String },
  // Origin repo (optional)
  repoId: { type: Types.ObjectId, ref: 'PluginRepo', index: true },
  repoName: { type: String },
  // Multiple repos may contribute the same provider
  repos: { type: [Types.ObjectId], ref: 'PluginRepo', index: true, default: [] },
  repoNames: { type: [String], default: [] },
}, { timestamps: true });

module.exports = model('Provider', ProviderSchema);
