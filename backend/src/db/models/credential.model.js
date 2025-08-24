const { Schema, model, Types } = require('mongoose');

const CredentialSchema = new Schema({
  name: { type: String, required: true },
  providerKey: { type: String, required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  secret: {
    iv: { type: String, required: true },
    tag: { type: String, required: true },
    data: { type: String, required: true },
  },
}, { timestamps: true });

module.exports = model('Credential', CredentialSchema);

