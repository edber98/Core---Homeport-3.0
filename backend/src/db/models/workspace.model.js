const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const WorkspaceSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  name: { type: String, required: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  isDefault: { type: Boolean, default: false, index: true },
  templatesAllowed: { type: [String], default: [] },
}, { timestamps: true });

WorkspaceSchema.pre('save', function(next){
  if (!this.id) this.id = newId('ws');
  next();
});

module.exports = model('Workspace', WorkspaceSchema);
