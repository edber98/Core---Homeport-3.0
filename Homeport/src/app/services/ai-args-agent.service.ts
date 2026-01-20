import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { apiBase } from '../shared/api-base';
import { openSse, SseStream } from '../shared/chat/sse-client';
import { AccessControlService } from './access-control.service';
import { AuthTokenService } from './auth-token.service';

export type ArgsAgentEvent =
  | { type: 'message'; role?: string; text?: string }
  | { type: 'tool.start'; name?: string; args?: any }
  | { type: 'tool.end'; name?: string; ok?: boolean }
  | { type: 'args.partial'; args?: any }
  | { type: 'desc'; text?: string }
  | { type: 'error'; code?: string; message?: string }
  | { type: 'done' };

export interface ArgsStreamParams { flowId: string; nodeId: string; branch?: string|null; threadId?: string|null }
export interface ArgsAgentStream { events$: Observable<ArgsAgentEvent>; stop: () => void }

@Injectable({ providedIn: 'root' })
export class AiArgsAgentService {
  constructor(private zone: NgZone, private acl: AccessControlService, private auth: AuthTokenService) {}

  stream(params: ArgsStreamParams): ArgsAgentStream {
    const q = new URLSearchParams();
    q.set('flowId', params.flowId);
    q.set('nodeId', params.nodeId);
    if (params.branch) q.set('branch', params.branch);
    if (params.threadId) q.set('threadId', params.threadId);
    const wsId = this.acl.currentWorkspaceId?.(); if (wsId) q.set('workspaceId', wsId);
    const tok = this.auth.token; if (tok) q.set('token', tok);
    const url = `${apiBase()}/ai/args/stream?${q.toString()}`;
    const stream: SseStream<ArgsAgentEvent> = openSse<ArgsAgentEvent>({
      zone: this.zone,
      url,
      eventTypes: ['message','tool.start','tool.end','args.partial','args','desc','patch','error','done'],
      coerce: (raw, fallbackType) => ({ ...(raw || {}), type: (raw?.type || fallbackType) as ArgsAgentEvent['type'] }) as ArgsAgentEvent,
    });
    return stream;
  }
}
