const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Savoir entreprise du Radar — faits structurés (arborescence des fichiers,
// contacts clés, conventions, règles métier) injectés dans les briefings du
// superviseur et les prompts de mission. Alimenté par le wizard, les réponses
// aux cards question, et le superviseur lui-même (save_knowledge).

const RadarKnowledgeSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  topic: { type: String, enum: ['file_structure', 'contacts', 'conventions', 'processes', 'business_rules', 'custom'], default: 'custom' },
  key: { type: String, required: true },           // ex: "arborescence factures fournisseurs"
  value: { type: String, required: true },         // le fait, en français
  source: { type: String, enum: ['wizard', 'user_answer', 'radar_discovery', 'user_spontaneous', 'supervisor'], default: 'user_spontaneous' },
  confidence: { type: String, enum: ['confirmed', 'inferred'], default: 'confirmed' },
  verifiedAt: { type: Date },
}, { timestamps: true });

RadarKnowledgeSchema.index({ workspaceId: 1, topic: 1, key: 1 }, { unique: true });
RadarKnowledgeSchema.pre('save', function(next){ if (!this.id) this.id = newId('rknw'); next(); });

module.exports = model('RadarKnowledge', RadarKnowledgeSchema);
