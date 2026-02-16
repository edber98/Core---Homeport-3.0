const { Schema, model, Types } = require('mongoose');

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  pwdHash: { type: String, required: true },
  role: { type: String, enum: ['admin','user'], default: 'user' },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  defaultWorkspaceId: { type: Types.ObjectId, ref: 'Workspace', default: null },
}, { timestamps: true });

module.exports = model('User', UserSchema);

