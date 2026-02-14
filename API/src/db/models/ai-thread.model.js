const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const AiThreadSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  mode: { type: String, enum: ['chat', 'workflow', 'node_args', 'form'], default: 'chat' },
  title: { type: String, default: 'Chat' },
  flowId: { type: Types.ObjectId, ref: 'Flow', index: true },
  nodeId: { type: String },
  agentId: { type: String },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

AiThreadSchema.pre('save', function (next) { if (!this.id) this.id = newId('ait'); next(); });

module.exports = model('AiThread', AiThreadSchema);
