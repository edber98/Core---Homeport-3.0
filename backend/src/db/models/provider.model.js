const { Schema, model } = require('mongoose');

const ProviderSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  title: { type: String },
  iconClass: { type: String },
  iconUrl: { type: String },
  color: { type: String },
  tags: { type: [String], default: [] },
  categories: { type: [String], default: [] },
  enabled: { type: Boolean, default: true },
  hasCredentials: { type: Boolean, default: false },
  allowWithoutCredentials: { type: Boolean, default: false },
  credentialsForm: { type: Schema.Types.Mixed },
  checksum: { type: String },
}, { timestamps: true });

module.exports = model('Provider', ProviderSchema);
