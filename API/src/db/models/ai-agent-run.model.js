const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const AiAgentRunSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['running', 'completed', 'error'], default: 'running', index: true },
  mode: { type: String },
  agentId: { type: String },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  error: { type: String },
  usage: {
    input: { type: Number, default: 0 },
    output: { type: Number, default: 0 },
  },
}, { timestamps: true });

AiAgentRunSchema.pre('save', function (next) { if (!this.id) this.id = newId('arn'); next(); });

module.exports = model('AiAgentRun', AiAgentRunSchema);
