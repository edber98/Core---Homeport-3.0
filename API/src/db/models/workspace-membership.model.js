const { Schema, model, Types } = require('mongoose');

const WorkspaceMembershipSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  role: { type: String, enum: ['owner','editor','viewer'], default: 'editor' },
}, { timestamps: true });

WorkspaceMembershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

module.exports = model('WorkspaceMembership', WorkspaceMembershipSchema);

