import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthTokenService } from './auth-token.service';

export type AgentEvent =
  | { type: 'message'; role?: string; text?: string }
  | { type: 'patch'; ops: Array<{ op: 'add'|'replace'|'remove'; path: string; value?: any }> }
  | { type: 'snapshot'; schema: any }
  | { type: 'final'; schema: any }
  | { type: 'warning'; code?: string; message?: string }
  | { type: 'error'; code?: string; message?: string }
  | { type: 'done' };

export interface StreamParams {
  prompt: string;
  layout?: 'vertical'|'horizontal'|'inline';
  steps?: boolean;
  maxFields?: number;
}

export interface AgentStream {
  events$: Observable<AgentEvent>;
  stop: () => void;
}

@Injectable({ providedIn: 'root' })
export class AiFormAgentService {
  constructor(private zone: NgZone, private auth: AuthTokenService) {}

  stream(params: StreamParams): AgentStream {
    const subj = new Subject<AgentEvent>();
    const q = new URLSearchParams();
    if (params.prompt) q.set('prompt', params.prompt);
    q.set('layout', params.layout || 'vertical');
    q.set('steps', String(!!params.steps));
    q.set('maxFields', String(params.maxFields || 20));
    const tok = this.auth.token;
    if (tok) q.set('token', tok);
    const url = `${environment.apiBaseUrl}/api/ai/form/build/stream?${q.toString()}`;

    const es = new EventSource(url, { withCredentials: false });
    const handle = (type: string) => (ev: MessageEvent) => {
      try {
        const data = (ev as any).data as string;
        const parsed = JSON.parse(data);
        // Some proxies may send named events but wrong type path; enforce type
        parsed.type = parsed.type || type;
        this.zone.run(() => subj.next(parsed));
      } catch {
        // Fallback: wrap as message
        this.zone.run(() => subj.next({ type: 'message', text: `[${type}] ${(ev as any).data}` }));
      }
    };
    es.addEventListener('message', handle('message'));
    es.addEventListener('patch', handle('patch'));
    es.addEventListener('snapshot', handle('snapshot'));
    es.addEventListener('final', handle('final'));
    es.addEventListener('warning', handle('warning'));
    es.addEventListener('error', handle('error'));
    es.addEventListener('done', () => { this.zone.run(() => subj.next({ type: 'done' })); try { es.close(); } catch {} subj.complete(); });
    es.onerror = () => { this.zone.run(() => subj.next({ type: 'error', code: 'eventsource_error', message: 'Connection failed' })); };

    const stop = () => { try { es.close(); } catch {} subj.complete(); };
    return { events$: subj.asObservable(), stop };
  }
}

