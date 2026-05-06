const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// User-made skill : snippet code partagé au workspace (Python ou JS).
// Pas d'exécution directe pour l'instant — sert de bibliothèque d'exemples
// que l'utilisateur copie/adapte via le bouton "Utiliser".
const AiUserSkillSchema = new Schema({
  id: { type: String, unique: true, index: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  createdBy: { type: Types.ObjectId, ref: 'User', required: true },

  name: { type: String, required: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 500 },
  language: { type: String, enum: ['python', 'javascript', 'bash', 'sql', 'mermaid', 'other'], default: 'python' },
  code: { type: String, required: true, maxlength: 50_000 },
  tags: { type: [String], default: [] },
  shared: { type: Boolean, default: true },
  useCount: { type: Number, default: 0 },
  forkCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date },
  forkedFrom: { type: String }, // id du skill original si fork
}, { timestamps: true });

AiUserSkillSchema.index({ workspaceId: 1, name: 1 });
AiUserSkillSchema.index({ workspaceId: 1, useCount: -1 });

AiUserSkillSchema.pre('save', function (next) {
  if (!this.id) this.id = newId('aisk_');
  next();
});

module.exports = model('AiUserSkill', AiUserSkillSchema);
