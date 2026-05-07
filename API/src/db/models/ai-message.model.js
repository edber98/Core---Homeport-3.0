const { Schema, model, Types } = require('mongoose');

const ToolCallSchema = new Schema({
  id: { type: String },
  name: { type: String },
  args: { type: Schema.Types.Mixed },
  result: { type: Schema.Types.Mixed },
  duration: { type: Number },
  status: { type: String, enum: ['success', 'error', 'running'] },
  displayTitle: { type: String },
  argsSchema: { type: [{ key: String, label: String }], default: undefined },
}, { _id: false });

const QuestionItemSchema = new Schema({
  id: { type: String },
  text: { type: String },
  questionType: { type: String, enum: ['single', 'multi', 'text'] },
  options: [{ label: String, value: String, description: String }],
}, { _id: false });

const QuestionSchema = new Schema({
  text: { type: String },
  questionType: { type: String, enum: ['single', 'multi', 'text', 'batch'] },
  options: [{ label: String, value: String, description: String }],
  questions: { type: [QuestionItemSchema], default: undefined },
}, { _id: false });

const SegmentSchema = new Schema({
  type: { type: String, enum: ['text', 'tools'], required: true },
  content: { type: String },
  toolCalls: { type: [ToolCallSchema], default: undefined },
}, { _id: false });

// ── Permission request metadata ──
const PermissionChoiceSchema = new Schema({
  id: { type: String },
  label: { type: String },
}, { _id: false });

const PermissionScopeSchema = new Schema({
  path: { type: String },
  pattern: { type: String },
}, { _id: false });

const PermissionRequestSchema = new Schema({
  requestId: { type: String },
  toolName: { type: String },
  argsPreview: { type: Schema.Types.Mixed },
  risk: { type: String, enum: ['safe', 'write', 'destructive', 'elevated'] },
  scope: { type: PermissionScopeSchema, default: undefined },
  choices: { type: [PermissionChoiceSchema], default: undefined },
  answer: { type: String },
  answeredAt: { type: Date },
  answeredBy: { type: Types.ObjectId, ref: 'User' },
  // Cas d'une escalation depuis un sous-agent : le frontend doit POST sur le
  // childJobId pour résoudre la permission (pas sur le parent).
  childJobId: { type: String },
  parentJobId: { type: String },
  escalatedFromSubagent: { type: Boolean },
}, { _id: false });

// ── Cache sync request metadata ──
const PendingFileSchema = new Schema({
  path: { type: String },
  size: { type: Number },
  dirty: { type: Boolean },
}, { _id: false });

const CacheSyncRequestSchema = new Schema({
  pendingFiles: { type: [PendingFileSchema], default: undefined },
  sizeBytes: { type: Number },
  choices: { type: [PermissionChoiceSchema], default: undefined },
  answer: { type: String },
  answeredAt: { type: Date },
}, { _id: false });

// ── Structured interactive message metadata ──
const StructuredPayloadSchema = new Schema({
  layout: {
    type: String,
    enum: ['chips_tabs', 'stepped_plan', 'comparison_table', 'accordion', 'timeline', 'card_grid'],
  },
  title: { type: String },
  data: { type: Schema.Types.Mixed },
  renderedAt: { type: Date, default: Date.now },
}, { _id: false });

// ── Plan proposal metadata ──
const PlanStepSchema = new Schema({
  id: { type: String },
  title: { type: String },
  rationale: { type: String },
  tools: { type: [String], default: undefined },
  duration_estimate: { type: String },
  dependsOn: { type: [String], default: undefined },
}, { _id: false });

const PlanMissingInfoSchema = new Schema({
  key: { type: String },
  question: { type: String },
  why: { type: String },
}, { _id: false });

const PlanProposalSchema = new Schema({
  requestId: { type: String },
  summary: { type: String },
  steps: { type: [PlanStepSchema], default: undefined },
  risks: { type: [String], default: undefined },
  missingInfo: { type: [PlanMissingInfoSchema], default: undefined },
  missingInfoAnswers: { type: Schema.Types.Mixed },
  answer: { type: String, enum: ['approve', 'reject', 'modify'] },
  answeredAt: { type: Date },
  answeredBy: { type: Types.ObjectId, ref: 'User' },
  approvedSteps: { type: [String], default: undefined },
  modifiedSteps: { type: [PlanStepSchema], default: undefined },
}, { _id: false });

// ── Agent report metadata (async subagent completion) ──
const AgentReportArtifactSchema = new Schema({
  fileId: { type: String },
  url: { type: String },
  label: { type: String },
}, { _id: false });

const AgentReportSchema = new Schema({
  jobId: { type: String },
  subagentType: { type: String },
  parentJobId: { type: String },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  duration: { type: Number },
  summary: { type: String },
  artifacts: { type: [AgentReportArtifactSchema], default: undefined },
  status: { type: String, enum: ['completed', 'error', 'cancelled'] },
  toolCount: { type: Number },
  error: { type: String },
  // Roster (Tim, Ada, Denis, ...) — cosmétique UI
  agentName: { type: String },
  agentEmoji: { type: String },
  agentColor: { type: String },
  agentTagline: { type: String },
  agentFigure: { type: String },
}, { _id: false });

// ── Diagram metadata ──
const DiagramSchema = new Schema({
  type: { type: String },
  title: { type: String },
  mermaid: { type: String },
}, { _id: false });

// ── Inline image metadata (tool display_image) ──
const ImageInlineSchema = new Schema({
  fileId: { type: String },
  url: { type: String },
  caption: { type: String },
  alt: { type: String },
}, { _id: false });

// ── Canvas HTML interactif (tool render_interactive_canvas) ──
const CanvasHtmlSchema = new Schema({
  html: { type: String, required: true },
  title: { type: String },
  description: { type: String },
  height: { type: Number, default: 420 },
  type: { type: String, enum: ['2d', '3d', 'animation', 'demo'], default: 'demo' },
}, { _id: false });

// ── Viewer fichier inline (tool display_file) — docx/xlsx/pptx/pdf ──
const FileInlineSchema = new Schema({
  fileId: { type: String, required: true },
  name: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  caption: { type: String },
  kind: { type: String, enum: ['docx', 'xlsx', 'pptx', 'pdf', 'other'] },
}, { _id: false });

// ── Todo list (tool todo_write — inspiré de claude-code TodoWriteTool) ──
const TodoToolCallSchema = new Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['success', 'error', 'running'], default: 'success' },
  duration: { type: Number },
  argsSummary: { type: String },     // 1 ligne résumant les args (query, path, etc.)
  // Pour spawn_subagent : infos agent pour afficher le badge
  agentName: { type: String },
  agentEmoji: { type: String },
  agentColor: { type: String },
  subagentType: { type: String },
  spawnedJobId: { type: String },     // jobId retourné par spawn_subagent (lie au rapport agent_report)
  at: { type: Date, default: Date.now },
}, { _id: false });

const TodoItemSchema = new Schema({
  id: { type: String, required: true },
  content: { type: String, required: true },      // description complète
  activeForm: { type: String },                    // forme active ("Analyzing…")
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  toolCalls: { type: [TodoToolCallSchema], default: undefined },
}, { _id: false });

const TodoListSchema = new Schema({
  todos: { type: [TodoItemSchema], default: [] },
  title: { type: String },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const MessageMetadataSchema = new Schema({
  kind: { type: String, enum: ['permission_request', 'cache_sync_request', 'comment', 'system_note', 'system_hint', 'structured', 'plan_proposal', 'diagram', 'image_inline', 'agent_report', 'canvas_html', 'file_inline', 'todo_list', 'resume_stream'] },
  todoList: { type: TodoListSchema, default: undefined },
  permissionRequest: { type: PermissionRequestSchema, default: undefined },
  cacheSyncRequest: { type: CacheSyncRequestSchema, default: undefined },
  structured: { type: StructuredPayloadSchema, default: undefined },
  planProposal: { type: PlanProposalSchema, default: undefined },
  diagram: { type: DiagramSchema, default: undefined },
  imageInline: { type: ImageInlineSchema, default: undefined },
  canvasHtml: { type: CanvasHtmlSchema, default: undefined },
  fileInline: { type: FileInlineSchema, default: undefined },
  agentReport: { type: AgentReportSchema, default: undefined },
  // ID stable du widget, permet la mise à jour in-place (tools peuvent
  // repasser `widgetId` pour éditer au lieu de recréer une card en dessous).
  widgetId: { type: String },
  widgetUpdatedAt: { type: Date },
  // Comment author (for shared threads)
  commentBy: { type: Types.ObjectId, ref: 'User' },
  // Free extensions
  extra: { type: Schema.Types.Mixed },
}, { _id: false, strict: false });

const AiMessageSchema = new Schema({
  threadId: { type: Types.ObjectId, ref: 'AiThread', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
  content: { type: String, default: '' },
  toolCalls: { type: [ToolCallSchema], default: undefined },
  segments: { type: [SegmentSchema], default: undefined },
  question: { type: QuestionSchema, default: undefined },
  attachments: { type: [Schema.Types.Mixed], default: undefined },
  answer: { type: Schema.Types.Mixed, default: undefined },
  cancelled: { type: Boolean, default: undefined },
  usage: {
    input: { type: Number },
    output: { type: Number },
  },
  metadata: { type: MessageMetadataSchema, default: undefined },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Webhook dispatch après création d'un message assistant. On hook ici plutôt
// que dans chaque endroit qui crée des messages (harness, agent-runner,
// sub-runner, routes ai…) — simpler, exhaustif, fire-and-forget.
AiMessageSchema.post('save', function postSaveDispatch(doc) {
  // On ne push QUE pour les messages assistant nouvellement créés. Les user
  // messages, system notes et widgets internes ne déclenchent pas de webhook.
  if (doc.role !== 'assistant') return;
  // Skip si le message a juste un kind interne (system_note, system_hint…)
  const kind = doc.metadata?.kind;
  const SKIP_KINDS = new Set(['system_note', 'system_hint', 'permission_request', 'cache_sync_request']);
  if (kind && SKIP_KINDS.has(kind)) return;
  try {
    const { dispatchEvent } = require('../../services/webhook-dispatcher');
    const AiThread = require('./ai-thread.model');
    AiThread.findById(doc.threadId, 'workspaceId companyId flowId formId mode').lean()
      .then(thread => {
        if (!thread) return;
        return dispatchEvent('thread.message.created', {
          messageId: String(doc._id),
          threadId: String(doc.threadId),
          flowId: thread.flowId ? String(thread.flowId) : null,
          formId: thread.formId || null,
          mode: thread.mode,
          role: doc.role,
          content: doc.content || '',
          kind: kind || null,
          createdAt: doc.createdAt,
        }, { workspaceId: thread.workspaceId, companyId: thread.companyId });
      })
      .catch(() => {}); // fire-and-forget
  } catch { /* le webhook ne doit jamais bloquer l'app */ }
});

module.exports = model('AiMessage', AiMessageSchema);
