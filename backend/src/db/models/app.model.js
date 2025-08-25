const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const AppSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  name: { type: String, required: true },
  providerId: { type: Types.ObjectId, ref: 'Provider', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  config: { type: Schema.Types.Mixed, default: {} },
  createdBy: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AppSchema.pre('save', function(next){ if (!this.id) this.id = newId('app'); next(); });

module.exports = model('App', AppSchema);
