const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const AiPromptTemplateSchema = new Schema({
  id: { type: String, unique: true, index: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  createdBy: { type: Types.ObjectId, ref: 'User', required: true },

  name: { type: String, required: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 500 },
  prompt: { type: String, required: true, maxlength: 20_000 },
  category: {
    type: String,
    enum: ['général', 'code', 'analyse', 'rédaction', 'data', 'projet', 'autre'],
    default: 'général',
  },
  tags: { type: [String], default: [] },
  shared: { type: Boolean, default: true },
  useCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date },
}, { timestamps: true });

AiPromptTemplateSchema.index({ workspaceId: 1, name: 1 });
AiPromptTemplateSchema.index({ workspaceId: 1, useCount: -1 });

AiPromptTemplateSchema.pre('save', function (next) {
  if (!this.id) this.id = newId('aipt_');
  next();
});

module.exports = model('AiPromptTemplate', AiPromptTemplateSchema);
