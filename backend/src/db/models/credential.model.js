const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const CredentialSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  name: { type: String, required: true },
  providerKey: { type: String, required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  secret: {
    iv: { type: String, required: true },
    tag: { type: String, required: true },
    data: { type: String, required: true },
  },
}, { timestamps: true });

CredentialSchema.pre('save', function(next){ if (!this.id) this.id = newId('cred'); next(); });

module.exports = model('Credential', CredentialSchema);
