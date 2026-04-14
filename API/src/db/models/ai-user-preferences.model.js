const { Schema, model, Types } = require('mongoose');

const CacheBehaviorSchema = new Schema({
  autoSyncOnIdle: { type: Boolean, default: true },
  idleTtlHours: { type: Number, default: 24 },
  askBeforeSync: { type: Boolean, default: false },
  askBeforeCleanup: { type: Boolean, default: true },
  keepCacheAfterClose: { type: Boolean, default: true },
}, { _id: false });

const PermissionDefaultsSchema = new Schema({
  alwaysAllowSafe: { type: Boolean, default: true },
  autoAllowWriteInProjectScope: { type: Boolean, default: false },
  codeExecutionAllowed: { type: Boolean, default: true },
}, { _id: false });

const CanvasBehaviorSchema = new Schema({
  autoOpenOnDocument: { type: Boolean, default: true },
  autoOpenOnResearch: { type: Boolean, default: true },
  autoOpenOnProjectMode: { type: Boolean, default: true },
  defaultTab: {
    type: String,
    enum: ['document', 'research', 'tasks', 'files', 'none'],
    default: 'none',
  },
}, { _id: false });

const AiUserPreferencesSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', index: true },

  defaultAutonomyLevel: {
    type: String,
    enum: ['prudent', 'balanced', 'autonomous'],
    default: 'autonomous',
  },
  defaultAgentId: { type: String },

  cacheBehavior: { type: CacheBehaviorSchema, default: () => ({}) },
  permissionDefaults: { type: PermissionDefaultsSchema, default: () => ({}) },
  canvasBehavior: { type: CanvasBehaviorSchema, default: () => ({}) },

  webSearchProvider: {
    type: String,
    enum: ['default', 'google', 'bing', 'duckduckgo', 'tavily', 'brave'],
    default: 'default',
  },
}, { timestamps: true });

module.exports = model('AiUserPreferences', AiUserPreferencesSchema);
