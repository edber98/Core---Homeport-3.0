const { Schema, model, Types } = require('mongoose');

const NodeTemplateSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  title: { type: String },
  subtitle: { type: String },
  icon: { type: String },
  description: { type: String },
  tags: { type: [String], default: [] },
  group: { type: String },
  // Allow 'start_form', 'event' and 'endpoint' as valid trigger nodes in addition to existing kinds
  type: { type: String, enum: ['start','start_form','event','endpoint','function','condition','loop','end','flow'], required: true },
  category: { type: String, default: '' },
  providerKey: { type: String },
  appName: { type: String },
  args: { type: Schema.Types.Mixed },
  output: { type: [String], default: [] },
  authorize_catch_error: { type: Boolean, default: true },
  authorize_skip_error: { type: Boolean, default: false },
  allowWithoutCredentials: { type: Boolean, default: false },
  output_array_field: { type: String },
  checksumArgs: { type: String },
  checksumFeature: { type: String },
  // Origin repo (optional)
  repoId: { type: Types.ObjectId, ref: 'PluginRepo', index: true },
  repoName: { type: String },
}, { timestamps: true });

module.exports = model('NodeTemplate', NodeTemplateSchema);
