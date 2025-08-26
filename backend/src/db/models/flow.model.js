const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const GraphSchema = new Schema({
  nodes: { type: Schema.Types.Mixed, default: [] },
  edges: { type: Schema.Types.Mixed, default: [] },
}, { _id: false, strict: false });

const FlowSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  name: { type: String, required: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft','test','production'], default: 'draft' },
  enabled: { type: Boolean, default: true },
  graph: { type: GraphSchema, default: () => ({ nodes: [], edges: [] }) },
}, { timestamps: true });

FlowSchema.pre('save', function(next){ if (!this.id) this.id = newId('flw'); next(); });

module.exports = model('Flow', FlowSchema);
