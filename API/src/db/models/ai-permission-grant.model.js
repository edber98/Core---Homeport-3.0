const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const AiPermissionGrantSchema = new Schema({
  id: { type: String, unique: true, index: true, sparse: true },
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  jobId: { type: String },

  scope: {
    type: String,
    enum: ['tool', 'tool+path', 'tool+pattern', 'tool+workspace'],
    default: 'tool',
  },
  toolName: { type: String, required: true },
  pathPattern: { type: String, default: '' },

  decision: {
    type: String,
    enum: ['allow_once', 'allow_session', 'allow_always', 'deny_once', 'deny_always'],
    required: true,
  },
  riskLevel: {
    type: String,
    enum: ['safe', 'write', 'destructive', 'elevated'],
    default: 'write',
  },

  decidedBy: { type: Types.ObjectId, ref: 'User' },
  decidedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  ttl: { type: Number },
}, { timestamps: true });

AiPermissionGrantSchema.pre('save', function (next) {
  if (!this.id) this.id = newId('aipg');
  next();
});

// Composite index to quickly find matching grants
AiPermissionGrantSchema.index(
  { threadId: 1, toolName: 1, pathPattern: 1, scope: 1 },
  { unique: true }
);

module.exports = model('AiPermissionGrant', AiPermissionGrantSchema);
