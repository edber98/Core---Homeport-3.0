const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

// Chat Radar — conversation directe utilisateur ↔ superviseur.
// Les messages user créent un réveil user_message ; le superviseur répond
// avec son outil reply_user. Le drawer frontend affiche le fil + SSE.

const RadarChatMessageSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  role: { type: String, enum: ['user', 'radar'], required: true },
  text: { type: String, required: true },
  missionId: { type: String },
  signalId: { type: String },
  cardId: { type: String },
}, { timestamps: true });

RadarChatMessageSchema.index({ workspaceId: 1, createdAt: -1 });
RadarChatMessageSchema.pre('save', function(next){ if (!this.id) this.id = newId('rcm'); next(); });

module.exports = model('RadarChatMessage', RadarChatMessageSchema);
