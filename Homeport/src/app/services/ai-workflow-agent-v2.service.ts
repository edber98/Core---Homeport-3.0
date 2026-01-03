import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { AccessControlService } from './access-control.service';
import { AuthTokenService } from './auth-token.service';
import { environment } from '../../environments/environment';
import { openSse, SseStream } from '../shared/chat/sse-client';

export type WorkflowAgentV2Event =
  | { type: 'message'; role?: string; text?: string }
  | { type: 'patch'; ops: Array<{ op: 'add'|'replace'|'remove'; path: string; value?: any }> }
  | { type: 'snapshot'; graph: any }
  | { type: 'final'; graph?: any }
  | { type: 'warning'; code?: string; message?: string }
  | { type: 'error'; code?: string; message?: string }
  | { type: 'done' };

export interface WorkflowStreamParams {
  prompt?: string;
  flowId?: string;
  action?: string; // 'create'|'modify'|'insert'|'replace'|'layout'
  threadId?: string;
}

export interface WorkflowAgentV2Stream {
  events$: Observable<WorkflowAgentV2Event>;
  stop: () => void;
}

@Injectable({ providedIn: 'root' })
export class AiWorkflowAgentV2Service {
  constructor(private zone: NgZone, private acl: AccessControlService, private auth: AuthTokenService) {}

  stream(params: WorkflowStreamParams): WorkflowAgentV2Stream {
    const q = new URLSearchParams();
    const wsId = this.acl.currentWorkspaceId?.(); if (wsId) q.set('workspaceId', wsId);
    const tok = this.auth.token; if (tok) q.set('token', tok);
    if (params.prompt) q.set('prompt', params.prompt);
    if (params.flowId) q.set('flowId', params.flowId);
    if (params.action) q.set('action', params.action);
    if (params.threadId) q.set('threadId', params.threadId);
    const url = `${environment.apiBaseUrl}/api/ai/workflow/stream?${q.toString()}`;
    try { console.log('[AiWorkflowAgentV2Service] SSE url', url); } catch {}
    const stream: SseStream<WorkflowAgentV2Event> = openSse<WorkflowAgentV2Event>({
      zone: this.zone,
      url,
      eventTypes: ['message','patch','snapshot','final','warning','error','done','context.loaded','context.updated','question'],
      coerce: (raw, fallbackType) => ({ ...(raw || {}), type: (raw?.type || fallbackType) as WorkflowAgentV2Event['type'] }) as WorkflowAgentV2Event,
    });
    try {
      stream.events$.subscribe({
        next: (e) => { try { console.log('[AiWorkflowAgentV2Service][event]', e); } catch {} },
        error: (err) => { try { console.error('[AiWorkflowAgentV2Service][error]', err); } catch {} },
        complete: () => { try { console.log('[AiWorkflowAgentV2Service] stream complete'); } catch {} },
      });
    } catch {}
    return stream;
  }
}
