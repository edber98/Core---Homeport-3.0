const { Schema, model, Types } = require('mongoose');

const PluginImportHistorySchema = new Schema({
  kind: { type: String, enum: ['provider','template'], required: true },
  key: { type: String, required: true },
  action: { type: String, enum: ['created','updated','skipped'], required: true },
  beforeChecksum: { type: String },
  afterChecksum: { type: String },
  manifestPath: { type: String },
  repoId: { type: Types.ObjectId, ref: 'PluginRepo' },
  repoName: { type: String },
}, { timestamps: true });

module.exports = model('PluginImportHistory', PluginImportHistorySchema);

