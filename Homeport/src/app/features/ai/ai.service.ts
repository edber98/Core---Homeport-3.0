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
  activeTab: 'document' | 'research' | 'tasks' | 'files';
  document?: {
    format?: 'docx' | 'pptx' | 'xlsx' | 'html' | 'md';
    title?: string;
    previewHtml?: string;
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
    status: string;
    parentTaskId?: string;
    startedAt?: string;
    finishedAt?: string;
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
    kind?: 'permission_request' | 'cache_sync_request' | 'comment';
    permissionRequest?: AiPermissionRequest;
    cacheSyncRequest?: AiCacheSyncRequest;
    jobId?: string;
    [k: string]: any;
  };
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
  pageContext = signal<AiPageContext>({ page: 'other' });
  availableAgents = signal<AiAvailableAgent[]>([]);
  selectedAgentId = signal<string>('general');

  // V2: canvas, preferences, presence
  canvasState = signal<AiCanvasState | null>(null);
  canvasOpen = signal<boolean>(false);
  canvasPinned = signal<boolean>(false);
  preferences = signal<AiUserPreferences | null>(null);
  presence = signal<Array<{ userId: string; name?: string; avatar?: string }>>([]);

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
    const thread = await this.api.post<AiThread>('/api/ai/threads', body, { workspaceId: this.wsId() }).toPromise();
    this.currentThread.set(thread!);
    this.messages.set([]);
    this.pendingQuestion.set(null);
    return thread!;
  }

  async loadThread(threadId: string) {
    const data = await this.api.get<any>(`/api/ai/threads/${threadId}`, { workspaceId: this.wsId() }).toPromise();
    this.currentThread.set(data.thread);
    const msgs = data.messages || [];
    this.messages.set(msgs);

    // Restore pending question if last assistant message has an unanswered question
    let restored = false;
    if (msgs.length) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.role === 'user') break; // User answered → no pending question
        if (m.role === 'assistant' && m.question) {
          this.pendingQuestion.set(m.question);
          restored = true;
          break;
        }
      }
    }
    if (!restored) this.pendingQuestion.set(null);
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
  sendMessage(content: string, answer?: any, attachments?: any[]): { events$: Observable<AiStreamEvent>; stop: () => void } {
    const thread = this.currentThread();
    if (!thread) throw new Error('No active thread');

    this.streaming.set(true);
    this.pendingQuestion.set(null);

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
    const url = this.buildFetchUrl(`/api/ai/threads/${thread.id || thread._id}/messages?workspaceId=${encodeURIComponent(wsId)}`);
    const abortController = new AbortController();

    this.streamPost(url, body, tok, abortController.signal, subj);

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

  private async streamPost(url: string, body: any, token: string, signal: AbortSignal, subj: Subject<AiStreamEvent>) {
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
            const event = data as AiStreamEvent;
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
            if (evType === 'thread.presence') {
              try {
                const list = (event as any).users || [];
                this.presence.set(list);
              } catch {}
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
    this.pendingQuestion.set(null);
    // Build visible content from answer
    let content = '';
    if (value.text) content = value.text;
    else if (value.label) content = value.label;
    else if (value.values) content = value.values.join(', ');
    else if (value.batchAnswers) content = Object.values(value.batchAnswers).join(', ');
    else if (value.value) content = String(value.value);
    return this.sendMessage(content, { questionText: q.text, value });
  }

  // ── Action answer (e.g. credential created) ──
  answerAction(actionType: string, result: any) {
    this.pendingQuestion.set(null);
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
    this.pendingQuestion.set(null);
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
        this.canvasOpen.set(true);
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
        tasks.push({
          id: event.id,
          jobId: event.jobId,
          subject: event.subject || event.title || 'Tâche',
          description: event.description,
          status: event.status || 'running',
          parentTaskId: event.parentTaskId,
          startedAt: new Date().toISOString(),
          toolCalls: [],
        });
        this.canvasState.set({ ...cur, tasks });
        break;
      }
      case 'canvas.task.update': {
        const tasks = cur.tasks ? [...cur.tasks] : [];
        const idx = tasks.findIndex(t => t.id === event.id || t.jobId === event.jobId);
        if (idx >= 0) {
          tasks[idx] = {
            ...tasks[idx],
            status: event.status || tasks[idx].status,
            description: event.description || tasks[idx].description,
            finishedAt: event.finishedAt || tasks[idx].finishedAt,
            toolCalls: event.toolCalls || tasks[idx].toolCalls,
          };
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

  openCanvas() { this.canvasOpen.set(true); }
  closeCanvas() { this.canvasOpen.set(false); }
  toggleCanvas() { this.canvasOpen.set(!this.canvasOpen()); }
  togglePinCanvas() { this.canvasPinned.set(!this.canvasPinned()); }
  setCanvasTab(tab: 'document' | 'research' | 'tasks' | 'files') {
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
    return this.api.post<any>(
      `/api/ai/threads/${threadId}/project-root/refresh`,
      {},
      { workspaceId: this.wsId() },
    ).toPromise();
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

  getJob(jobId: string): Observable<AiJob> {
    return this.api.get<AiJob>(`/api/ai/jobs/${jobId}`, { workspaceId: this.wsId() });
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

  respondToPermission(jobId: string, requestId: string, decision: string, pathPattern?: string): Observable<any> {
    return this.api.post<any>(
      `/api/ai/jobs/${jobId}/permission/${requestId}`,
      { decision, pathPattern },
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
