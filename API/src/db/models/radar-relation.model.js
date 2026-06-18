const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Arête du Knowledge Graph. Relation générique qualifiée par un rôle optionnel
// (vocabulaire fermé dans graph/ontology.js). Dé-dupliquée par (from, to, type, role).

const RadarRelationSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  fromKey: { type: String, required: true },   // canonicalKey de l'entité source
  toKey: { type: String, required: true },     // canonicalKey de l'entité cible
  type: { type: String, required: true },      // party_of | derived_from | …
  role: { type: String },                      // billed_to | assignee | …
  confidence: { type: Number, default: 1 },
  source: { type: String, enum: ['rule', 'llm', 'user'], default: 'rule' },
  evidence: { type: Schema.Types.Mixed },
}, { timestamps: true });

RadarRelationSchema.index({ workspaceId: 1, fromKey: 1 });
RadarRelationSchema.index({ workspaceId: 1, toKey: 1 });
RadarRelationSchema.index({ workspaceId: 1, fromKey: 1, toKey: 1, type: 1, role: 1 }, { unique: true });
RadarRelationSchema.pre('save', function(next){ if (!this.id) this.id = newId('rrel'); next(); });

module.exports = model('RadarRelation', RadarRelationSchema);
