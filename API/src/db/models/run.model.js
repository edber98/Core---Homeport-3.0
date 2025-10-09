const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const RunEventSchema = new Schema({
  ts: { type: Number, required: true },
  type: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  error: { type: Schema.Types.Mixed },
}, { _id: false, strict: false, suppressReservedKeysWarning: true });

const AttemptSchema = new Schema({
  runId: { type: String },
  nodeId: { type: String, required: true },
  attempt: { type: Number, default: 1 },
  kind: { type: String },
  templateKey: { type: String },
  templateRaw: { type: String },
  status: { type: String, enum: ['pending','running','success','error','skipped','blocked','timed_out'], default: 'running' },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  durationMs: { type: Number },
  argsPre: { type: Schema.Types.Mixed },
  argsPost: { type: Schema.Types.Mixed },
  input: { type: Schema.Types.Mixed },
  result: { type: Schema.Types.Mixed },
  attemptErrors: { type: [Schema.Types.Mixed], default: [] },
}, { _id: false, strict: false });

const RunSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  flowId: { type: Types.ObjectId, ref: 'Flow', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  status: { type: String, enum: ['queued','running','success','error','cancelled','timed_out','partial_success'], default: 'running', index: true },
  events: { type: [RunEventSchema], default: [] },
  result: { type: Schema.Types.Mixed },
  finalPayload: { type: Schema.Types.Mixed },
  startedAt: { type: Date, default: () => new Date() },
  finishedAt: { type: Date },
  durationMs: { type: Number },
  msg: { type: Schema.Types.Mixed },
  attempts: { type: [AttemptSchema], default: [] },
}, { timestamps: true, suppressReservedKeysWarning: true });

RunSchema.index({ workspaceId: 1, createdAt: -1 });
RunSchema.index({ flowId: 1, createdAt: -1 });
RunSchema.pre('save', function(next){ if (!this.id) this.id = newId('run'); next(); });

module.exports = model('Run', RunSchema);
