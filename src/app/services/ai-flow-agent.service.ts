import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccessControlService } from './access-control.service';
import { AuthTokenService } from './auth-token.service';

export type FlowAgentEvent =
  | { type: 'message'; role?: string; text?: string }
  | { type: 'patch'; ops: Array<{ op: 'add'|'replace'|'remove'; path: string; value?: any }> }
  | { type: 'snapshot'; graph: any }
  | { type: 'final'; graph: any }
  | { type: 'warning'; code?: string; message?: string }
  | { type: 'error'; code?: string; message?: string }
  | { type: 'done' };

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
    const subj = new Subject<FlowAgentEvent>();
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
    const es = new EventSource(url, { withCredentials: false });
    const handle = (type: string) => (ev: MessageEvent) => {
      try {
        const data = (ev as any).data as string;
        const parsed = JSON.parse(data);
        parsed.type = parsed.type || type;
        this.zone.run(() => subj.next(parsed));
      } catch {
        this.zone.run(() => subj.next({ type: 'message', text: `[${type}] ${(ev as any).data}` } as any));
      }
    };
    es.addEventListener('message', handle('message'));
    es.addEventListener('patch', handle('patch'));
    es.addEventListener('snapshot', handle('snapshot'));
    es.addEventListener('final', handle('final'));
    es.addEventListener('warning', handle('warning'));
    es.addEventListener('error', handle('error'));
    es.addEventListener('done', () => { this.zone.run(() => subj.next({ type: 'done' } as any)); try { es.close(); } catch {} subj.complete(); });
    es.onerror = () => { this.zone.run(() => subj.next({ type: 'error', code: 'eventsource_error', message: 'Connection failed' } as any)); };

    const stop = () => { try { es.close(); } catch {} subj.complete(); };
    return { events$: subj.asObservable(), stop };
  }
}
