const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Registre des PETITS MODÈLES entraînés (Étage 3-4 du cerveau). Chaque tâche
// apprenable a son modèle léger (régression logistique, k-NN, moyenne mobile…),
// versionné, avec ses métriques et son état. C'est ce qui remplace progressivement
// le LLM, tâche par tâche — « % de décisions sans LLM » mesurable et réversible.

const RadarModelSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  taskType: { type: String, required: true, index: true },  // payment_risk | significance | supplier_classification | alert_relevance …
  kind: { type: String, default: 'logreg' },                // logreg | knn | moving_avg | bayes …
  version: { type: Number, default: 1 },
  features: { type: [String], default: [] },                // noms des features (explicabilité)
  params: { type: Schema.Types.Mixed },                     // poids entraînés (w, b, mean, std…)
  metrics: {
    examples: { type: Number, default: 0 },                 // taille du jeu d'entraînement
    accuracy: { type: Number },                             // précision mesurée (holdout)
    trainedAt: { type: Date },
  },
  status: { type: String, enum: ['active', 'shadow', 'insufficient_data', 'deprecated'], default: 'shadow' },
}, { timestamps: true });

RadarModelSchema.index({ workspaceId: 1, taskType: 1 }, { unique: true });
RadarModelSchema.pre('save', function(next) { if (!this.id) this.id = newId('rmdl'); next(); });

module.exports = model('RadarModel', RadarModelSchema);
