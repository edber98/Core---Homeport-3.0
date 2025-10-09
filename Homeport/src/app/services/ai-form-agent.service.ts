import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthTokenService } from './auth-token.service';
import { openSse, SseStream } from '../shared/chat/sse-client';

export type AgentEvent =
  | { type: 'message'; role?: string; text?: string }
  | { type: 'patch'; ops: Array<{ op: 'add'|'replace'|'remove'; path: string; value?: any }> }
  | { type: 'snapshot'; schema: any }
  | { type: 'final'; schema: any }
  | { type: 'tool.start'; name?: string; args?: any }
  | { type: 'tool.end'; name?: string; ok?: boolean }
  | { type: 'warning'; code?: string; message?: string }
  | { type: 'error'; code?: string; message?: string }
  | { type: 'done' };

export interface StreamParams {
  prompt: string;
  layout?: 'vertical'|'horizontal'|'inline';
  steps?: boolean;
  maxFields?: number;
  seedSchema?: any;
}

export interface AgentStream {
  events$: Observable<AgentEvent>;
  stop: () => void;
}

@Injectable({ providedIn: 'root' })
export class AiFormAgentService {
  constructor(private zone: NgZone, private auth: AuthTokenService) {}

  stream(params: StreamParams): AgentStream {
    const q = new URLSearchParams();
    if (params.prompt) q.set('prompt', params.prompt);
    q.set('layout', params.layout || 'vertical');
    q.set('steps', String(!!params.steps));
    q.set('maxFields', String(params.maxFields || 20));
    const tok = this.auth.token;
    if (tok) q.set('token', tok);
    if (params.seedSchema && typeof params.seedSchema === 'object') {
      try { const json = JSON.stringify(params.seedSchema); const b64 = btoa(unescape(encodeURIComponent(json))); q.set('seed', b64); } catch {}
    }
    const url = `${environment.apiBaseUrl}/api/ai/form/build/stream?${q.toString()}`;
    const stream: SseStream<AgentEvent> = openSse<AgentEvent>({
      zone: this.zone,
      url,
      eventTypes: ['message','patch','snapshot','final','warning','error','tool.start','tool.end'],
      coerce: (raw, fallbackType) => ({ ...(raw || {}), type: (raw?.type || fallbackType) as AgentEvent['type'] }) as AgentEvent,
    });
    return stream;
  }
}
