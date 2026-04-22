import { Injectable, NgZone, signal, computed } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { ApiClientService } from '../../services/api-client.service';
import { AccessControlService } from '../../services/access-control.service';
import { AuthTokenService } from '../../services/auth-token.service';
import { FilesBackendService, FileRef } from '../../services/files-backend.service';
import { apiRoot, apiSuffix } from '../../shared/api-base';
import { environment } from '../../../environments/environment';

// ── Types ──

export interface AiThreadShare {
  userId: string;
  permission: 'view' | 'comment' | 'edit';
  addedBy: string;
  addedAt: string;
}

export interface AiThread {
  _id: string;
  id: string;
  mode: 'chat' | 'workflow' | 'node_args' | 'form' | 'onboarding' | 'project';
  title: string;
  flowId?: string;
  nodeId?: string;
  agentId?: string;
  metadata?: any;
  workspaceId: string;
  ownerId?: string;
  visibility?: 'private' | 'shared';
  sharedWith?: AiThreadShare[];
  _shared?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── V2 Types ──

export type AiProjectKnowledgeType = 'text' | 'number' | 'date' | 'url' | 'email' | 'file' | 'list' | 'boolean' | 'json';

export type AiProjectKnowledgeStatus = 'pending' | 'approved' | 'rejected';

export interface AiProjectKnowledgeEntry {
  _id?: string;
  key: string;
  value: any;
  type?: AiProjectKnowledgeType;
  description?: string;
  source?: 'manual' | 'extracted' | 'ai';
  pinned?: boolean;
  tags?: string[];
  updatedAt?: string;
  updatedBy?: string;
  status?: AiProjectKnowledgeStatus;
  suggestionWhy?: string;
  sourceMessageId?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface AiProjectKnowledge {
  threadId: string;
  workspaceId?: string;
  entries: AiProjectKnowledgeEntry[];
}

export interface AiProjectRoot {
  id: string;
  threadId: string;
  workspaceId: string;
  connectorType: 'nextcloud' | 'google_drive' | 'dropbox' | 'onedrive_sharepoint';
  credentialId: string;
  rootPath: string;
  label: string;
  cachedTree?: any;
  treeRefreshedAt?: string;
  extraConfig?: any;
}

export interface AiCanvasState {
  threadId: string;
  activeTab: 'document' | 'research' | 'workplan' | 'artifacts' | 'files';
  document?: {
    format?: 'docx' | 'pptx' | 'xlsx' | 'html' | 'md' | 'mermaid';
    title?: string;
    previewHtml?: string;
    rawMermaid?: string;
    fileId?: string;
    updatedAt?: string;
  };
  research?: {
    query?: string;
    steps: Array<{
      id: string;
      type: 'search' | 'fetch' | 'synth';
      status: string;
      title?: string;
      url?: string;
      snippet?: string;
      resultPreview?: string;
    }>;
  };
  tasks?: Array<{
    id: string;
    jobId: string;
    subject: string;
    description?: string;
    subagentType?: string;
    status: string;
    parentTaskId?: string;
    startedAt?: string;
    finishedAt?: string;
    duration?: number;
    error?: string;
    toolCalls?: any[];
  }>;
  files?: {
    rootLabel: string;
    tree: any;
    lastRefreshedAt?: string;
  };
}

export interface AiJob {
  id: string;
  threadId: string;
  workspaceId: string;
  type: string;
  status: string;
  mode: string;
  parentJobId?: string;
  depth?: number;
  subagentType?: string;
  iteration?: number;
  usage?: { input: number; output: number };
  result?: { summary?: string; artifacts?: any[] };
  startedAt?: string;
  finishedAt?: string;
  heartbeatAt?: string;
}

export interface AiPermissionGrant {
  id: string;
  threadId: string;
  toolName: string;
  scope: 'tool' | 'tool+path' | 'tool+pattern' | 'tool+workspace';
  pathPattern?: string;
  decision: string;
  riskLevel: string;
  expiresAt?: string | null;
}

export interface AiPermissionRequest {
  requestId: string;
  toolName: string;
  toolLabel?: string;
  argsPreview: string;
  risk: 'safe' | 'write' | 'destructive' | 'elevated';
  scope: { path?: string; pattern?: string };
  choices: Array<{ id: 'once' | 'session' | 'always' | 'deny'; label: string }>;
  answer?: string;
  answeredAt?: string;
  answeredBy?: string;
}

export interface AiCacheSyncRequest {
  pendingFiles: any[];
  sizeBytes: number;
  choices: any[];
  answer?: string;
  answeredAt?: string;
}

export interface AiUserPreferences {
  userId: string;
  workspaceId: string;
  defaultAutonomyLevel: 'prudent' | 'balanced' | 'autonomous';
  defaultAgentId?: string;
  cacheBehavior: {
    autoSyncOnIdle: boolean;
    idleTtlHours: number;
    askBeforeSync: boolean;
    askBeforeCleanup: boolean;
    keepCacheAfterClose: boolean;
  };
  permissionDefaults: {
    alwaysAllowSafe: boolean;
    autoAllowWriteInProjectScope: boolean;
    codeExecutionAllowed: boolean;
  };
  canvasBehavior: {
    autoOpenOnDocument: boolean;
    autoOpenOnResearch: boolean;
    autoOpenOnProjectMode: boolean;
    defaultTab: string;
  };
  webSearchProvider?: string;
}

export interface AiToolCall {
  id: string;
  name: string;
  args?: any;
  result?: any;
  duration?: number;
  status?: 'success' | 'error';
  displayTitle?: string;
  argsSchema?: { key: string; label: string }[];
}

export interface AiQuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface AiQuestionItem {
  id: string;
  text: string;
  questionType: 'single' | 'multi' | 'text';
  options?: AiQuestionOption[];
}

export interface AiQuestion {
  text: string;
  questionType: 'single' | 'multi' | 'text' | 'batch';
  options?: AiQuestionOption[];
  questions?: AiQuestionItem[];
}

/** Actions that the AI can trigger on the frontend */
export type AiAction =
  | { action: 'open_credentials'; provider: string; providerKey: string }
  | { action: 'open_element'; elementType: string; elementId: string; elementName?: string }
  | { action: 'navigate'; route: string }
  | { action: 'open_node_settings'; flowId: string; nodeId: string };

export interface AiMessageSegment {
  type: 'text' | 'tools';
  content?: string;
  toolCalls?: AiToolCall[];
}

export interface AiMessage {
  _id?: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: AiToolCall[];
  segments?: AiMessageSegment[];
  question?: AiQuestion;
  attachments?: any[];
  answer?: any;
  cancelled?: boolean;
  createdAt?: string;
  metadata?: {
    kind?: 'permission_request' | 'cache_sync_request' | 'comment' | 'system_hint' | 'system_note' | 'structured' | 'plan_proposal' | 'diagram' | 'image_inline' | 'agent_report' | 'canvas_html' | 'file_inline' | 'todo_list';
    canvasHtml?: { html: string; title?: string | null; description?: string | null; height?: number; type?: '2d' | '3d' | 'animation' | 'demo' };
    permissionRequest?: AiPermissionRequest;
    cacheSyncRequest?: AiCacheSyncRequest;
    structured?: AiStructuredPayload;
    planProposal?: AiPlanProposal;
    diagram?: AiDiagramPayload;
    imageInline?: AiInlineImagePayload;
    fileInline?: AiInlineFilePayload;
    todoList?: { todos: Array<{ id: string; content: string; activeForm?: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }>; title?: string; updatedAt?: string | Date };
    agentReport?: AgentReport;
    widgetId?: string;
    widgetUpdatedAt?: string | Date;
    collapse?: { collapsed?: boolean; collapseTitle?: string };
    subagentJobId?: string;
    jobId?: string;
    [k: string]: any;
  };
}

/** Agent report payload (async subagent completion, rendered inline) */
export interface AgentReportArtifact {
  fileId?: string;
  url?: string;
  label?: string;
}
export interface AgentReport {
  jobId?: string;
  subagentType?: string | null;
  parentJobId?: string | null;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  summary?: string;
  artifacts?: AgentReportArtifact[];
  status?: 'completed' | 'error' | 'cancelled';
  toolCount?: number;
  error?: string;
  // Roster (Tim, Ada, Denis, …)
  agentName?: string;
  agentEmoji?: string;
  agentColor?: string;
  agentTagline?: string;
  agentFigure?: string;
}

/** Inline image payload (tool display_image) */
export interface AiInlineImagePayload {
  fileId?: string;
  url?: string;
  caption?: string;
  alt?: string;
}

/** Inline file viewer payload (tool display_file) — docx/xlsx/pptx/pdf */
export interface AiInlineFilePayload {
  fileId: string;
  name?: string;
  mimeType?: string;
  size?: number;
  caption?: string;
  kind?: 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'other';
}

/** Plan proposal structures */
export interface AiPlanStep {
  id: string;
  title: string;
  rationale?: string;
  tools?: string[];
  duration_estimate?: string;
  dependsOn?: string[];
}

export interface AiPlanMissingInfo {
  key: string;
  question: string;
  why?: string;
}

export interface AiPlanProposal {
  requestId: string;
  summary: string;
  steps: AiPlanStep[];
  risks?: string[];
  missingInfo?: AiPlanMissingInfo[];
  missingInfoAnswers?: Record<string, string>;
  answer?: 'approve' | 'reject' | 'modify';
  answeredAt?: string;
  answeredBy?: string;
  approvedSteps?: string[];
  modifiedSteps?: AiPlanStep[];
}

/** Diagram payload (mermaid) */
export interface AiDiagramPayload {
  type: string;
  title?: string;
  mermaid: string;
}

/** Structured interactive message payload — rendered by AiStructuredMessageComponent */
export type AiStructuredLayout =
  | 'chips_tabs'
  | 'stepped_plan'
  | 'comparison_table'
  | 'accordion'
  | 'timeline'
  | 'card_grid';

export interface AiStructuredPayload {
  layout: AiStructuredLayout;
  title?: string;
  data: any;
  renderedAt?: string;
}

export type AiStreamEvent =
  | { type: 'message'; text: string }
  | { type: 'tool.start'; id: string; name: string }
  | { type: 'tool.input_delta'; id: string; name: string; text: string }
  | { type: 'tool.meta'; id: string; displayTitle: string; argsSchema?: { key: string; label: string }[] }
  | { type: 'tool.building_done'; id: string }
  | { type: 'tool.end'; id: string; name: string; args?: any; result?: any; error?: string; status: string; duration?: number; displayTitle?: string }
  | { type: 'question'; text: string; questionType: string; options?: AiQuestionOption[] }
  | { type: 'thread.title'; title: string }
  | { type: 'thread.update'; mode: string; flowId?: string; formId?: string }
  | { type: 'thread.transfer'; threadId: string; title: string; mode: string }
  | { type: 'patch'; ops: any[] }
  | { type: 'snapshot'; graph: any }
  | { type: 'args'; nodeId: string; args: any }
  | { type: 'desc'; nodeId: string; description: string }
  | { type: 'action'; action: string; providerKey?: string; providerName?: string }
  | { type: 'ui.preview.start'; toolId: string; toolName: string; previewType: string }
  | { type: 'ui.preview.delta'; toolId: string; toolName: string; previewType: string; patch: any[]; state?: any }
  | { type: 'ui.preview.building_done'; toolId: string; toolName: string; previewType: string; state?: any }
  | { type: 'ui.preview.update'; toolId: string; toolName: string; patch: any[] }
  | { type: 'error'; code?: string; message?: string }
  | { type: 'done' };

export interface AiPageContext {
  page: 'dashboard' | 'flow-builder' | 'form-builder' | 'settings' | 'other';
  flowId?: string;
  nodeId?: string;
  formId?: string;
  graph?: { nodes: any[]; edges: any[] };
  schema?: any;
}

export interface AiAttachment {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string;  // blob URL for local preview
  uploading?: boolean;
  progress?: number;
  error?: string;
}

export const AI_MAX_FILES = 5;
export const AI_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export interface AiAvailableAgent {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  type: 'system' | 'custom';
  toolCount: number;
  allowedProviders?: string[];
  autonomyLevel?: string;
}

// ── Service ──

@Injectable({ providedIn: 'root' })
export class AiService {
  private wsId = () => this.acl.currentWorkspaceId?.() || '';

  /** Build a full URL for fetch (SSE streaming) — same logic as ApiClientService.buildUrl */
  private buildFetchUrl(path: string): string {
    const root = apiRoot();
    const suffix = apiSuffix();
    const cleanPath = environment.production ? path.replace(/^\/api\b/, '') : path;
    return `${root}${suffix}${cleanPath}`;
  }

  // State
  drawerOpen = signal(false);
  currentThread = signal<AiThread | null>(null);
  messages = signal<AiMessage[]>([]);
  streaming = signal(false);
  pendingQuestion = signal<AiQuestion | null>(null);
  /** Texte assistant qui précède la question (contexte affiché au-dessus de la question pinnée). */
  pendingQuestionContext = signal<string | null>(null);
  /** Si la question vient d'un subagent → bridge la réponse vers son parent. */
  private _pendingSubagentBridge: { requestId: string; parentJobId: string } | null = null;
  pageContext = signal<AiPageContext>({ page: 'other' });
  availableAgents = signal<AiAvailableAgent[]>([]);
  selectedAgentId = signal<string>('general');

  // V2: canvas, preferences, presence
  canvasState = signal<AiCanvasState | null>(null);
  canvasOpen = signal<boolean>(false);
  canvasPinned = signal<boolean>(false);
  /** Subagents actifs (running / waiting_*) — pour indicator live dans le chat */
  activeSubagents = computed(() => {
    const tasks = (this.canvasState()?.tasks || []) as any[];
    return tasks.filter(t => t.jobId && ['running', 'queued', 'waiting_dependency', 'waiting_permission', 'paused'].includes(t.status));
  });
  preferences = signal<AiUserPreferences | null>(null);
  presence = signal<Array<{ userId: string; name?: string; avatar?: string }>>([]);

  // Détection auto de mémoire projet — compteur d'entries pending (badge chat)
  pendingKnowledgeCount = signal<number>(0);
  // Jauge contexte : tokens consommés / limite modèle pour le thread courant.
  contextUsage = signal<{ tokens: number; limit: number; percent: number; model: string; messageCount: number } | null>(null);
  // Event de redirection UI : quand le hint est cliqué, on ouvre les settings
  // sur l'onglet connaissance avec filtre 'pending'.
  openKnowledgePending$ = new Subject<void>();
  /** Pipe : prompt template appliqué → chat l'insère dans l'input. */
  promptTemplateApply$ = new Subject<string>();

  // Action requests — the panel subscribes and opens appropriate modals
  actionRequests$ = new Subject<AiAction>();

  hasThread = computed(() => !!this.currentThread());

  constructor(
    private api: ApiClientService,
    private zone: NgZone,
    private acl: AccessControlService,
    private auth: AuthTokenService,
    private filesBackend: FilesBackendService,
  ) {}

  /** Upload a file for AI chat attachment. Returns a FileRef on success. */
  uploadFile(file: File): Observable<FileRef> {
    return this.filesBackend.uploadSimple(this.wsId(), file, 'permanent');
  }

  /** Build a download/preview URL for a file */
  fileUrl(fileId: string): string {
    return this.filesBackend.downloadUrl(fileId);
  }

  /** Build the inline preview URL (for docx/xlsx/pptx/pdf viewers). */
  filePreviewUrl(fileId: string): string {
    const wsId = this.wsId();
    const q = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : '';
    return `/api/files/${encodeURIComponent(fileId)}/preview${q}`;
  }

  // ── Drawer ──
  openDrawer() { this.drawerOpen.set(true); }
  closeDrawer() { this.drawerOpen.set(false); }
  toggleDrawer() { this.drawerOpen.set(!this.drawerOpen()); }

  // ── Page context (updated by pages) ──
  setPageContext(ctx: AiPageContext) { this.pageContext.set(ctx); }

  // ── Threads ──
  listThreads(filters?: { mode?: string; flowId?: string; formId?: string; page?: number; limit?: number }): Observable<AiThread[]> {
    const params: any = { workspaceId: this.wsId() };
    if (filters?.mode) params.mode = filters.mode;
    if (filters?.flowId) params.flowId = filters.flowId;
    if (filters?.formId) params.formId = filters.formId;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    return this.api.get<AiThread[]>('/api/ai/threads', params);
  }

  async createThread(mode: string, metadata?: any, agentId?: string): Promise<AiThread> {
    const body: any = { mode, title: 'Chat' };
    if (metadata) Object.assign(body, metadata);
    const aid = agentId || this.selectedAgentId();
    if (aid && aid !== 'general') body.agentId = aid;
    // Idem loadThread : on stoppe un éventuel send en cours sur un autre thread.
    if (this._activeSendAbort) {
      try { this._activeSendAbort.abort(); } catch {}
      this._activeSendAbort = undefined;
      this._activeSendThreadId = undefined;
      this.streaming.set(false);
    }
    const thread = await this.api.post<AiThread>('/api/ai/threads', body, { workspaceId: this.wsId() }).toPromise();
    this.currentThread.set(thread!);
    this.messages.set([]);
    this.pendingQuestion.set(null); this.pendingQuestionContext.set(null);
    // Ouvre le stream live pour recevoir les events subagents en temps réel
    this.openThreadLiveStream(thread?.id || thread?._id || '');
    return thread!;
  }

  /** Recharge silencieusement les messages du thread courant (utilisé après render_structured etc.) */
  async reloadThreadMessages() {
    const t = this.currentThread();
    if (!t?.id && !t?._id) return;
    const threadId = t.id || t._id;
    try {
      const data = await this.api.get<any>(`/api/ai/threads/${threadId}`, { workspaceId: this.wsId() }).toPromise();
      const msgs = data?.messages || [];
      if (data?.messages) {
        // Préserve l'état en mémoire des messages actuellement streamés
        // (placeholder resume parent). La version DB est vide ou partielle
        // tant que le stream n'est pas fini — on garde les deltas accumulés.
        if (this._streamingMessageIds.size > 0) {
          const inMem = new Map<string, any>();
          for (const m of this.messages()) {
            const id = String(m._id || '');
            if (id && this._streamingMessageIds.has(id)) inMem.set(id, m);
          }
          for (let i = 0; i < msgs.length; i++) {
            const id = String(msgs[i]._id || '');
            if (inMem.has(id)) msgs[i] = inMem.get(id);
          }
        }
        this.messages.set(msgs);
      }

      // Restaure la pendingQuestion en live : sinon quand un sous-agent crée
      // une question via AiMessage, le formulaire de réponse n'apparaît pas
      // tant que l'user ne refresh pas la page. Même logique que loadThread.
      let restored = false;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.role === 'user') break;
        if (m.role === 'assistant' && m.question && !m.question.answered) {
          this.pendingQuestion.set(m.question);
          const sq = (m.metadata as any)?.extra;
          if (sq?.subagentQuestion && sq?.requestId && sq?.parentJobId && !sq?.answer) {
            this._pendingSubagentBridge = { requestId: sq.requestId, parentJobId: sq.parentJobId };
          } else {
            this._pendingSubagentBridge = null;
          }
          restored = true;
          break;
        }
      }
      if (!restored && this.pendingQuestion()) {
        // La dernière question a été répondue / le subagent a repris → clear
        this.pendingQuestion.set(null); this.pendingQuestionContext.set(null);
        this._pendingSubagentBridge = null;
      }

      // Refresh pending count (au cas où le memory_extractor a créé des entries
      // sans que l'event memory.pending.update soit encore arrivé).
      if (t.mode === 'project') this.refreshPendingKnowledgeCount(threadId);
    } catch (e: any) {
      console.error('[reload] FETCH ERROR:', e?.message || e, e?.status);
    }
  }

  async loadThread(threadId: string) {
    // Si un send POST est en cours sur un autre thread, on l'abort côté client pour
    // stopper la réception d'events (le backend peut continuer pour persister).
    const newIdStr = String(threadId);
    if (this._activeSendAbort && this._activeSendThreadId && this._activeSendThreadId !== newIdStr) {
      try { this._activeSendAbort.abort(); } catch {}
      this._activeSendAbort = undefined;
      this._activeSendThreadId = undefined;
      this.streaming.set(false);
    }
    const data = await this.api.get<any>(`/api/ai/threads/${threadId}`, { workspaceId: this.wsId() }).toPromise();
    this.currentThread.set(data.thread);
    const msgs = data.messages || [];
    this.messages.set(msgs);

    // Ouvre / switch le stream live passif sur ce thread
    this.openThreadLiveStream(data.thread?.id || data.thread?._id || threadId);

    // Restore pending question if last assistant message has an unanswered question
    let restored = false;
    if (msgs.length) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.role === 'user') break;
        if (m.role === 'assistant' && m.question && !m.question.answered) {
          this.pendingQuestion.set(m.question);
          // Si question d'un sous-agent → mémorise pour bridger la réponse
          const sq = (m.metadata as any)?.extra;
          if (sq?.subagentQuestion && sq?.requestId && sq?.parentJobId && !sq?.answer) {
            this._pendingSubagentBridge = { requestId: sq.requestId, parentJobId: sq.parentJobId };
          } else {
            this._pendingSubagentBridge = null;
          }
          restored = true;
          break;
        }
      }
    }
    if (!restored) { this.pendingQuestion.set(null); this._pendingSubagentBridge = null; }

    // Refresh badge pending si thread projet
    this.refreshPendingKnowledgeCount(data.thread?.id || data.thread?._id);
    // Refresh jauge tokens
    this.refreshContextUsage(data.thread?.id || data.thread?._id);
  }

  deleteThread(threadId: string): Observable<any> {
    return this.api.delete<any>(`/api/ai/threads/${threadId}`, { workspaceId: this.wsId() });
  }

  regenerateTitle(threadId: string): Observable<any> {
    return this.api.post<any>(`/api/ai/threads/${threadId}/regenerate-title`, {}, { workspaceId: this.wsId() });
  }

  duplicateThread(threadId: string): Observable<any> {
    return this.api.post<any>(`/api/ai/threads/${threadId}/duplicate`, {}, { workspaceId: this.wsId() });
  }

  updateThread(threadId: string, data: { title?: string; agentId?: string; mode?: string; metadata?: any }): Observable<any> {
    return this.api.put<any>(`/api/ai/threads/${threadId}`, data, { workspaceId: this.wsId() });
  }

  // ── Send message + SSE stream ──
  // Track active send stream pour pouvoir l'aborter au changement de thread
  private _activeSendAbort?: AbortController;
  private _activeSendThreadId?: string;

  sendMessage(content: string, answer?: any, attachments?: any[]): { events$: Observable<AiStreamEvent>; stop: () => void } {
    const thread = this.currentThread();
    if (!thread) throw new Error('No active thread');
    // Si un send précédent tourne encore (pour un autre thread ou le même),
    // on l'abort pour éviter le leak d'events sur la nouvelle conversation.
    try { this._activeSendAbort?.abort(); } catch {}

    this.streaming.set(true);
    this.pendingQuestion.set(null); this.pendingQuestionContext.set(null);

    // Add user message to local state immediately
    const userMsg: AiMessage = { threadId: thread._id, role: 'user', content, attachments, answer };
    this.messages.update(msgs => [...msgs, userMsg]);

    // POST the message — the response is SSE
    const body: any = { content };
    if (answer) body.answer = answer;
    if (attachments) body.attachments = attachments;

    // Include temporary graph/schema so the AI works on the latest unsaved state
    const ctx = this.pageContext();
    if (ctx.page === 'flow-builder' && ctx.graph) body.graph = ctx.graph;
    if (ctx.page === 'form-builder' && ctx.schema) body.schema = ctx.schema;

    const subj = new Subject<AiStreamEvent>();
    const wsId = this.wsId();
    const tok = this.auth.token || '';

    // Use fetch for SSE POST (EventSource only supports GET)
    const capturedThreadId = String(thread.id || thread._id || '');
    const url = this.buildFetchUrl(`/api/ai/threads/${capturedThreadId}/messages?workspaceId=${encodeURIComponent(wsId)}`);
    const abortController = new AbortController();
    this._activeSendAbort = abortController;
    this._activeSendThreadId = capturedThreadId;

    this.streamPost(url, body, tok, abortController.signal, subj, capturedThreadId);

    const threadId = thread.id || thread._id;
    const stop = () => {
      try { abortController.abort(); } catch {}
      // Also tell backend to cancel (in case TCP close isn't detected)
      fetch(this.buildFetchUrl(`/api/ai/threads/${threadId}/cancel?workspaceId=${encodeURIComponent(wsId)}`), {
        method: 'POST', headers: { 'Authorization': `Bearer ${tok}` },
      }).catch(() => {});
      this.streaming.set(false);
      subj.complete();
    };

    return { events$: subj.asObservable(), stop };
  }

  private async streamPost(url: string, body: any, token: string, signal: AbortSignal, subj: Subject<AiStreamEvent>, capturedThreadId?: string) {
    let assistantText = '';
    const toolCalls: AiToolCall[] = [];
    const segments: AiMessageSegment[] = [];
    const argsSchemaMap = new Map<string, { key: string; label: string }[]>();
    const displayTitleMap = new Map<string, string>();

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        this.zone.run(() => {
          subj.next({ type: 'error', code: 'http_error', message: `HTTP ${res.status}: ${errText}` });
          subj.complete();
          this.streaming.set(false);
        });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (finished) break;
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed.startsWith('event:')) continue;
          if (!trimmed.startsWith('data:')) continue;

          let data: any;
          try { data = JSON.parse(trimmed.slice(5).trim()); } catch { continue; }

          this.zone.run(() => {
            if (finished) return;
            // Guard : si le thread courant a changé depuis le lancement de ce stream,
            // on drop les events pour éviter qu'ils pollent la nouvelle conversation.
            const curTid = String(this.currentThread()?.id || this.currentThread()?._id || '');
            const stillActive = !capturedThreadId || !curTid || curTid === capturedThreadId;
            if (!stillActive) return;
            const event = data as AiStreamEvent;
            // Tag l'event pour que les handlers en aval puissent filtrer aussi
            if (capturedThreadId) (event as any)._threadId = capturedThreadId;
            subj.next(event);

            if (event.type === 'message') {
              const txt = (event as any).text || '';
              assistantText += txt;
              // Track segment: append to last text segment or create new one
              let last = segments[segments.length - 1];
              if (!last || last.type !== 'text') {
                last = { type: 'text', content: '' };
                segments.push(last);
              }
              last.content = (last.content || '') + txt;
            }
            if ((event as any).type === 'tool.meta') {
              const metaId = (event as any).id;
              if ((event as any).argsSchema) argsSchemaMap.set(metaId, (event as any).argsSchema);
              if ((event as any).displayTitle) displayTitleMap.set(metaId, (event as any).displayTitle);
            }
            if (event.type === 'tool.end') {
              const evId = (event as any).id;
              const tc: AiToolCall = {
                id: evId,
                name: (event as any).name,
                args: (event as any).args,
                result: (event as any).result,
                duration: (event as any).duration,
                status: (event as any).status,
                displayTitle: (event as any).displayTitle || displayTitleMap.get(evId),
                argsSchema: argsSchemaMap.get(evId),
              };
              toolCalls.push(tc);
              // Track segment: append to last tools segment or create new one
              let last = segments[segments.length - 1];
              if (!last || last.type !== 'tools') {
                last = { type: 'tools', toolCalls: [] };
                segments.push(last);
              }
              last.toolCalls = [...(last.toolCalls || []), tc];
            }
            if (event.type === 'question') {
              this.pendingQuestion.set({
                text: (event as any).text,
                questionType: (event as any).questionType || 'text',
                options: (event as any).options,
                questions: (event as any).questions,
              });
              // Stocke le texte assistant accumulé avant la question pour
              // l'afficher au-dessus de la card question pinnée (contexte user).
              const ctx = (assistantText || '').trim();
              this.pendingQuestionContext.set(ctx || null);
            }
            if ((event as any).type === 'thread.title') {
              const cur = this.currentThread();
              if (cur) {
                this.currentThread.set({ ...cur, title: (event as any).title });
              }
            }
            if ((event as any).type === 'thread.update') {
              const cur = this.currentThread();
              if (cur) {
                const updated = { ...cur };
                if ((event as any).mode) updated.mode = (event as any).mode;
                if ((event as any).flowId) updated.flowId = (event as any).flowId;
                if ((event as any).formId) {
                  if (!updated.metadata) updated.metadata = {};
                  updated.metadata.formId = (event as any).formId;
                }
                this.currentThread.set(updated);
              }
            }
            if ((event as any).type === 'action') {
              this.actionRequests$.next(event as any);
            }
            // V2 canvas events
            const evType = (event as any).type as string;
            if (evType && evType.startsWith('canvas.')) {
              this.handleCanvasEvent(event as any);
              this.sideEvents$.next(event as any);
            }
            if (evType === 'ai.permission.request' || evType === 'ai.permission.granted' || evType === 'ai.permission.denied') {
              this.sideEvents$.next(event as any);
            }
            if (evType === 'ai.plan.request' || evType === 'plan.resolved') {
              // Forward side event + refresh messages so plan_proposal card appears
              this.sideEvents$.next(event as any);
              const curThread = this.currentThread();
              const tid = curThread?.id || curThread?._id;
              if (tid) {
                setTimeout(() => { this.loadThread(tid).catch?.(() => {}); }, 150);
              }
            }
            if (evType === 'ai.message.created') {
              console.log('[ai-stream] ai.message.created received', (event as any).kind);
              this.sideEvents$.next(event as any);
              this.reloadThreadMessages().catch?.(() => {});
            }
            if (evType === 'ai.message.updated') {
              console.log('[ai-stream] ai.message.updated received', (event as any).kind);
              this.sideEvents$.next(event as any);
              this.reloadThreadMessages().catch?.(() => {});
            }
            if (evType === 'thread.presence') {
              try {
                const list = (event as any).users || [];
                this.presence.set(list);
              } catch {}
            }
            if ((event as any).type === 'memory.pending.update') {
              // Événement émis par le hook memory-extractor (fin du subagent) :
              // rafraîchit immédiatement le badge pending dans le header chat.
              const cnt = (event as any).pendingCount;
              if (typeof cnt === 'number') this.pendingKnowledgeCount.set(cnt);
              // Recharge aussi les messages pour afficher le system_hint si créé
              this.reloadThreadMessages().catch?.(() => {});
            }
            if ((event as any).type === 'thread.transfer') {
              // Auto-switch to new thread after stream completes
              const transferId = (event as any).threadId;
              if (transferId) {
                setTimeout(() => this.loadThread(transferId), 500);
              }
            }
            if (event.type === 'done') {
              finished = true;
              // Add assistant message with segments preserving execution order
              if (assistantText || toolCalls.length) {
                const assistantMsg: AiMessage = {
                  threadId: this.currentThread()?._id || '',
                  role: 'assistant',
                  content: assistantText,
                  toolCalls: toolCalls.length ? [...toolCalls] : undefined,
                  segments: segments.length ? [...segments] : undefined,
                  question: this.pendingQuestion() || undefined,
                };
                this.messages.update(msgs => [...msgs, assistantMsg]);
              }
              this.streaming.set(false);
              // Refresh jauge tokens dès la fin du stream
              const curTh = this.currentThread();
              const tidNow = curTh?.id || curTh?._id;
              if (tidNow) this.refreshContextUsage(tidNow);
              // Mode project : le memory_extractor finit après le stream principal (30-60s).
              if (curTh?.mode === 'project') {
                setTimeout(() => this.refreshPendingKnowledgeCount(tidNow), 30_000);
                setTimeout(() => this.refreshPendingKnowledgeCount(tidNow), 75_000);
              }
              subj.complete();
            }
          });
        }
      }

      // Stream ended without explicit done
      this.zone.run(() => {
        this.streaming.set(false);
        if (!subj.closed) subj.complete();
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // Stream was intentionally cancelled — add partial message with cancelled flag
        this.zone.run(() => {
          if (assistantText || toolCalls.length) {
            const assistantMsg: AiMessage = {
              threadId: this.currentThread()?._id || '',
              role: 'assistant',
              content: assistantText,
              toolCalls: toolCalls.length ? [...toolCalls] : undefined,
              segments: segments.length ? [...segments] : undefined,
              cancelled: true,
            };
            this.messages.update(msgs => [...msgs, assistantMsg]);
          }
        });
        return;
      }
      this.zone.run(() => {
        subj.next({ type: 'error', code: 'stream_error', message: e?.message || 'Connection failed' });
        this.streaming.set(false);
        subj.complete();
      });
    }
  }

  // ── Answer a question (continue conversation) ──
  answerQuestion(value: any) {
    const q = this.pendingQuestion();
    if (!q) return;
    this.pendingQuestion.set(null); this.pendingQuestionContext.set(null);
    // Build visible content from answer
    let content = '';
    if (value.text) content = value.text;
    else if (value.label) content = value.label;
    else if (value.values) content = value.values.join(', ');
    else if (value.batchAnswers) content = Object.values(value.batchAnswers).join(', ');
    else if (value.value) content = String(value.value);
    // Bridge subagent : si la question venait d'un sous-agent, on émet la réponse
    // directement à son parent au lieu de relancer l'agent principal.
    if (this._pendingSubagentBridge) {
      const bridge = this._pendingSubagentBridge;
      this._pendingSubagentBridge = null;
      const tid = this.currentThread()?.id || this.currentThread()?._id;
      if (tid) {
        this.api.post<any>(
          `/api/ai/threads/${tid}/subagent-answer`,
          { requestId: bridge.requestId, parentJobId: bridge.parentJobId, answer: content || value },
          { workspaceId: this.wsId() },
        ).subscribe({
          next: () => { this.reloadThreadMessages().catch?.(() => {}); },
          error: (e) => console.error('[ai] subagent answer failed:', e?.message),
        });
      }
      // Pas de fake observable — on retourne juste rien, le subagent reprend
      return null as any;
    }
    return this.sendMessage(content, { questionText: q.text, value });
  }

  // ── Action answer (e.g. credential created) ──
  answerAction(actionType: string, result: any) {
    this.pendingQuestion.set(null); this.pendingQuestionContext.set(null);
    return this.sendMessage('', { actionType, result });
  }

  // ── Context ──
  getContext(): Observable<any> {
    return this.api.get<any>('/api/ai/context', { workspaceId: this.wsId() });
  }

  updateCompanyContext(data: any): Observable<any> {
    return this.api.put<any>('/api/ai/context/company', data, { workspaceId: this.wsId() });
  }

  updateWorkspaceContext(data: any): Observable<any> {
    return this.api.put<any>('/api/ai/context/workspace', data, { workspaceId: this.wsId() });
  }

  updateUserContext(data: any): Observable<any> {
    return this.api.put<any>('/api/ai/context/user', data, { workspaceId: this.wsId() });
  }

  // ── Preferences ──
  updatePreferences(prefs: Record<string, any>): Observable<any> {
    return this.api.put<any>('/api/ai/context/user', { preferences: prefs }, { workspaceId: this.wsId() });
  }

  // ── Memory ──
  deleteMemoryKey(key: string): Observable<any> {
    return this.api.put<any>('/api/ai/context/user', { memory: { [key]: null } }, { workspaceId: this.wsId() });
  }

  updateMemoryKey(key: string, value: any): Observable<any> {
    return this.api.put<any>('/api/ai/context/user', { memory: { [key]: value } }, { workspaceId: this.wsId() });
  }

  // ── Project memory (per flow/form) ──
  getProjectMemory(elementType: 'flow' | 'form', elementId: string): Observable<any> {
    return this.api.get<any>(`/api/ai/project-memory/${elementType}/${elementId}`, { workspaceId: this.wsId() });
  }

  updateProjectMemory(elementType: 'flow' | 'form', elementId: string, memory: Record<string, any>): Observable<any> {
    return this.api.put<any>(`/api/ai/project-memory/${elementType}/${elementId}`, { memory }, { workspaceId: this.wsId() });
  }

  deleteProjectMemoryKey(elementType: 'flow' | 'form', elementId: string, key: string): Observable<any> {
    return this.api.put<any>(`/api/ai/project-memory/${elementType}/${elementId}`, { memory: { [key]: null } }, { workspaceId: this.wsId() });
  }

  // ── Project knowledge (structured key/value, per thread) ──
  getProjectKnowledge(threadId: string): Observable<AiProjectKnowledge> {
    return this.api.get<AiProjectKnowledge>(`/api/ai/threads/${threadId}/knowledge`, { workspaceId: this.wsId() });
  }

  replaceProjectKnowledge(threadId: string, entries: AiProjectKnowledgeEntry[]): Observable<AiProjectKnowledge> {
    return this.api.put<AiProjectKnowledge>(`/api/ai/threads/${threadId}/knowledge`, { entries }, { workspaceId: this.wsId() });
  }

  addKnowledgeEntry(threadId: string, entry: AiProjectKnowledgeEntry): Observable<AiProjectKnowledgeEntry> {
    return this.api.post<AiProjectKnowledgeEntry>(`/api/ai/threads/${threadId}/knowledge/entries`, entry, { workspaceId: this.wsId() });
  }

  updateKnowledgeEntry(threadId: string, entryId: string, patch: Partial<AiProjectKnowledgeEntry>): Observable<AiProjectKnowledgeEntry> {
    return this.api.patch<AiProjectKnowledgeEntry>(`/api/ai/threads/${threadId}/knowledge/entries/${entryId}`, patch, { workspaceId: this.wsId() });
  }

  deleteKnowledgeEntry(threadId: string, entryId: string): Observable<any> {
    return this.api.delete<any>(`/api/ai/threads/${threadId}/knowledge/entries/${entryId}`, { workspaceId: this.wsId() });
  }

  importKnowledge(threadId: string, format: 'csv' | 'json', data: string | object, mode: 'merge' | 'replace' = 'merge'): Observable<any> {
    return this.api.post<any>(`/api/ai/threads/${threadId}/knowledge/import`, { format, data, mode }, { workspaceId: this.wsId() });
  }

  // ── Pending workflow (auto-detection) ──
  getProjectKnowledgeFiltered(threadId: string, status: 'all' | AiProjectKnowledgeStatus): Observable<AiProjectKnowledge> {
    return this.api.get<AiProjectKnowledge>(`/api/ai/threads/${threadId}/knowledge`, { workspaceId: this.wsId(), status });
  }

  getPendingKnowledgeCount(threadId: string): Observable<{ count: number }> {
    return this.api.get<{ count: number }>(`/api/ai/threads/${threadId}/knowledge/pending-count`, { workspaceId: this.wsId() });
  }

  approveKnowledgeEntry(threadId: string, entryId: string, patch?: Partial<AiProjectKnowledgeEntry>): Observable<AiProjectKnowledgeEntry> {
    return this.api.post<AiProjectKnowledgeEntry>(`/api/ai/threads/${threadId}/knowledge/entries/${entryId}/approve`, patch || {}, { workspaceId: this.wsId() });
  }

  rejectKnowledgeEntry(threadId: string, entryId: string): Observable<AiProjectKnowledgeEntry> {
    return this.api.post<AiProjectKnowledgeEntry>(`/api/ai/threads/${threadId}/knowledge/entries/${entryId}/reject`, {}, { workspaceId: this.wsId() });
  }

  /**
   * Supprime un message user + tous les messages suivants du thread, puis
   * renvoie le nouveau content comme s'il venait d'être envoyé par l'user.
   * Utilisé pour l'inline edit : corrige une question → régénère la réponse.
   */
  // ── Prompt templates ──
  listPromptTemplates(opts: { q?: string; category?: string; sort?: 'popular' | 'recent' | 'alpha' } = {}): Observable<any> {
    const params: any = { workspaceId: this.wsId() };
    if (opts.q) params.q = opts.q;
    if (opts.category) params.category = opts.category;
    if (opts.sort) params.sort = opts.sort;
    return this.api.get<any>(`/api/ai/prompt-templates`, params);
  }
  createPromptTemplate(data: any): Observable<any> {
    return this.api.post<any>(`/api/ai/prompt-templates`, data, { workspaceId: this.wsId() });
  }
  updatePromptTemplate(id: string, data: any): Observable<any> {
    return this.api.put<any>(`/api/ai/prompt-templates/${id}`, data, { workspaceId: this.wsId() });
  }
  deletePromptTemplate(id: string): Observable<any> {
    return this.api.delete<any>(`/api/ai/prompt-templates/${id}`, { workspaceId: this.wsId() });
  }
  usePromptTemplate(id: string): Observable<any> {
    return this.api.post<any>(`/api/ai/prompt-templates/${id}/use`, {}, { workspaceId: this.wsId() });
  }

  // ── User skills (marketplace) ──
  listUserSkills(opts: { q?: string; language?: string; sort?: 'popular' | 'recent' | 'alpha' } = {}): Observable<any> {
    const params: any = { workspaceId: this.wsId() };
    if (opts.q) params.q = opts.q;
    if (opts.language) params.language = opts.language;
    if (opts.sort) params.sort = opts.sort;
    return this.api.get<any>(`/api/ai/user-skills`, params);
  }
  createUserSkill(data: any): Observable<any> {
    return this.api.post<any>(`/api/ai/user-skills`, data, { workspaceId: this.wsId() });
  }
  updateUserSkill(id: string, data: any): Observable<any> {
    return this.api.put<any>(`/api/ai/user-skills/${id}`, data, { workspaceId: this.wsId() });
  }
  deleteUserSkill(id: string): Observable<any> {
    return this.api.delete<any>(`/api/ai/user-skills/${id}`, { workspaceId: this.wsId() });
  }
  forkUserSkill(id: string): Observable<any> {
    return this.api.post<any>(`/api/ai/user-skills/${id}/fork`, {}, { workspaceId: this.wsId() });
  }
  useUserSkill(id: string): Observable<any> {
    return this.api.post<any>(`/api/ai/user-skills/${id}/use`, {}, { workspaceId: this.wsId() });
  }

  async editAndResendUserMessage(messageId: string, newContent: string) {
    const t = this.currentThread();
    const tid = t?.id || t?._id;
    if (!tid) throw new Error('No active thread');
    // Delete cascade depuis ce message
    await this.api.delete(`/api/ai/threads/${tid}/messages/${messageId}`, { workspaceId: this.wsId() }).toPromise();
    // Reload pour refléter la suppression
    await this.reloadThreadMessages();
    // Re-send le contenu édité
    return this.sendMessage(newContent);
  }

  /** Refresh la jauge tokens de la conversation courante. */
  refreshContextUsage(threadId?: string): void {
    const tid = threadId || this.currentThread()?.id || this.currentThread()?._id;
    if (!tid) { this.contextUsage.set(null); return; }
    this.api.get<any>(`/api/ai/threads/${tid}/usage`, { workspaceId: this.wsId() }).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        if (data && typeof data.tokens === 'number') this.contextUsage.set(data);
      },
      error: () => { /* silencieux */ },
    });
  }

  /** Refresh le compteur de pending entries (badge chat). No-op si pas de thread ou mode != project. */
  refreshPendingKnowledgeCount(threadId?: string): void {
    const t = this.currentThread();
    const tid = threadId || t?.id || t?._id;
    if (!tid || !t || t.mode !== 'project') {
      this.pendingKnowledgeCount.set(0);
      return;
    }
    this.getPendingKnowledgeCount(tid).subscribe({
      next: (res: any) => {
        const count = (res?.data?.count ?? res?.count ?? 0) as number;
        this.pendingKnowledgeCount.set(count);
      },
      error: () => this.pendingKnowledgeCount.set(0),
    });
  }

  async exportKnowledge(threadId: string, format: 'csv' | 'json' = 'json'): Promise<Blob> {
    const token = this.auth.token;
    const base = this.buildFetchUrl(`/api/ai/threads/${threadId}/knowledge/export`);
    const url = `${base}?format=${format}&workspaceId=${encodeURIComponent(this.wsId())}`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    return res.blob();
  }

  // ── Agents ──
  loadAvailableAgents(): Observable<AiAvailableAgent[]> {
    const obs = this.api.get<AiAvailableAgent[]>('/api/ai/agents/available', { workspaceId: this.wsId() });
    obs.subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.availableAgents.set(list);
      },
      error: () => this.availableAgents.set([]),
    });
    return obs;
  }

  createAgent(data: { name: string; description?: string; systemPrompt?: string; allowedProviders?: string[]; workspaceId?: string; toolGroups?: string[]; blockedTools?: string[]; maxToolLoops?: number; routerBehavior?: string; autonomyLevel?: string }): Observable<any> {
    return this.api.post<any>('/api/ai/agents', data, { workspaceId: this.wsId() });
  }

  updateAgent(agentId: string, data: any): Observable<any> {
    return this.api.put<any>(`/api/ai/agents/${agentId}`, data, { workspaceId: this.wsId() });
  }

  deleteAgent(agentId: string): Observable<any> {
    return this.api.delete<any>(`/api/ai/agents/${agentId}`, { workspaceId: this.wsId() });
  }

  // ── Tools ──
  searchTools(query: string, provider?: string): Observable<any> {
    const params: any = { q: query, workspaceId: this.wsId() };
    if (provider) params.provider = provider;
    return this.api.get<any>('/api/ai/tools', params);
  }

  /** Fetch full template details by key (for exec-result-dialog schema resolution) */
  getTemplateDetails(key: string): Observable<any> {
    return this.api.get<any>(`/api/ai/tools/${encodeURIComponent(key)}`, { workspaceId: this.wsId() });
  }

  // ── Side events for builders ──
  sideEvents$ = new Subject<AiStreamEvent>();

  /** Emit a side event that builders can subscribe to */
  emitSideEvent(ev: AiStreamEvent) { this.sideEvents$.next(ev); }

  // ── Quick send (auto-create thread if needed) ──
  async quickSend(content: string, mode?: string, attachments?: AiAttachment[]) {
    if (!this.currentThread()) {
      // Auto-detect mode and metadata from page context
      const ctx = this.pageContext();
      const autoMode = mode || this.modeFromContext(ctx);
      const meta: any = {};
      if (ctx.flowId) meta.flowId = ctx.flowId;
      if (ctx.formId) meta.formId = ctx.formId;
      if (ctx.nodeId) meta.nodeId = ctx.nodeId;
      await this.createThread(autoMode, Object.keys(meta).length ? meta : undefined);
    }
    // Convert AiAttachments to the backend format (only fileId, name, mimeType, size)
    const attForBackend = attachments?.length
      ? attachments.map(a => ({ fileId: a.fileId, name: a.name, mimeType: a.mimeType, size: a.size }))
      : undefined;
    return this.sendMessage(content, undefined, attForBackend);
  }

  /** Determine the best AI mode based on the current page context */
  private modeFromContext(ctx: AiPageContext): string {
    if (ctx.page === 'flow-builder') {
      return ctx.nodeId ? 'node_args' : 'workflow';
    }
    if (ctx.page === 'form-builder') return 'form';
    return 'chat';
  }

  // Preference: auto-load linked thread when opening drawer in builder context
  // 'auto' = load automatically, 'ask' = ask first, 'never' = always new
  autoLoadLinkedThread = signal<'auto' | 'ask' | 'never'>('auto');

  /** Open the AI drawer with context from the current page.
   *  If a linked thread exists for the current flow/form, auto-load it. */
  async openWithContext(ctx?: Partial<AiPageContext>) {
    if (ctx) {
      this.setPageContext({ ...this.pageContext(), ...ctx } as AiPageContext);
    }
    const fullCtx = this.pageContext();

    // Try to find a linked thread for the current flow/form
    const filters: any = {};
    if (fullCtx.flowId) filters.flowId = fullCtx.flowId;
    else if (fullCtx.formId) filters.formId = fullCtx.formId;

    if (Object.keys(filters).length && this.autoLoadLinkedThread() !== 'never') {
      this.drawerOpen.set(true);
      try {
        const res: any = await this.listThreads(filters).toPromise();
        const threads = res?.data || res || [];
        if (threads.length) {
          // Found linked thread(s) — load the most recent one
          const latest = threads[0]; // already sorted by updatedAt desc
          await this.loadThread(latest.id || latest._id);
          return;
        }
      } catch {}
    }

    // No linked thread found or preference is 'never' — open fresh
    this.currentThread.set(null);
    this.messages.set([]);
    this.pendingQuestion.set(null); this.pendingQuestionContext.set(null);
    this.drawerOpen.set(true);
  }

  // ─────────────────────────────────────────────
  // V2 — Canvas event handling
  // ─────────────────────────────────────────────

  private handleCanvasEvent(event: any) {
    const type = event.type as string;
    const thread = this.currentThread();
    const threadId = thread?._id || thread?.id || event.threadId;
    const cur: AiCanvasState = this.canvasState() || {
      threadId: threadId || '',
      activeTab: 'document',
    };

    switch (type) {
      case 'canvas.switch_tab': {
        this.canvasState.set({ ...cur, activeTab: event.tab || cur.activeTab });
        // Ne force l'ouverture que sur desktop. Sur mobile, l'user doit ouvrir
        // manuellement pour éviter de bloquer l'écran pendant qu'il lit le chat.
        if (!this._isMobile()) this.canvasOpen.set(true);
        break;
      }
      case 'canvas.document.update': {
        this.canvasState.set({
          ...cur,
          document: {
            ...(cur.document || {}),
            format: event.format || cur.document?.format,
            title: event.title || cur.document?.title,
            previewHtml: event.previewHtml !== undefined ? event.previewHtml : cur.document?.previewHtml,
            rawMermaid: event.rawMermaid !== undefined ? event.rawMermaid : cur.document?.rawMermaid,
            updatedAt: new Date().toISOString(),
          },
        });
        this.autoOpenCanvasFor('document');
        break;
      }
      case 'canvas.document.done': {
        this.canvasState.set({
          ...cur,
          document: {
            ...(cur.document || {}),
            fileId: event.fileId,
            format: event.format || cur.document?.format,
            title: event.title || cur.document?.title,
            previewHtml: event.previewHtml || cur.document?.previewHtml,
            updatedAt: new Date().toISOString(),
          },
        });
        this.autoOpenCanvasFor('document');
        break;
      }
      case 'canvas.research.step': {
        const steps = cur.research?.steps ? [...cur.research.steps] : [];
        const existingIdx = steps.findIndex(s => s.id === event.id);
        const step = {
          id: event.id,
          type: event.stepType || event.type_ || 'search',
          status: event.status || 'running',
          title: event.title,
          url: event.url,
          snippet: event.snippet,
          resultPreview: event.resultPreview,
        };
        if (existingIdx >= 0) steps[existingIdx] = { ...steps[existingIdx], ...step } as any;
        else steps.push(step as any);
        this.canvasState.set({
          ...cur,
          research: { query: event.query || cur.research?.query, steps },
        });
        this.autoOpenCanvasFor('research');
        break;
      }
      case 'canvas.task.create': {
        const tasks = cur.tasks ? [...cur.tasks] : [];
        // Support both shapes: { task: {...} } (new subagent live) and flat
        const src = event.task || event;
        const taskId = src.id;
        if (!taskId) break;
        // Upsert by id
        const existingIdx = tasks.findIndex(t => t.id === taskId);
        const newTask: any = {
          id: taskId,
          jobId: src.jobId || taskId,
          subject: src.subject || src.title || src.prompt || 'Sous-agent',
          description: src.description || src.prompt || '',
          subagentType: src.subagentType,
          status: src.status || 'queued',
          parentTaskId: src.parentJobId || src.parentTaskId,
          startedAt: src.startedAt || new Date().toISOString(),
          toolCalls: [],
        };
        if (existingIdx >= 0) tasks[existingIdx] = { ...tasks[existingIdx], ...newTask };
        else tasks.push(newTask);
        this.canvasState.set({ ...cur, tasks });
        break;
      }
      case 'canvas.task.update': {
        const tasks = cur.tasks ? [...cur.tasks] : [];
        const targetId = event.taskId || event.id;
        const idx = tasks.findIndex(t => t.id === targetId || t.jobId === targetId);
        if (idx >= 0) {
          tasks[idx] = {
            ...tasks[idx],
            status: event.status || tasks[idx].status,
            description: event.description || tasks[idx].description,
            finishedAt: event.finishedAt || ((event.status === 'completed' || event.status === 'error') ? new Date().toISOString() : tasks[idx].finishedAt),
            ...(event.duration != null ? { duration: event.duration } : {}),
            ...(event.error ? { error: event.error } : {}),
            toolCalls: event.toolCalls || tasks[idx].toolCalls,
          } as any;
          this.canvasState.set({ ...cur, tasks });
        }
        break;
      }
      case 'canvas.task.toolcall': {
        const tasks = cur.tasks ? [...cur.tasks] : [];
        const targetId = event.taskId;
        const idx = tasks.findIndex(t => t.id === targetId || t.jobId === targetId);
        if (idx >= 0) {
          const calls = Array.isArray(tasks[idx].toolCalls) ? [...tasks[idx].toolCalls!] : [];
          calls.push({
            id: `${targetId}_${Date.now()}_${calls.length}`,
            name: event.toolName || 'tool',
            status: event.status || 'success',
            duration: event.duration,
            argsSummary: event.argsSummary,
            resultSummary: event.resultSummary,
            at: event.at || new Date().toISOString(),
          });
          tasks[idx] = { ...tasks[idx], toolCalls: calls };
          this.canvasState.set({ ...cur, tasks });
        }
        break;
      }
      case 'canvas.files.tree': {
        this.canvasState.set({
          ...cur,
          files: {
            rootLabel: event.rootLabel || cur.files?.rootLabel || '',
            tree: event.tree,
            lastRefreshedAt: new Date().toISOString(),
          },
        });
        break;
      }
      case 'canvas.file.conflict': {
        // emit via sideEvents for dialog handling
        break;
      }
    }
  }

  private autoOpenCanvasFor(kind: 'document' | 'research' | 'project') {
    // Sur mobile : JAMAIS d'auto-open du canvas — ça couvre tout l'écran et
    // bloque le chat. L'user doit explicitement tapper le bouton canvas.
    if (this._isMobile()) return;
    const p = this.preferences();
    if (!p) {
      this.canvasOpen.set(true);
      return;
    }
    const cb = p.canvasBehavior;
    if (kind === 'document' && cb?.autoOpenOnDocument) this.canvasOpen.set(true);
    if (kind === 'research' && cb?.autoOpenOnResearch) this.canvasOpen.set(true);
    if (kind === 'project' && cb?.autoOpenOnProjectMode) this.canvasOpen.set(true);
  }

  private _isMobile(): boolean {
    try { return typeof window !== 'undefined' && window.innerWidth <= 900; }
    catch { return false; }
  }

  openCanvas() { this.canvasOpen.set(true); }
  closeCanvas() { this.canvasOpen.set(false); }
  toggleCanvas() { this.canvasOpen.set(!this.canvasOpen()); }
  togglePinCanvas() { this.canvasPinned.set(!this.canvasPinned()); }
  setCanvasTab(tab: 'document' | 'research' | 'workplan' | 'artifacts' | 'files') {
    const cur = this.canvasState();
    if (cur) this.canvasState.set({ ...cur, activeTab: tab });
  }

  // ─────────────────────────────────────────────
  // V2 — Project roots
  // ─────────────────────────────────────────────

  async createProjectRoot(threadId: string, payload: Partial<AiProjectRoot>): Promise<{ root: AiProjectRoot }> {
    return (await this.api.post<{ root: AiProjectRoot }>(
      `/api/ai/threads/${threadId}/project-root`,
      payload,
      { workspaceId: this.wsId() },
    ).toPromise())!;
  }

  async getProjectRoot(threadId: string): Promise<{ root?: AiProjectRoot; tree?: any }> {
    return (await this.api.get<any>(
      `/api/ai/threads/${threadId}/project-root`,
      { workspaceId: this.wsId() },
    ).toPromise()) || {};
  }

  async updateProjectRoot(threadId: string, payload: Partial<AiProjectRoot>) {
    return this.api.put<any>(
      `/api/ai/threads/${threadId}/project-root`,
      payload,
      { workspaceId: this.wsId() },
    ).toPromise();
  }

  async refreshProjectRoot(threadId: string) {
    const resp = await this.api.post<any>(
      `/api/ai/threads/${threadId}/project-root/refresh`,
      {},
      { workspaceId: this.wsId() },
    ).toPromise();
    // Met à jour le signal canvas avec l'arbo fraîche pour le panneau Fichiers
    const tree = resp?.tree;
    const rootLabel = resp?.rootLabel || 'Projet';
    if (tree) {
      const cur = this.canvasState() || { threadId, activeTab: 'files' as const };
      this.canvasState.set({
        ...cur,
        threadId,
        files: { rootLabel, tree, lastRefreshedAt: new Date().toISOString() },
      });
    }
    return resp;
  }

  async deleteProjectRoot(threadId: string) {
    return this.api.delete<any>(
      `/api/ai/threads/${threadId}/project-root`,
      { workspaceId: this.wsId() },
    ).toPromise();
  }

  listProjectConnectors(): Observable<Array<{ type: string; label: string; requiresCredential: boolean; credentialOptions: any[] }>> {
    return this.api.get<any>(`/api/ai/project-connectors`, { workspaceId: this.wsId() });
  }

  browseProjectPath(connectorType: string, credentialId: string, path: string = '/'): Observable<any> {
    return this.api.get<any>(`/api/ai/project-connectors/browse`, {
      workspaceId: this.wsId(),
      connectorType,
      credentialId,
      path,
    });
  }

  // ─────────────────────────────────────────────
  // V2 — Canvas
  // ─────────────────────────────────────────────

  async loadCanvas(threadId: string) {
    try {
      const data = await this.api.get<AiCanvasState>(
        `/api/ai/threads/${threadId}/canvas`,
        { workspaceId: this.wsId() },
      ).toPromise();
      if (data) this.canvasState.set(data as any);
    } catch {}
  }

  async resetCanvas(threadId: string) {
    await this.api.post<any>(
      `/api/ai/threads/${threadId}/canvas/reset`,
      {},
      { workspaceId: this.wsId() },
    ).toPromise();
    this.canvasState.set(null);
  }

  async exportCanvasDocument(threadId: string): Promise<{ fileId?: string; url?: string }> {
    return (await this.api.post<any>(
      `/api/ai/threads/${threadId}/canvas/export`,
      {},
      { workspaceId: this.wsId() },
    ).toPromise()) || {};
  }

  // ─────────────────────────────────────────────
  // V2 — Jobs
  // ─────────────────────────────────────────────

  listJobs(threadId: string): Observable<AiJob[]> {
    return this.api.get<AiJob[]>(`/api/ai/threads/${threadId}/jobs`, { workspaceId: this.wsId() });
  }

  async listThreadFiles(threadId: string): Promise<Array<{ id: string; name: string; mimeType: string; size: number; createdAt?: string; origin?: string }>> {
    try {
      return await this.api.get<any>(`/api/ai/threads/${threadId}/files`, { workspaceId: this.wsId() }).toPromise() || [];
    } catch { return []; }
  }

  getJob(jobId: string): Observable<AiJob> {
    return this.api.get<AiJob>(`/api/ai/jobs/${jobId}`, { workspaceId: this.wsId() });
  }

  // ── Stream live passif du thread ──
  // Ouvre un SSE GET qui reçoit les events subagents en background (canvas.*,
  // ai.message.created, memory.pending.update, agent_report…) même quand aucun
  // POST /messages n'est actif. Permet à la page de voir la progression des
  // jobs async sans avoir à reload.
  private _threadStreamCtrl?: AbortController;
  private _threadStreamId?: string;
  // Debounce reload messages : évite le storm de fetchs quand plusieurs widgets
  // (todos, structured, canvas...) s'updatent en séquence rapide. Un seul reload
  // par burst de 400ms, qui capte la dernière version de tous les events.
  private _reloadMsgTimer?: any;
  private _reloadMsgPending = false;
  // IDs des messages actuellement en cours de streaming (placeholder resume parent).
  // Quand un reload DB arrive, on NE remplace PAS ces messages par la version DB
  // (qui serait vide pendant le stream) — on garde le contenu accumulé en mémoire.
  private _streamingMessageIds = new Set<string>();

  /**
   * Programme un reloadThreadMessages debounced. Coalesce les rafales d'events
   * (ex: 3 subagents qui émettent 20 widgets à la seconde) en 1 seul fetch.
   */
  scheduleReloadMessages(delayMs = 400): void {
    this._reloadMsgPending = true;
    if (this._reloadMsgTimer) return;
    this._reloadMsgTimer = setTimeout(() => {
      this._reloadMsgTimer = undefined;
      if (!this._reloadMsgPending) return;
      this._reloadMsgPending = false;
      this.reloadThreadMessages().catch?.(() => {});
    }, delayMs);
  }

  private openThreadLiveStream(threadId: string) {
    if (!threadId) return;
    if (this._threadStreamId === threadId && this._threadStreamCtrl) return; // déjà ouvert
    // Ferme l'ancien
    try { this._threadStreamCtrl?.abort(); } catch {}
    this._threadStreamCtrl = undefined;
    this._threadStreamId = threadId;

    // Boucle de reconnexion : si le serveur ferme la connexion (timeout,
    // redémarrage, etc.) sans que l'user ait explicitement quitté le thread,
    // on reconnecte automatiquement avec backoff. Sans ça, les events live
    // (todo_write, ai.message.updated) ne remontent plus et il faut refresh
    // la page pour les voir.
    const attemptConnect = async (retryDelay: number): Promise<void> => {
      // Abandonné si user a changé de thread entretemps
      if (this._threadStreamId !== threadId) return;
      const ctrl = new AbortController();
      this._threadStreamCtrl = ctrl;
      const url = this.buildFetchUrl(`/api/ai/threads/${threadId}/stream?workspaceId=${encodeURIComponent(this.wsId())}`);
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${this.auth.token || ''}` },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error(`stream HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            try {
              const ev = JSON.parse(t.slice(5).trim());
              this.zone.run(() => this.dispatchLiveThreadEvent(ev));
            } catch {}
          }
        }
        // Le serveur a fermé proprement (done=true) → on reconnecte rapidement
        if (this._threadStreamId === threadId && !ctrl.signal.aborted) {
          setTimeout(() => attemptConnect(1000), 500);
        }
      } catch (e: any) {
        // AbortError = user a changé de thread/quitté → on arrête
        if (ctrl.signal.aborted || e?.name === 'AbortError') return;
        // Erreur réseau / HTTP → backoff exponentiel (1s → 2s → 4s → max 10s)
        const next = Math.min(retryDelay * 2, 10_000);
        if (this._threadStreamId === threadId) {
          setTimeout(() => attemptConnect(next), retryDelay);
        }
      }
    };
    attemptConnect(1000);
  }

  /** Dispatch un event reçu du stream passif — ne dédoublonne pas avec POST /messages
   * (doublons supportés par les handlers idempotents). */
  private dispatchLiveThreadEvent(ev: any) {
    if (!ev || !ev.type) return;
    const cur = this.currentThread();
    // Skip si pas le thread courant (rare, course condition pendant switch)
    if (ev.threadId && cur?._id && String(ev.threadId) !== String(cur._id) && String(ev.threadId) !== String((cur as any).id)) {
      return;
    }
    const evType = ev.type as string;
    if (evType.startsWith('canvas.')) {
      this.handleCanvasEvent(ev);
      this.sideEvents$.next(ev);
      return;
    }
    if (evType === 'ai.permission.request' || evType === 'ai.permission.granted' || evType === 'ai.permission.denied') {
      this.sideEvents$.next(ev);
      return;
    }
    if (evType === 'ai.plan.request' || evType === 'plan.resolved') {
      this.sideEvents$.next(ev);
      const tid = cur?.id || cur?._id;
      if (tid) setTimeout(() => { this.loadThread(tid).catch?.(() => {}); }, 150);
      return;
    }
    if (evType === 'ai.message.created') {
      console.log('[passive-stream] ai.message.created received', ev.kind);
      this.sideEvents$.next(ev);
      this.scheduleReloadMessages();
      return;
    }
    if (evType === 'ai.message.updated') {
      console.log('[passive-stream] ai.message.updated received', ev.kind);
      // Si cet update finalise un placeholder streamé (backend vient d'écrire
      // le contenu final en DB), on retire l'ID du set streaming → le prochain
      // reload prendra la version DB (qui est désormais la version finale).
      if (ev.messageId && this._streamingMessageIds.has(String(ev.messageId))) {
        this._streamingMessageIds.delete(String(ev.messageId));
      }
      this.sideEvents$.next(ev);
      this.scheduleReloadMessages();
      return;
    }
    if (evType === 'memory.pending.update') {
      const cnt = ev.pendingCount;
      if (typeof cnt === 'number') this.pendingKnowledgeCount.set(cnt);
      this.scheduleReloadMessages();
      return;
    }
    // subagent.* events → forward to sideEvents pour visibilité canvas Agents
    if (evType.startsWith('subagent.') || evType === 'job.status') {
      this.sideEvents$.next(ev);
      return;
    }
    // Live streaming du resume parent : events tagués avec _streamingMessageId
    // (text deltas, tool.start/end, tool.input_delta). On append directement
    // au placeholder en mémoire sans recharger tout le thread → UI fluide.
    const streamingMsgId = ev._streamingMessageId;
    if (streamingMsgId) {
      this.applyStreamingDelta(streamingMsgId, evType, ev);
      return;
    }
  }

  /**
   * Applique un delta stream (text, tool.start, tool.end, tool.input_delta)
   * directement sur le message placeholder en mémoire. Pas de fetch DB.
   * Le signal `messages` est mis à jour → Angular re-render uniquement la bulle.
   */
  private applyStreamingDelta(messageId: string, evType: string, ev: any): void {
    // Marque ce message comme "en streaming" pour que reloadThreadMessages ne
    // l'écrase pas avec la version DB (encore vide ou partielle).
    this._streamingMessageIds.add(String(messageId));
    const msgs = this.messages();
    const idx = msgs.findIndex(m => String(m._id) === String(messageId));
    if (idx < 0) return; // placeholder pas encore chargé (race rare)
    const msg = { ...msgs[idx] } as any;
    if (evType === 'message' && typeof ev.text === 'string') {
      msg.content = String(msg.content || '') + ev.text;
    } else if (evType === 'tool.start') {
      const tools = Array.isArray(msg.toolCalls) ? [...msg.toolCalls] : [];
      tools.push({ id: ev.id, name: ev.name, status: 'running' });
      msg.toolCalls = tools;
    } else if (evType === 'tool.input_delta') {
      const tools = Array.isArray(msg.toolCalls) ? [...msg.toolCalls] : [];
      const i = tools.findIndex((t: any) => t.id === ev.id);
      if (i >= 0) {
        tools[i] = { ...tools[i], _argsBuf: (tools[i]._argsBuf || '') + (ev.text || '') };
        msg.toolCalls = tools;
      }
    } else if (evType === 'tool.end') {
      const tools = Array.isArray(msg.toolCalls) ? [...msg.toolCalls] : [];
      const i = tools.findIndex((t: any) => t.id === ev.id);
      if (i >= 0) {
        tools[i] = { ...tools[i], args: ev.args, result: ev.result, status: ev.status || 'success', duration: ev.duration };
        msg.toolCalls = tools;
      } else {
        tools.push({ id: ev.id, name: ev.name, args: ev.args, result: ev.result, status: ev.status || 'success', duration: ev.duration });
        msg.toolCalls = tools;
      }
    } else {
      return;
    }
    const next = [...msgs];
    next[idx] = msg;
    this.messages.set(next);
  }

  /** Ferme le stream live (à appeler quand on quitte le thread / déconnexion). */
  closeThreadLiveStream() {
    try { this._threadStreamCtrl?.abort(); } catch {}
    this._threadStreamCtrl = undefined;
    this._threadStreamId = undefined;
  }

  streamJob(jobId: string): Observable<any> {
    const subj = new Subject<any>();
    const url = this.buildFetchUrl(`/api/ai/jobs/${jobId}/stream?workspaceId=${encodeURIComponent(this.wsId())}`);
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${this.auth.token || ''}` },
          signal: ctrl.signal,
        });
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            try {
              const data = JSON.parse(t.slice(5).trim());
              this.zone.run(() => subj.next(data));
            } catch {}
          }
        }
        this.zone.run(() => subj.complete());
      } catch (e) {
        this.zone.run(() => subj.error(e));
      }
    })();
    return subj.asObservable().pipe(throttleTime(100, undefined, { leading: true, trailing: true }));
  }

  pauseJob(jobId: string): Observable<any> {
    return this.api.post<any>(`/api/ai/jobs/${jobId}/pause`, {}, { workspaceId: this.wsId() });
  }

  resumeJob(jobId: string): Observable<any> {
    return this.api.post<any>(`/api/ai/jobs/${jobId}/resume`, {}, { workspaceId: this.wsId() });
  }

  cancelJob(jobId: string): Observable<any> {
    return this.api.post<any>(`/api/ai/jobs/${jobId}/cancel`, {}, { workspaceId: this.wsId() });
  }

  /** Envoie un message à un subagent en cours (mailbox, délivré au prochain loop) */
  sendMessageToAgent(jobId: string, message: string, summary?: string): Observable<any> {
    return this.api.post<any>(
      `/api/ai/jobs/${jobId}/message`,
      { message, summary },
      { workspaceId: this.wsId() },
    );
  }

  /** Respond to a plan proposal (approve / reject / modify) */
  respondToPlan(
    threadId: string,
    requestId: string,
    decision: 'approve' | 'reject' | 'modify',
    approvedSteps?: string[],
    modifiedSteps?: AiPlanStep[],
    missingInfoAnswers?: Record<string, string>,
  ): Observable<any> {
    const body: any = { requestId, decision };
    if (approvedSteps) body.approvedSteps = approvedSteps;
    if (modifiedSteps) body.modifiedSteps = modifiedSteps;
    if (missingInfoAnswers) body.missingInfoAnswers = missingInfoAnswers;
    return this.api.post<any>(
      `/api/ai/threads/${threadId}/plan-response`,
      body,
      { workspaceId: this.wsId() },
    );
  }

  respondToPermission(jobId: string, requestId: string, decision: string, pathPattern?: string, toolName?: string, risk?: string): Observable<any> {
    return this.api.post<any>(
      `/api/ai/jobs/${jobId}/permissions`,
      { requestId, decision, pathPattern, toolName, risk },
      { workspaceId: this.wsId() },
    );
  }

  respondToCacheSync(jobId: string, requestId: string, decision: string): Observable<any> {
    return this.api.post<any>(
      `/api/ai/jobs/${jobId}/cache-sync/${requestId}`,
      { decision },
      { workspaceId: this.wsId() },
    );
  }

  // ─────────────────────────────────────────────
  // V2 — Permissions
  // ─────────────────────────────────────────────

  listPermissions(threadId: string): Observable<AiPermissionGrant[]> {
    return this.api.get<AiPermissionGrant[]>(
      `/api/ai/threads/${threadId}/permissions`,
      { workspaceId: this.wsId() },
    );
  }

  listWorkspacePermissions(): Observable<AiPermissionGrant[]> {
    return this.api.get<AiPermissionGrant[]>(
      `/api/ai/permissions`,
      { workspaceId: this.wsId() },
    );
  }

  revokePermission(threadId: string, grantId: string): Observable<any> {
    return this.api.delete<any>(
      `/api/ai/threads/${threadId}/permissions/${grantId}`,
      { workspaceId: this.wsId() },
    );
  }

  // ─────────────────────────────────────────────
  // V2 — Preferences
  // ─────────────────────────────────────────────

  async loadPreferences(): Promise<AiUserPreferences | null> {
    try {
      const data = await this.api.get<AiUserPreferences>(
        `/api/ai/preferences`,
        { workspaceId: this.wsId() },
      ).toPromise();
      if (data) this.preferences.set(data);
      return data || null;
    } catch {
      return null;
    }
  }

  async updateUserPreferences(partial: Partial<AiUserPreferences>): Promise<AiUserPreferences | null> {
    const data = await this.api.put<AiUserPreferences>(
      `/api/ai/preferences`,
      partial,
      { workspaceId: this.wsId() },
    ).toPromise();
    if (data) this.preferences.set(data);
    return data || null;
  }

  getThreadPreferences(threadId: string): Observable<Partial<AiUserPreferences>> {
    return this.api.get<Partial<AiUserPreferences>>(
      `/api/ai/threads/${threadId}/preferences`,
      { workspaceId: this.wsId() },
    );
  }

  updateThreadPreferences(threadId: string, partial: Partial<AiUserPreferences>): Observable<any> {
    return this.api.put<any>(
      `/api/ai/threads/${threadId}/preferences`,
      partial,
      { workspaceId: this.wsId() },
    );
  }

  resetThreadPreferences(threadId: string): Observable<any> {
    return this.api.delete<any>(
      `/api/ai/threads/${threadId}/preferences`,
      { workspaceId: this.wsId() },
    );
  }

  // ─────────────────────────────────────────────
  // V2 — Sharing
  // ─────────────────────────────────────────────

  shareThread(threadId: string, userIds: string[], permission: 'view' | 'comment' | 'edit', notify = true): Observable<any> {
    return this.api.post<any>(
      `/api/ai/threads/${threadId}/shares`,
      { userIds, permission, notify },
      { workspaceId: this.wsId() },
    );
  }

  listShares(threadId: string): Observable<AiThreadShare[]> {
    return this.api.get<AiThreadShare[]>(
      `/api/ai/threads/${threadId}/shares`,
      { workspaceId: this.wsId() },
    );
  }

  updateShare(threadId: string, userId: string, permission: 'view' | 'comment' | 'edit'): Observable<any> {
    return this.api.put<any>(
      `/api/ai/threads/${threadId}/shares/${userId}`,
      { permission },
      { workspaceId: this.wsId() },
    );
  }

  revokeShare(threadId: string, userId: string): Observable<any> {
    return this.api.delete<any>(
      `/api/ai/threads/${threadId}/shares/${userId}`,
      { workspaceId: this.wsId() },
    );
  }

  listWorkspaceMembers(): Observable<any[]> {
    return this.api.get<any[]>(
      `/api/workspaces/${this.wsId()}/members`,
      {},
    );
  }
}
