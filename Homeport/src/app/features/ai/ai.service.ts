import { Injectable, NgZone, signal, computed } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ApiClientService } from '../../services/api-client.service';
import { AccessControlService } from '../../services/access-control.service';
import { AuthTokenService } from '../../services/auth-token.service';
import { apiRoot, apiSuffix } from '../../shared/api-base';
import { environment } from '../../../environments/environment';

// ── Types ──

export interface AiThread {
  _id: string;
  id: string;
  mode: 'chat' | 'workflow' | 'node_args' | 'form' | 'onboarding';
  title: string;
  flowId?: string;
  nodeId?: string;
  agentId?: string;
  metadata?: any;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiToolCall {
  id: string;
  name: string;
  args?: any;
  result?: any;
  duration?: number;
  status?: 'success' | 'error';
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
  createdAt?: string;
}

export type AiStreamEvent =
  | { type: 'message'; text: string }
  | { type: 'tool.start'; id: string; name: string }
  | { type: 'tool.input_delta'; id: string; name: string; text: string }
  | { type: 'tool.end'; id: string; name: string; args?: any; result?: any; error?: string; status: string; duration?: number }
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

export interface AiAvailableAgent {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  type: 'system' | 'custom';
  toolCount: number;
  allowedProviders?: string[];
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

  // Action requests — the panel subscribes and opens appropriate modals
  actionRequests$ = new Subject<AiAction>();

  hasThread = computed(() => !!this.currentThread());

  constructor(
    private api: ApiClientService,
    private zone: NgZone,
    private acl: AccessControlService,
    private auth: AuthTokenService
  ) {}

  // ── Drawer ──
  openDrawer() { this.drawerOpen.set(true); }
  closeDrawer() { this.drawerOpen.set(false); }
  toggleDrawer() { this.drawerOpen.set(!this.drawerOpen()); }

  // ── Page context (updated by pages) ──
  setPageContext(ctx: AiPageContext) { this.pageContext.set(ctx); }

  // ── Threads ──
  listThreads(filters?: { mode?: string; flowId?: string; formId?: string }): Observable<AiThread[]> {
    const params: any = { workspaceId: this.wsId() };
    if (filters?.mode) params.mode = filters.mode;
    if (filters?.flowId) params.flowId = filters.flowId;
    if (filters?.formId) params.formId = filters.formId;
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

    const stop = () => {
      try { abortController.abort(); } catch {}
      this.streaming.set(false);
      subj.complete();
    };

    return { events$: subj.asObservable(), stop };
  }

  private async streamPost(url: string, body: any, token: string, signal: AbortSignal, subj: Subject<AiStreamEvent>) {
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
      let assistantText = '';
      const toolCalls: AiToolCall[] = [];
      const segments: AiMessageSegment[] = [];
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
            if (event.type === 'tool.end') {
              const tc: AiToolCall = {
                id: (event as any).id,
                name: (event as any).name,
                args: (event as any).args,
                result: (event as any).result,
                duration: (event as any).duration,
                status: (event as any).status,
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
                  segments: segments.length > 1 ? [...segments] : undefined,
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
      if (e?.name === 'AbortError') return;
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

  createAgent(data: { name: string; description?: string; systemPrompt?: string; allowedProviders?: string[]; workspaceId?: string }): Observable<any> {
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
  async quickSend(content: string, mode?: string) {
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
    return this.sendMessage(content);
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
}
