const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const SharedWithEntrySchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  permission: { type: String, enum: ['view', 'comment', 'edit'], default: 'view' },
  addedBy: { type: Types.ObjectId, ref: 'User' },
  addedAt: { type: Date, default: Date.now },
  notificationSent: { type: Boolean, default: false },
}, { _id: false });

const AiThreadSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  // Owner of the thread (usually == userId at creation time, but kept separate for sharing semantics)
  ownerId: { type: Types.ObjectId, ref: 'User', index: true },
  mode: { type: String, enum: ['chat', 'workflow', 'node_args', 'form', 'onboarding', 'project'], default: 'chat' },
  title: { type: String, default: 'Chat' },
  flowId: { type: Types.ObjectId, ref: 'Flow', index: true },
  nodeId: { type: String },
  agentId: { type: String },
  // Sharing
  visibility: { type: String, enum: ['private', 'shared'], default: 'private' },
  sharedWith: { type: [SharedWithEntrySchema], default: [] },
  sharedWithRoles: { type: [String], default: [] },
  // Free-form metadata bag. Known optional fields (not enforced as subschema to preserve flexibility):
  //   - projectRoot: { connectorType, credentialId, rootPath, label } (lightweight mirror of AiProjectRoot)
  //   - preferencesOverride: partial AiUserPreferences overrides for this thread
  //   - typingLock: { userId, acquiredAt, ttl }
  //   - formId, flowShortId, formShortId, graph, schema, branch, autonomyLevel, etc.
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

AiThreadSchema.pre('save', function (next) {
  if (!this.id) this.id = newId('ait');
  if (!this.ownerId && this.userId) this.ownerId = this.userId;
  next();
});

AiThreadSchema.index({ ownerId: 1, workspaceId: 1 });
AiThreadSchema.index({ 'sharedWith.userId': 1, workspaceId: 1 });

module.exports = model('AiThread', AiThreadSchema);
