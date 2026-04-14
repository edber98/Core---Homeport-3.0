const { Schema, model, Types } = require('mongoose');

const DocumentChunkSchema = new Schema({
  seq: { type: Number },
  text: { type: String },
}, { _id: false });

const DocumentSchema = new Schema({
  format: { type: String, enum: ['markdown', 'docx', 'pptx', 'xlsx', 'html', 'text'], default: 'markdown' },
  title: { type: String, default: '' },
  previewHtml: { type: String, default: '' },
  fileId: { type: String },
  updatedAt: { type: Date },
  chunks: { type: [DocumentChunkSchema], default: [] },
}, { _id: false });

const ResearchStepSchema = new Schema({
  id: { type: String },
  type: { type: String, enum: ['search', 'fetch', 'read', 'synthesize', 'other'], default: 'search' },
  status: { type: String, enum: ['pending', 'running', 'completed', 'error'], default: 'pending' },
  title: { type: String, default: '' },
  url: { type: String },
  snippet: { type: String },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  resultPreview: { type: String },
}, { _id: false });

const ResearchSchema = new Schema({
  query: { type: String, default: '' },
  steps: { type: [ResearchStepSchema], default: [] },
}, { _id: false });

const TaskToolCallSchema = new Schema({
  id: { type: String },
  name: { type: String },
  args: { type: Schema.Types.Mixed },
  status: { type: String },
  startedAt: { type: Date },
  finishedAt: { type: Date },
}, { _id: false });

const CanvasTaskSchema = new Schema({
  id: { type: String, required: true },
  jobId: { type: String },
  subject: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'running', 'completed', 'error', 'cancelled'], default: 'pending' },
  parentTaskId: { type: String },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  toolCalls: { type: [TaskToolCallSchema], default: [] },
}, { _id: false });

const CanvasFilesSchema = new Schema({
  rootLabel: { type: String, default: '' },
  tree: { type: Schema.Types.Mixed, default: null },
  lastRefreshedAt: { type: Date },
}, { _id: false });

const AiCanvasStateSchema = new Schema({
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, unique: true, index: true },
  activeTab: {
    type: String,
    enum: ['document', 'research', 'tasks', 'files', 'none'],
    default: 'none',
  },
  document: { type: DocumentSchema, default: () => ({}) },
  research: { type: ResearchSchema, default: () => ({}) },
  tasks: { type: [CanvasTaskSchema], default: [] },
  files: { type: CanvasFilesSchema, default: () => ({}) },
}, { timestamps: true });

module.exports = model('AiCanvasState', AiCanvasStateSchema);
