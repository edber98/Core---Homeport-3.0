const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const AiAgentSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  color: { type: String, default: '' },
  systemPrompt: { type: String, default: '' },
  mode: { type: String, enum: ['chat', 'workflow', 'both'], default: 'chat' },
  allowedProviders: { type: [String], default: [] },
  allowedTemplateKeys: { type: [String], default: [] },
  llmProvider: { type: String },
  llmModel: { type: String },
  enabled: { type: Boolean, default: true },
  createdBy: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AiAgentSchema.pre('save', function (next) { if (!this.id) this.id = newId('aia'); next(); });

module.exports = model('AiAgent', AiAgentSchema);
