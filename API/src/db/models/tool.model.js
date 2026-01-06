const mongoose = require('mongoose');

const ToolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  component: { type: String, default: '' },
  template: { type: String, default: '' }, // Nunjucks HTML (optionnel)
}, { timestamps: true });

module.exports = mongoose.models.Tool || mongoose.model('Tool', ToolSchema);
