const { Schema, model, Types } = require('mongoose');

const AiChatMessageSchema = new Schema({
  threadId: { type: Types.ObjectId, ref: 'AiChatThread', required: true, index: true },
  role: { type: String, enum: ['user','assistant','system'], required: true },
  text: { type: String, default: '' },
  parts: { type: [Schema.Types.Mixed], default: undefined },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = model('AiChatMessage', AiChatMessageSchema);

