const { Schema, model, Types } = require('mongoose');

const GraphSchema = new Schema({
  nodes: { type: Schema.Types.Mixed, default: [] },
  edges: { type: Schema.Types.Mixed, default: [] },
}, { _id: false, strict: false });

const FlowSchema = new Schema({
  name: { type: String, required: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  status: { type: String, enum: ['draft','test','production'], default: 'draft' },
  enabled: { type: Boolean, default: true },
  graph: { type: GraphSchema, default: () => ({ nodes: [], edges: [] }) },
}, { timestamps: true });

module.exports = model('Flow', FlowSchema);

