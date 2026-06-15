const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Connecteur Radar — un logiciel branché sur une famille pour un workspace.
// C'est la généralisation du pattern AiProjectRoot (connectorType) à toutes
// les familles (email, accounting, crm, storage, …).

const RadarConnectorSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  family: { type: String, required: true, index: true },
  providerKey: { type: String, required: true },
  credentialId: { type: Types.ObjectId, ref: 'Credential' },
  label: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'active', 'error', 'paused'], default: 'pending', index: true },
  // Politique de collecte (phase 2) — stockée dès maintenant pour le wizard
  pollingPolicy: {
    intervalMs: { type: Number },
    nightlyFull: { type: Boolean, default: true },
    quietHours: { type: [Number], default: undefined }, // [hDebut, hFin]
  },
  // Mapping manuel capacité → { template, args } quand le manifest du provider
  // n'a pas de bloc radar (ou pour surcharger une entrée)
  capabilityOverrides: { type: Schema.Types.Mixed, default: undefined },
  // Périmètre surveillé (ex: { mailboxes: ['compta@…'] } ou { folders: ['/Compta'] })
  scopeConfig: { type: Schema.Types.Mixed, default: undefined },
  lastPollAt: { type: Date },
  lastFullSyncAt: { type: Date },
  baselineDoneAt: { type: Date },                 // 1re boucle d'observation terminée
  lockedUntil: { type: Date },                    // verrou multi-instance du scheduler
  lastError: { type: String },
  health: {
    consecutiveErrors: { type: Number, default: 0 },
    rateLimitedUntil: { type: Date },
    lastTestAt: { type: Date },
    lastTestOk: { type: Boolean },
  },
}, { timestamps: true });

RadarConnectorSchema.index({ workspaceId: 1, family: 1, providerKey: 1, credentialId: 1 }, { unique: true });
RadarConnectorSchema.pre('save', function(next){ if (!this.id) this.id = newId('rcon'); next(); });

module.exports = model('RadarConnector', RadarConnectorSchema);
