const { Schema, model, Types } = require('mongoose');

const AttemptSchema = new Schema({
  runId: { type: Types.ObjectId, ref: 'Run', required: true, index: true },
  nodeId: { type: String, required: true, index: true },
  attempt: { type: Number, required: true, index: true },
  branchId: { type: String, index: true },
  kind: { type: String },
  templateKey: { type: String },
  templateRaw: { type: String },
  status: { type: String, enum: ['pending','running','success','error','skipped','blocked','timed_out'], default: 'running', index: true },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  durationMs: { type: Number },
  argsPre: { type: Schema.Types.Mixed },
  argsPost: { type: Schema.Types.Mixed },
  input: { type: Schema.Types.Mixed },
  msgIn: { type: Schema.Types.Mixed },
  msgOut: { type: Schema.Types.Mixed },
  result: { type: Schema.Types.Mixed },
  attemptErrors: { type: [Schema.Types.Mixed], default: [] },
}, { timestamps: true, suppressReservedKeysWarning: true });

AttemptSchema.index({ runId: 1, nodeId: 1, attempt: 1 }, { unique: true });

module.exports = model('Attempt', AttemptSchema);
