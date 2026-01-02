const { Schema, model, Types } = require('mongoose');

const AiContextSchema = new Schema({
  flowId: { type: Types.ObjectId, ref: 'Flow', required: true, unique: true, index: true },
  data: { type: Schema.Types.Mixed, default: null },
}, { timestamps: { createdAt: true, updatedAt: true } });

module.exports = model('AiContext', AiContextSchema);

