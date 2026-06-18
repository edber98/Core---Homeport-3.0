const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Contexte de l'entreprise — décrit son métier pour que le cerveau interprète son
// activité, charge les bons modules (familles, sous-types d'ontologie, seuils) et
// nomme correctement ses processus. Demandé au 1er démarrage si absent.
//
// Évolutif : enrichi à chaque logiciel connecté (les familles observées affinent
// la compréhension). Le LLM transforme la description libre en structure exploitable.

const RadarCompanyContextSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, unique: true },
  description: { type: String, default: '' },          // texte libre saisi par l'utilisateur
  // Interprétation LLM (structurée)
  sector: { type: String },                            // ex: 'industrie', 'expert_comptable', 'informatique', 'sante'…
  activities: { type: [String], default: [] },         // ex: ['production', 'maintenance', 'facturation']
  suggestedFamilies: { type: [String], default: [] },  // familles radar pertinentes (accounting, industry…)
  keyMetrics: { type: [String], default: [] },         // indicateurs clés du métier (OEE, marge, trésorerie…)
  summary: { type: String },                           // résumé en une phrase
  interpretedAt: { type: Date },
  source: { type: String, enum: ['user', 'llm'], default: 'user' },
}, { timestamps: true });

RadarCompanyContextSchema.pre('save', function(next) { if (!this.id) this.id = newId('rctx'); next(); });

module.exports = model('RadarCompanyContext', RadarCompanyContextSchema);
