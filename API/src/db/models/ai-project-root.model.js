const { Schema, model, Types } = require('mongoose');

const AiProjectRootSchema = new Schema({
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, unique: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  connectorType: {
    type: String,
    enum: ['nextcloudFiles', 'googleDrive', 'dropbox', 'oneDrive', 'sharePoint', 'nextcloud', 'google-drive', 'google_drive', 'onedrive-sharepoint', 'onedrive_sharepoint', 'local', 's3', 'custom'],
    required: true,
  },
  credentialId: { type: Types.ObjectId, ref: 'Credential' },
  rootPath: { type: String, default: '/' },
  label: { type: String, default: '' },
  cachedTree: { type: Schema.Types.Mixed, default: null },
  treeRefreshedAt: { type: Date },
  extraConfig: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = model('AiProjectRoot', AiProjectRootSchema);
