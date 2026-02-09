const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const FileRecordSchema = new Schema({
  id:          { type: String, index: true, unique: true, sparse: true },
  name:        { type: String, required: true },
  mimeType:    { type: String, default: 'application/octet-stream' },
  size:        { type: Number, default: 0 },
  storage:     { type: String, enum: ['local', 's3'], default: 'local' },
  storagePath: { type: String, required: true },
  lifecycle:   { type: String, enum: ['temp', 'execution', 'permanent'], default: 'execution' },
  runId:       { type: Types.ObjectId, ref: 'Run', index: true, default: null },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  companyId:   { type: Types.ObjectId, ref: 'Company', required: true, index: true },
  uploadedBy:  { type: String, default: '' },
  expiresAt:   { type: Date, default: null, index: true },
  checksum:    { type: String, default: '' },
}, { timestamps: true });

FileRecordSchema.pre('save', function (next) {
  if (!this.id) this.id = newId('file');
  next();
});

module.exports = model('FileRecord', FileRecordSchema);
