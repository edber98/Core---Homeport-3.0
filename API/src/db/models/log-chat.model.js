const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const LogChatSchema = new Schema({
  message: { type: Types.ObjectId, ref: 'AiChatMessage', index: true, required: false },
  chatId: { type: Types.ObjectId, ref: 'AiChatThread', index: true, required: false },
  type: { type: String, enum: ['reflexion','function'], required: true },
  function: { type: String },
  args: { type: Schema.Types.Mixed },
  result: { type: Schema.Types.Mixed },
  content: { type: String },
  running: { type: Boolean, default: false },
  arg_running: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  runId: { type: String, index: true },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  duration: { type: Number },
}, { timestamps: true });

module.exports = mongoose.models.LogChat || mongoose.model('LogChat', LogChatSchema);

