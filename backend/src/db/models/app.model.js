const { Schema, model, Types } = require('mongoose');

const AppSchema = new Schema({
  name: { type: String, required: true },
  providerId: { type: Types.ObjectId, ref: 'Provider', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  config: { type: Schema.Types.Mixed, default: {} },
  createdBy: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = model('App', AppSchema);

