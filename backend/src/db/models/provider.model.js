const { Schema, model } = require('mongoose');

const ProviderSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  categories: { type: [String], default: [] },
  enabled: { type: Boolean, default: true },
  checksum: { type: String },
}, { timestamps: true });

module.exports = model('Provider', ProviderSchema);
