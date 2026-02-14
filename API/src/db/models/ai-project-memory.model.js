const { Schema, model, Types } = require('mongoose');

const AiProjectMemorySchema = new Schema({
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  elementType: { type: String, enum: ['flow', 'form'], required: true },
  elementId: { type: String, required: true, index: true },
  memory: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// Compound index for fast lookup
AiProjectMemorySchema.index({ workspaceId: 1, elementType: 1, elementId: 1 }, { unique: true });

module.exports = model('AiProjectMemory', AiProjectMemorySchema);
