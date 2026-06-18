const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Adaptateur raw → ontologie. LE seul endroit qui connaît les spécificités d'un
// logiciel. Déterministe à l'exécution ; déclaré (pilotes) ou appris par LLM.
// Checksum des champs sources → détection de dérive de schéma.

const RadarMappingSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', index: true },  // null = mapping global
  providerKey: { type: String, required: true, index: true },
  rawEntityType: { type: String, required: true },   // ex: 'supplier_invoice' (entityType du snapshot)
  target: {
    coreType: { type: String, required: true },
    subtype: { type: String },
  },
  roles: { type: [String], default: [] },            // rôles posés sur l'entité (ex: supplier)
  keyField: { type: String, required: true },        // champ → externalId (clé stable provider)
  // Identité canonique : champs forts pour dé-dupliquer (siret, email, vat) ; sinon provider:type:id
  identityFields: { type: [String], default: [] },
  labelField: { type: String },                      // champ → label lisible
  fieldMap: { type: Schema.Types.Mixed, default: {} },   // { canonicalField: rawField }
  valueMap: { type: Schema.Types.Mixed, default: {} },   // { canonicalField: { rawVal: canonVal } }
  // Relations à créer : { type, role?, viaField, targetCoreType, targetSubtype }
  relationRules: { type: [Schema.Types.Mixed], default: [] },
  // Règles de LIGNES : itèrent un tableau (lignes de facture/devis) pour relier la
  // transaction à ses ARTICLES/PRODUITS. { arrayField, viaField, qtyField?, type, role, targetCoreType, targetSubtype }
  lineRules: { type: [Schema.Types.Mixed], default: [] },
  // Rôles conditionnels : { field, equals?, role } (ex: client=1 → rôle 'client')
  roleRules: { type: [Schema.Types.Mixed], default: [] },
  // Schéma APPRIS depuis les données (types observés) — audit + détection de dérive
  learnedSchema: { type: Schema.Types.Mixed },
  // Raisons pour lesquelles ce mapping appris doit être confirmé (predict-or-ask)
  reviewReasons: { type: [String], default: [] },
  checksum: { type: String },
  learnedBy: { type: String, enum: ['manual', 'llm'], default: 'manual' },
  confidence: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'draft', 'deprecated'], default: 'active' },
  version: { type: Number, default: 1 },
}, { timestamps: true });

RadarMappingSchema.index({ providerKey: 1, rawEntityType: 1, workspaceId: 1 });
RadarMappingSchema.pre('save', function(next){ if (!this.id) this.id = newId('rmap'); next(); });

module.exports = model('RadarMapping', RadarMappingSchema);
