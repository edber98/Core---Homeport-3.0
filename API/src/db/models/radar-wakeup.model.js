const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Réveil programmé du superviseur — sa mémoire prospective
// (« re-vérifier dans 3 jours si le client a répondu », fin de mission, …).

const RadarWakeupSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  at: { type: Date, required: true, index: true },
  reason: { type: String, required: true },
  payload: { type: Schema.Types.Mixed },            // ex: { missionId } ou { signalId }
  status: { type: String, enum: ['pending', 'fired', 'cancelled'], default: 'pending', index: true },
  firedAt: { type: Date },
}, { timestamps: true });

RadarWakeupSchema.index({ status: 1, at: 1 });
RadarWakeupSchema.pre('save', function(next){ if (!this.id) this.id = newId('rwk'); next(); });

module.exports = model('RadarWakeup', RadarWakeupSchema);
