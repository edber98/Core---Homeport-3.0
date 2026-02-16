const { Schema, model, Types } = require('mongoose');

const EnrichmentEntrySchema = new Schema({
  date: { type: Date, default: Date.now },
  source: { type: String, enum: ['auto', 'user', 'ai_question'] },
  field: { type: String },
  oldValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  reason: { type: String },
}, { _id: false });

const AiCompanyContextSchema = new Schema({
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, unique: true, index: true },
  description: { type: String, default: '' },
  industry: { type: String, default: '' },
  services: { type: [String], default: [] },
  systemPrompt: { type: String, default: '' },
  preferences: {
    language: { type: String, default: 'fr' },
    timezone: { type: String, default: 'Europe/Paris' },
  },
  enrichmentHistory: { type: [EnrichmentEntrySchema], default: [] },
}, { timestamps: true });

module.exports = model('AiCompanyContext', AiCompanyContextSchema);
