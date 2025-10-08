import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccessControlService } from './access-control.service';
import { AuthTokenService } from './auth-token.service';
import { openSse, SseStream } from '../shared/chat/sse-client';

export type FlowAgentEvent =
  | { type: 'message'; role?: string; text?: string }
  | { type: 'patch'; ops: Array<{ op: 'add'|'replace'|'remove'; path: string; value?: any }> }
  | { type: 'snapshot'; graph: any }
  | { type: 'final'; graph: any }
  | { type: 'warning'; code?: string; message?: string }
  | { type: 'error'; code?: string; message?: string }
  | { type: 'done' }
  // AI Form namespaced events forwarded by the Flow Agent during generation
  | { type: 'ai-form.start'; at?: number; nodeId?: string }
  | { type: 'ai-form.message'; text?: string }
  | { type: 'ai-form.patch'; ops?: any[] }
  | { type: 'ai-form.snapshot'; schema?: any }
  | { type: 'ai-form.final'; schema?: any }
  | { type: 'ai-form.error'; code?: string; message?: string }
  | { type: 'ai-form.attach'; nodeId?: string; parts?: number }
  | { type: 'ai-form.tool.start'; name?: string; args?: any }
  | { type: 'ai-form.tool.end'; name?: string; ok?: boolean }
  | { type: 'flow.tool.start'; name?: string }
  | { type: 'flow.tool.end'; name?: string; ok?: boolean };

export interface FlowStreamParams {
  prompt: string;
  seedGraph?: any;
}

export interface FlowAgentStream {
  events$: Observable<FlowAgentEvent>;
  stop: () => void;
}

@Injectable({ providedIn: 'root' })
export class AiFlowAgentService {
  constructor(private zone: NgZone, private acl: AccessControlService, private auth: AuthTokenService) {}

  stream(params: FlowStreamParams): FlowAgentStream {
    const q = new URLSearchParams();
    if (params.prompt) q.set('prompt', params.prompt);
    const wsId = this.acl.currentWorkspaceId?.();
    if (wsId) q.set('workspaceId', wsId);
    const tok = this.auth.token;
    if (tok) q.set('token', tok);
    if (params.seedGraph && typeof params.seedGraph === 'object') {
      try { const json = JSON.stringify(params.seedGraph); const b64 = btoa(unescape(encodeURIComponent(json))); q.set('seed', b64); } catch {}
    }
    const url = `${environment.apiBaseUrl}/api/ai/flow/build/stream?${q.toString()}`;
    const stream: SseStream<FlowAgentEvent> = openSse<FlowAgentEvent>({
      zone: this.zone,
      url,
      eventTypes: [
        'message','patch','snapshot','final','warning','error',
        'ai-form.start','ai-form.message','ai-form.patch','ai-form.snapshot','ai-form.final','ai-form.error','ai-form.attach','ai-form.tool.start','ai-form.tool.end',
        'flow.tool.start','flow.tool.end'
      ],
      coerce: (raw, fallbackType) => ({ ...(raw || {}), type: (raw?.type || fallbackType) as FlowAgentEvent['type'] }) as FlowAgentEvent,
    });
    return stream;
  }
}
