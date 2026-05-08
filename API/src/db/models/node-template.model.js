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
  type: { type: String, enum: ['start','start_form','event','endpoint','function','condition','loop','end','flow','agent','tool_ai','memory','router','choice','barrier','race'], required: true },
  nodeKind: { type: String, enum: ['start','start_form','event','endpoint','function','condition','loop','end','flow','agent','tool_ai','memory','router','choice','barrier','race'], default: undefined },
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
  output_array_field: { type: String, default: undefined },
  output_schema_field: { type: String, default: undefined },
  // Sous-field cible où on injecte le schema dynamique (ex: "body" pour merge
  // dans outputHandles[0].schema.fields[key=body]). Sinon le dynamique remplace.
  output_schema_merge_at: { type: String, default: undefined },
  outputSchema: { type: [Schema.Types.Mixed], default: undefined },
  // Risk classification consumed by the AI assistant / permission layer.
  // Values: safe | write | destructive | elevated. Defaults to 'write' when absent.
  risk: { type: String, enum: ['safe', 'write', 'destructive', 'elevated'], default: 'write', index: true },
  riskReason: { type: String },
  // Free-form metadata bag (also includes risk/riskReason mirrored for convenience).
  metadata: { type: Schema.Types.Mixed, default: undefined },
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
