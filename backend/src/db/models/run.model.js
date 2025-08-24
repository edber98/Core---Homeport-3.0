const { Schema, model, Types } = require('mongoose');

const RunEventSchema = new Schema({
  ts: { type: Number, required: true },
  type: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  error: { type: Schema.Types.Mixed },
}, { _id: false, strict: false });

const RunSchema = new Schema({
  flowId: { type: Types.ObjectId, ref: 'Flow', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  status: { type: String, enum: ['running','completed','failed','canceled'], default: 'running' },
  events: { type: [RunEventSchema], default: [] },
  result: { type: Schema.Types.Mixed },
}, { timestamps: true });

module.exports = model('Run', RunSchema);

