const { Schema, model, Types } = require('mongoose');

const PluginRepoSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['local','git','http'], default: 'local' },
  gitAuth: { type: String, enum: ['ssh','http','token','basic'], default: 'token' },
  path: { type: String },
  url: { type: String },
  branch: { type: String },
  gitUsername: { type: String },
  gitSecret: { type: Schema.Types.Mixed },
  companyId: { type: Types.ObjectId, ref: 'Company' },
  enabled: { type: Boolean, default: true },
  lastSyncAt: { type: Date },
  status: { type: String },
  checksum: { type: String },
}, { timestamps: true });

module.exports = model('PluginRepo', PluginRepoSchema);
