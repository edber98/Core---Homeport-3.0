const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Entité générique du Knowledge Graph (Étage 1). UN nœud par « chose » réelle,
// dé-dupliqué cross-connecteurs via canonicalKey. Aucun modèle par type métier :
// le type vit dans coreType/subtype/roles, les données dans attributes.

const RadarEntitySchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  coreType: { type: String, required: true },        // Party | Transaction | …
  subtype: { type: String },                         // invoice | person | …
  roles: { type: [String], default: [] },            // client | supplier | …
  canonicalKey: { type: String, required: true },    // clé stable dé-dup (siret|email|provider:type:id)
  // Clés alternatives par lesquelles cette entité peut être référencée par des
  // relations (ex: 'dolibarr:party:74' alors que canonicalKey='email:...'). Permet
  // de résoudre les arêtes vers une entité à clé forte. Générique, tout provider.
  aliasKeys: { type: [String], default: [], index: true },
  label: { type: String, default: '' },
  attributes: { type: Schema.Types.Mixed, default: {} },
  // Provenance : la même entité peut venir de plusieurs connecteurs
  sources: { type: [{
    connectorId: { type: Types.ObjectId, ref: 'RadarConnector' },
    providerKey: String,
    externalId: String,
    rawHash: String,
    _id: false,
  }], default: [] },
  firstSeenAt: { type: Date },
  lastSeenAt: { type: Date },
  lastChangedAt: { type: Date },
}, { timestamps: true });

RadarEntitySchema.index({ workspaceId: 1, canonicalKey: 1 }, { unique: true });
RadarEntitySchema.index({ workspaceId: 1, coreType: 1, subtype: 1 });
RadarEntitySchema.pre('save', function(next){ if (!this.id) this.id = newId('rent'); next(); });

module.exports = model('RadarEntity', RadarEntitySchema);
