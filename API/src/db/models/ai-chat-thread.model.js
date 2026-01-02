const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const AiChatThreadSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  flowId: { type: Types.ObjectId, ref: 'Flow', required: true, index: true },
  title: { type: String, default: 'Chat' },
}, { timestamps: true });

AiChatThreadSchema.pre('save', function(next){ if (!this.id) this.id = newId('ait'); next(); });

module.exports = model('AiChatThread', AiChatThreadSchema);

