const { Schema, model, Types } = require('mongoose');

const CachedFileSchema = new Schema({
  relativePath: { type: String, required: true },
  sha256: { type: String },
  size: { type: Number, default: 0 },
  contentType: { type: String },
  downloadedAt: { type: Date, default: Date.now },
  dirty: { type: Boolean, default: false },
  syncedAt: { type: Date },
  remoteEtag: { type: String },
  remoteMtime: { type: Date },
}, { _id: false });

const AiProjectCacheSchema = new Schema({
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, unique: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  cacheRoot: { type: String, default: '' },
  sizeBytes: { type: Number, default: 0 },
  files: { type: [CachedFileSchema], default: [] },
  lastAccessedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  sticky: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('AiProjectCache', AiProjectCacheSchema);
