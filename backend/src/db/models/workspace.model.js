const { Schema, model, Types } = require('mongoose');

const WorkspaceSchema = new Schema({
  name: { type: String, required: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  templatesAllowed: { type: [String], default: [] },
}, { timestamps: true });

module.exports = model('Workspace', WorkspaceSchema);

