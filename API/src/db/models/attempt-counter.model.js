const { Schema, model, Types } = require('mongoose');

const AttemptCounterSchema = new Schema({
  runId: { type: Types.ObjectId, ref: 'Run', required: true, index: true },
  nodeId: { type: String, required: true, index: true },
  seq: { type: Number, default: 0 },
}, { timestamps: false });

AttemptCounterSchema.index({ runId: 1, nodeId: 1 }, { unique: true });

module.exports = model('AttemptCounter', AttemptCounterSchema);

