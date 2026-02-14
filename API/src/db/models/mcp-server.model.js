const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const McpServerSchema = new Schema({
  id: { type: String, index: true, unique: true, sparse: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true },
  transport: { type: String, enum: ['stdio', 'sse'], required: true },
  // stdio transport
  command: { type: String },
  args: { type: [String], default: [] },
  env: { type: Schema.Types.Mixed, default: {} },
  // SSE/HTTP transport
  url: { type: String },
  headers: { type: Schema.Types.Mixed, default: {} },
  // Config
  enabled: { type: Boolean, default: true },
  autoConnect: { type: Boolean, default: false },
  toolPrefix: { type: String, default: '' },
}, { timestamps: true });

McpServerSchema.pre('save', function (next) { if (!this.id) this.id = newId('mcp'); next(); });

module.exports = model('McpServer', McpServerSchema);
