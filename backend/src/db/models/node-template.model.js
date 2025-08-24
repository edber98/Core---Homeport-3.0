const { Schema, model } = require('mongoose');

const NodeTemplateSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['start','function','condition','loop','end','flow'], required: true },
  category: { type: String, default: '' },
  argsSchema: { type: Schema.Types.Mixed, default: {} },
  output: { type: [String], default: [] },
  authorize_catch_error: { type: Boolean, default: true },
  authorize_skip_error: { type: Boolean, default: false },
  checksumArgs: { type: String },
  checksumFeature: { type: String },
}, { timestamps: true });

module.exports = model('NodeTemplate', NodeTemplateSchema);
