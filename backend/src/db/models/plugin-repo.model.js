const { Schema, model, Types } = require('mongoose');

const PluginRepoSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['local','git','http'], default: 'local' },
  path: { type: String },
  url: { type: String },
  branch: { type: String },
  companyId: { type: Types.ObjectId, ref: 'Company' },
  enabled: { type: Boolean, default: true },
  lastSyncAt: { type: Date },
  status: { type: String },
  checksum: { type: String },
}, { timestamps: true });

module.exports = model('PluginRepo', PluginRepoSchema);

