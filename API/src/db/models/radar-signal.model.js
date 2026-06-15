const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Signal Radar — un événement signifiant issu du filtre (règles + LLM léger).
// C'est ce qui réveille le superviseur ; un signal regroupe un ou plusieurs
// deltas de même nature.

const RadarSignalSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  connectorId: { type: Types.ObjectId, ref: 'RadarConnector' },
  family: { type: String },
  category: { type: String, required: true },     // ex: accounting_change, client_complaint, email_request
  urgency: { type: String, enum: ['low', 'normal', 'high'], default: 'normal', index: true },
  summary: { type: String, required: true },      // phrase exploitable par le superviseur
  deltaIds: { type: [String], default: [] },      // RadarDelta.id
  entities: { type: [String], default: undefined }, // entités nommées détectées (étage 2)
  source: { type: String, enum: ['rules', 'llm', 'reconciliation'], default: 'rules' },
  dedupeKey: { type: String, index: true, sparse: true }, // anti re-émission (réconciliations nocturnes)
  status: { type: String, enum: ['pending', 'processing', 'handled', 'dismissed'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },         // passes superviseur sans résolution (garde anti-boucle)
  resolution: { type: String },                   // note du superviseur à la résolution
  missionIds: { type: [String], default: undefined }, // missions lancées pour ce signal
  handledAt: { type: Date },
}, { timestamps: true });

RadarSignalSchema.index({ workspaceId: 1, status: 1, urgency: -1, createdAt: 1 });
RadarSignalSchema.pre('save', function(next){ if (!this.id) this.id = newId('rsig'); next(); });

module.exports = model('RadarSignal', RadarSignalSchema);
