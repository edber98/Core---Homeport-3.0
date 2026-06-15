const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Delta Radar — un changement détecté entre deux passages d'observation.
// Consommé plus tard par le filtre de signifiance (phase 3) ; TTL 30 jours
// après consommation pour éviter l'accumulation.

const RadarDeltaSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  connectorId: { type: Types.ObjectId, ref: 'RadarConnector', required: true, index: true },
  family: { type: String, required: true },
  entityType: { type: String, required: true },
  entityKey: { type: String, required: true },
  type: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
  before: { type: Schema.Types.Mixed },           // état précédent (updated/deleted)
  after: { type: Schema.Types.Mixed },            // nouvel état (created/updated)
  changedFields: { type: [String], default: undefined }, // champs hashFields qui ont changé (updated)
  status: { type: String, enum: ['pending', 'consumed', 'ignored'], default: 'pending', index: true },
  // Verdict du filtre de signifiance (traçabilité : pourquoi ignoré / classé)
  classification: { type: Schema.Types.Mixed },
  occurredAt: { type: Date, required: true },
  consumedAt: { type: Date },
}, { timestamps: true });

RadarDeltaSchema.index({ workspaceId: 1, status: 1, occurredAt: -1 });
// Purge automatique 30 j après consommation (consumedAt absent → jamais purgé)
RadarDeltaSchema.index({ consumedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
RadarDeltaSchema.pre('save', function(next){ if (!this.id) this.id = newId('rdel'); next(); });

module.exports = model('RadarDelta', RadarDeltaSchema);
