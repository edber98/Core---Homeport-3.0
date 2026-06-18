const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Dataset d'apprentissage (Étage 2 du cerveau). Chaque action humaine sur le Radar
// (valider, modifier, ignorer, répondre, confirmer/refuser une relation) devient un
// exemple étiqueté — gratuitement, par l'usage normal. C'est le carburant des
// modèles qui remplaceront progressivement le LLM (Étage 3 : kNN, pertinence…).
//
// Les `features` capturent l'état AU MOMENT de la décision (expéditeur, montant,
// catégorie, nouveauté…) pour pouvoir entraîner/indexer ensuite sans re-fetch.

const RadarFeedbackSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: String },
  at: { type: Date, default: Date.now },
  action: { type: String, enum: ['validate', 'modify', 'dismiss', 'answer', 'requalify', 'relation_confirm', 'relation_reject', 'knowledge_edit'], required: true },
  targetKind: { type: String, enum: ['card', 'signal', 'delta', 'relation', 'entity', 'mapping'], required: true },
  targetId: { type: String },
  // Type de tâche apprenable (pour router vers le bon modèle plus tard)
  taskType: { type: String, index: true },  // significance | supplier_classification | alert_relevance | relation | process
  features: { type: Schema.Types.Mixed, default: {} },
  label: { type: Schema.Types.Mixed },       // l'étiquette tranchée par l'humain
  rawBefore: { type: Schema.Types.Mixed },
  rawAfter: { type: Schema.Types.Mixed },
}, { timestamps: true });

RadarFeedbackSchema.index({ workspaceId: 1, taskType: 1, at: -1 });
RadarFeedbackSchema.pre('save', function(next){ if (!this.id) this.id = newId('rfb'); next(); });

module.exports = model('RadarFeedback', RadarFeedbackSchema);
