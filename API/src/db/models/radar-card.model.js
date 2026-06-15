const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Card Radar — brique du dashboard server-driven. Le superviseur compose le
// board en créant/fermant des cards typées ; Angular les rend par type.
// Catalogue fermé : le contenu est libre (payload), le rendu est sûr.

const CARD_TYPES = ['briefing', 'alert', 'action_proposal', 'question', 'mission_status', 'digest'];

const RadarCardSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  type: { type: String, enum: CARD_TYPES, required: true },
  section: { type: String, default: 'Aujourd\'hui' },
  priority: { type: Number, default: 100 },        // plus petit = plus haut
  title: { type: String, required: true },
  // Payload par type :
  //   briefing/digest/alert : { markdown, severity? }
  //   action_proposal       : { markdown, proposedAction }  → Valider / Modifier / Refuser
  //   question              : { question }                  → réponse libre
  //   mission_status        : { missionId, statusText }
  payload: { type: Schema.Types.Mixed, default: {} },
  requiresResponse: { type: Boolean, default: false },
  state: { type: String, enum: ['open', 'validated', 'modified', 'dismissed', 'answered', 'done', 'expired'], default: 'open', index: true },
  userResponse: {
    action: { type: String },                      // validate | modify | dismiss | answer
    note: { type: String },
    answer: { type: String },
    modifiedPayload: { type: Schema.Types.Mixed },
    at: { type: Date },
    userId: { type: Types.ObjectId, ref: 'User' },
  },
  missionId: { type: String },
  signalIds: { type: [String], default: undefined },
  expiresAt: { type: Date },
  closedNote: { type: String },                    // note du superviseur à la fermeture
}, { timestamps: true });

RadarCardSchema.index({ workspaceId: 1, state: 1, section: 1, priority: 1 });
RadarCardSchema.pre('save', function(next){ if (!this.id) this.id = newId('rcrd'); next(); });

module.exports = model('RadarCard', RadarCardSchema);
module.exports.CARD_TYPES = CARD_TYPES;
