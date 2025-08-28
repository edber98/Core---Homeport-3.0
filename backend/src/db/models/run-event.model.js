const { Schema, model, Types } = require('mongoose');

// LiveEvent store for run replay
// type: one of run.status | node.status | node.progress | node.result | node.error | log
const RunEventSchema = new Schema({
  seq: { type: Number, required: true },
  type: { type: String, required: true, index: true },
  runId: { type: Types.ObjectId, ref: 'Run', required: true, index: true },
  nodeId: { type: String },
  attemptId: { type: Types.ObjectId, ref: 'Attempt' },
  exec: { type: Number }, // attempt number for the node
  branchId: { type: String },
  level: { type: String }, // for log events
  data: { type: Schema.Types.Mixed },
  ts: { type: Date, default: () => new Date(), index: true },
}, { timestamps: false });

RunEventSchema.index({ runId: 1, seq: 1 }, { unique: true });

module.exports = model('RunEvent', RunEventSchema);
