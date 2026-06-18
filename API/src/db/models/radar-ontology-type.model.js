const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Registre d'ontologie — DONNÉES, pas code. Un document = un couple
// (coreType, subtype) avec ses champs canoniques. C'est LUI qu'on enrichit pour
// supporter un nouveau type d'entité (jamais un nouveau modèle Mongo). Seedé
// depuis radar/graph/ontology.js, extensible à chaud (par l'admin ou proposé par
// le LLM lors d'un mapping inédit).
//
// workspaceId null = type global (vaut pour tous). Un workspace peut ajouter ses
// propres sous-types métier sans toucher au code.

const OntologyFieldSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, default: 'string' },   // string|number|date|bool|ref
  required: { type: Boolean, default: false },
  description: { type: String },
}, { _id: false });

const RadarOntologyTypeSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', index: true, default: null }, // null = global
  key: { type: String, required: true },        // "transaction.invoice" (coreType.subtype, minuscule)
  coreType: { type: String, required: true },   // "Transaction"
  subtype: { type: String },                    // "invoice" (null = coreType seul)
  label: { type: String },                      // libellé FR ("Facture")
  canonicalFields: { type: [OntologyFieldSchema], default: [] },
  // Relations typiques attendues pour ce sous-type (indicatif, aide l'inférence LLM)
  defaultRelations: { type: [Schema.Types.Mixed], default: [] }, // [{ type, role }]
  category: { type: String },                   // famille radar d'origine (accounting…)
  source: { type: String, enum: ['seed', 'admin', 'llm'], default: 'seed' },
  status: { type: String, enum: ['active', 'deprecated'], default: 'active' },
}, { timestamps: true });

// Un type est unique par (key, workspace). Global et override workspace coexistent.
RadarOntologyTypeSchema.index({ key: 1, workspaceId: 1 }, { unique: true });
RadarOntologyTypeSchema.index({ coreType: 1, subtype: 1 });
RadarOntologyTypeSchema.pre('save', function(next) { if (!this.id) this.id = newId('ront'); next(); });

module.exports = model('RadarOntologyType', RadarOntologyTypeSchema);
