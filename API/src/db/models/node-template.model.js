const { Schema, model, Types } = require('mongoose');

const NodeTemplateSchema = new Schema({
  schemaVersion: { type: Number, default: 1 },
  key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  title: { type: String },
  subtitle: { type: String },
  icon: { type: String },
  iconUrl: { type: String },
  description: { type: String },
  tags: { type: [String], default: [] },
  group: { type: String },
  enabled: { type: Boolean, default: true },
  // v1: type; v2: nodeKind (superset)
  type: { type: String, enum: ['start','start_form','event','endpoint','function','condition','loop','end','flow','agent','tool_ai','memory','router','choice'], required: true },
  nodeKind: { type: String, enum: ['start','start_form','event','endpoint','function','condition','loop','end','flow','agent','tool_ai','memory','router','choice'], default: undefined },
  category: { type: String, default: '' },
  providerKey: { type: String },
  appName: { type: String },
  args: { type: Schema.Types.Mixed },
  // Per-output schema is embedded in outputHandles[i].schema (v2)
  // v1 outputs (deprecated in v2)
  output: { type: [String], default: [] },
  // v2 handles
  inputHandles: { type: [Schema.Types.Mixed], default: undefined },
  outputHandles: { type: [Schema.Types.Mixed], default: undefined },
  linkedHandles: { type: [Schema.Types.Mixed], default: undefined },
  authorize_catch_error: { type: Boolean, default: true },
  authorize_skip_error: { type: Boolean, default: false },
  allowWithoutCredentials: { type: Boolean, default: false },
  // output_array_field removed in v2; conditions handle their own outputs from model context
  checksumArgs: { type: String },
  checksumFeature: { type: String },
  // Origin repo (optional)
  repoId: { type: Types.ObjectId, ref: 'PluginRepo', index: true },
  repoName: { type: String },
  // Multiple repos may contribute the same template
  repos: { type: [Types.ObjectId], ref: 'PluginRepo', index: true, default: [] },
  repoNames: { type: [String], default: [] },
}, { timestamps: true });

module.exports = model('NodeTemplate', NodeTemplateSchema);
