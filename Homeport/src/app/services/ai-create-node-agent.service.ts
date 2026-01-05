import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccessControlService } from './access-control.service';
import { AuthTokenService } from './auth-token.service';
import { openSse, SseStream } from '../shared/chat/sse-client';

export type CreateNodeEvent =
  | { type: 'message'; role?: string; text?: string }
  | { type: 'tool.start'; name?: string; args?: any }
  | { type: 'tool.end'; name?: string; ok?: boolean }
  | { type: 'args'; args?: any }
  | { type: 'desc'; text?: string }
  | { type: 'snapshot'; graph: any }
  | { type: 'final'; graph: any }
  | { type: 'await_user'; question?: string; reason?: string }
  | { type: 'error'; code?: string; message?: string }
  | { type: 'done' };

export interface CreateNodeStreamParams {
  prompt: string;
  seedGraph: any;
  sourceId: string;
  sourceHandle?: string | null;
  threadId?: string | null;
  flowId?: string | null;
}

export interface CreateNodeStream { events$: Observable<CreateNodeEvent>; stop: () => void }

@Injectable({ providedIn: 'root' })
export class AiCreateNodeAgentService {
  constructor(private zone: NgZone, private acl: AccessControlService, private auth: AuthTokenService) {}

  stream(params: CreateNodeStreamParams): CreateNodeStream {
    const q = new URLSearchParams();
    q.set('prompt', params.prompt);
    if (params.sourceId) q.set('sourceId', params.sourceId);
    if (params.sourceHandle) q.set('sourceHandle', params.sourceHandle);
    if (params.threadId) q.set('threadId', params.threadId);
    if (params.flowId) q.set('flowId', params.flowId);
    const wsId = this.acl.currentWorkspaceId?.(); if (wsId) q.set('workspaceId', wsId);
    const tok = this.auth.token; if (tok) q.set('token', tok);
    if (params.seedGraph && typeof params.seedGraph === 'object') {
      try { const json = JSON.stringify(params.seedGraph); const b64 = btoa(unescape(encodeURIComponent(json))); q.set('seed', b64); } catch {}
    }
    // Prefer alias path to avoid potential blockers on "create-node"
    const url = `${environment.apiBaseUrl}/api/ai/node-create/stream?${q.toString()}`;
    try { console.log('[ai-create-node][frontend] open SSE', { url, hasPrompt: !!params.prompt, hasSeed: !!params.seedGraph, sourceId: params.sourceId, sourceHandle: params.sourceHandle, threadId: params.threadId, flowId: params.flowId }); } catch {}
    const stream: SseStream<CreateNodeEvent> = openSse<CreateNodeEvent>({
      zone: this.zone,
      url,
      eventTypes: ['message','tool.start','tool.end','args','desc','snapshot','final','await_user','error','done'],
      coerce: (raw, fallbackType) => ({ ...(raw || {}), type: (raw?.type || fallbackType) as CreateNodeEvent['type'] }) as CreateNodeEvent,
    });
    return stream;
  }
}
