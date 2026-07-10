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
  // CE QU'ON FAIT SUR CHAQUE LOGICIEL — relie le contexte entreprise aux connecteurs.
  // Saisi par l'utilisateur (« Dolibarr : devis, factures, stock »), injecté dans le
  // cerveau (askRadar/assistant) et utilisable par le mapping/process pour contexte.
  connectorUsages: {
    type: [{
      providerKey: { type: String, required: true },   // logiciel (dolibarr, nextcloudFiles…)
      usage: { type: String, default: '' },            // ce que l'entreprise y fait (texte libre)
      _id: false,
    }],
    default: [],
  },
}, { timestamps: true });

RadarCompanyContextSchema.pre('save', function(next) { if (!this.id) this.id = newId('rctx'); next(); });

module.exports = model('RadarCompanyContext', RadarCompanyContextSchema);
