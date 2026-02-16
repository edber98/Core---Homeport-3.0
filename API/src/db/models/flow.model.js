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
  // UI/editor settings (orientation, helpers, etc.)
  settings: { type: Schema.Types.Mixed, default: {} },
  // Production trigger fields
  deployedAt:    { type: Date, default: null },
  lastDeployedAt: { type: Date, default: null },
  triggerType:   { type: String, enum: ['subscription','webhook','polling', null], default: null },
  triggerNodeId: { type: String, default: null },
  webhookToken:  { type: String, default: null, index: true, sparse: true },
  // Validation snapshot to surface in UI lists
  invalid: { type: Boolean, default: false },
  validationErrors: { type: [Schema.Types.Mixed], default: [] },
  validationWarnings: { type: [Schema.Types.Mixed], default: [] },
}, { timestamps: true });

FlowSchema.pre('save', function(next){ if (!this.id) this.id = newId('flw'); next(); });

module.exports = model('Flow', FlowSchema);
