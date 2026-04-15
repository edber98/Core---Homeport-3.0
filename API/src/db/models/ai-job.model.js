const { Schema, model, Types } = require('mongoose');
const { newId } = require('../../utils/ids');

const AiJobSchema = new Schema({
  id: { type: String, unique: true, index: true, sparse: true },
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, index: true },
  workspaceId: { type: Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true },

  type: {
    type: String,
    enum: ['agent_run', 'subagent', 'research', 'document', 'long_task'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['queued', 'running', 'paused', 'waiting_permission', 'waiting_dependency', 'waiting_parent', 'completed', 'error', 'cancelled'],
    default: 'queued',
    index: true,
  },
  mode: { type: String },

  // Hierarchy (subagent chain)
  parentJobId: { type: String, index: true },
  depth: { type: Number, default: 0 },
  // IDs (AiJob.id) des jobs dont ce job attend la complétion avant de démarrer.
  dependsOn: { type: [String], default: undefined },

  initiatorMessageId: { type: Types.ObjectId, ref: 'AiMessage' },
  agentId: { type: String },
  subagentType: { type: String, enum: ['research', 'file_analyzer', 'doc_writer', 'general', 'memory_extractor', 'project_doc_writer'] },
  subagentInstructions: { type: String },

  maxLoops: { type: Number, default: 40 },
  iteration: { type: Number, default: 0 },

  transcript: { type: [Schema.Types.Mixed], default: [] },
  transcriptOffloadedFileId: { type: String },

  sideEvents: { type: [Schema.Types.Mixed], default: [] },

  usage: {
    input: { type: Number, default: 0 },
    output: { type: Number, default: 0 },
  },

  result: {
    summary: { type: String },
    artifacts: { type: [Schema.Types.Mixed], default: [] },
  },

  error: { type: String },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  heartbeatAt: { type: Date, index: true },
  // Compteur de reprises par le resume-worker (stalled → queued). Borné par MAX_RESUMES.
  resumeCount: { type: Number, default: 0 },
}, { timestamps: true });

AiJobSchema.pre('save', function (next) {
  if (!this.id) this.id = newId('aij');
  next();
});

module.exports = model('AiJob', AiJobSchema);
