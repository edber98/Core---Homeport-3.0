const { Schema, model, Types } = require('mongoose');

const EnrichmentEntrySchema = new Schema({
  date: { type: Date, default: Date.now },
  source: { type: String, enum: ['auto', 'user', 'ai_question'] },
  field: { type: String },
  oldValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  reason: { type: String },
}, { _id: false });

const AiWorkspaceContextSchema = new Schema({
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, unique: true, index: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  description: { type: String, default: '' },
  customInstructions: { type: String, default: '' },
  enrichmentHistory: { type: [EnrichmentEntrySchema], default: [] },
}, { timestamps: true });

module.exports = model('AiWorkspaceContext', AiWorkspaceContextSchema);
