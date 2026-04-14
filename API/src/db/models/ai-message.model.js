const { Schema, model, Types } = require('mongoose');

const ToolCallSchema = new Schema({
  id: { type: String },
  name: { type: String },
  args: { type: Schema.Types.Mixed },
  result: { type: Schema.Types.Mixed },
  duration: { type: Number },
  status: { type: String, enum: ['success', 'error', 'running'] },
  displayTitle: { type: String },
  argsSchema: { type: [{ key: String, label: String }], default: undefined },
}, { _id: false });

const QuestionItemSchema = new Schema({
  id: { type: String },
  text: { type: String },
  questionType: { type: String, enum: ['single', 'multi', 'text'] },
  options: [{ label: String, value: String, description: String }],
}, { _id: false });

const QuestionSchema = new Schema({
  text: { type: String },
  questionType: { type: String, enum: ['single', 'multi', 'text', 'batch'] },
  options: [{ label: String, value: String, description: String }],
  questions: { type: [QuestionItemSchema], default: undefined },
}, { _id: false });

const SegmentSchema = new Schema({
  type: { type: String, enum: ['text', 'tools'], required: true },
  content: { type: String },
  toolCalls: { type: [ToolCallSchema], default: undefined },
}, { _id: false });

// ── Permission request metadata ──
const PermissionChoiceSchema = new Schema({
  id: { type: String },
  label: { type: String },
}, { _id: false });

const PermissionScopeSchema = new Schema({
  path: { type: String },
  pattern: { type: String },
}, { _id: false });

const PermissionRequestSchema = new Schema({
  requestId: { type: String },
  toolName: { type: String },
  argsPreview: { type: Schema.Types.Mixed },
  risk: { type: String, enum: ['safe', 'write', 'destructive', 'elevated'] },
  scope: { type: PermissionScopeSchema, default: undefined },
  choices: { type: [PermissionChoiceSchema], default: undefined },
  answer: { type: String },
  answeredAt: { type: Date },
  answeredBy: { type: Types.ObjectId, ref: 'User' },
}, { _id: false });

// ── Cache sync request metadata ──
const PendingFileSchema = new Schema({
  path: { type: String },
  size: { type: Number },
  dirty: { type: Boolean },
}, { _id: false });

const CacheSyncRequestSchema = new Schema({
  pendingFiles: { type: [PendingFileSchema], default: undefined },
  sizeBytes: { type: Number },
  choices: { type: [PermissionChoiceSchema], default: undefined },
  answer: { type: String },
  answeredAt: { type: Date },
}, { _id: false });

const MessageMetadataSchema = new Schema({
  kind: { type: String, enum: ['permission_request', 'cache_sync_request', 'comment', 'system_note'] },
  permissionRequest: { type: PermissionRequestSchema, default: undefined },
  cacheSyncRequest: { type: CacheSyncRequestSchema, default: undefined },
  // Comment author (for shared threads)
  commentBy: { type: Types.ObjectId, ref: 'User' },
  // Free extensions
  extra: { type: Schema.Types.Mixed },
}, { _id: false, strict: false });

const AiMessageSchema = new Schema({
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
  content: { type: String, default: '' },
  toolCalls: { type: [ToolCallSchema], default: undefined },
  segments: { type: [SegmentSchema], default: undefined },
  question: { type: QuestionSchema, default: undefined },
  attachments: { type: [Schema.Types.Mixed], default: undefined },
  answer: { type: Schema.Types.Mixed, default: undefined },
  cancelled: { type: Boolean, default: undefined },
  usage: {
    input: { type: Number },
    output: { type: Number },
  },
  metadata: { type: MessageMetadataSchema, default: undefined },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = model('AiMessage', AiMessageSchema);
