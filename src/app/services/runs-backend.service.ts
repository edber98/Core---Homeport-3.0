import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { environment } from '../../environments/environment';
import { AuthTokenService } from './auth-token.service';

export interface BackendRun {
  id: string;
  flowId: string;
  workspaceId?: string;
  status: string;
  result?: any;
  events?: any[];
  // enriched fields (backend lists)
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  nodesExecuted?: number;
  eventsCount?: number;
}

@Injectable({ providedIn: 'root' })
export class RunsBackendService {
  constructor(private api: ApiClientService, private auth: AuthTokenService) {}

  start(flowId: string, payload: any): Observable<any> {
    return this.api.post<any>(`/api/flows/${encodeURIComponent(flowId)}/runs`, { payload });
  }
  get(runId: string, params?: { populate?: '0'|'1' }): Observable<BackendRun> { return this.api.get<BackendRun>(`/api/runs/${encodeURIComponent(runId)}`, params); }
  cancel(runId: string): Observable<any> { return this.api.post<any>(`/api/runs/${encodeURIComponent(runId)}/cancel`, {}); }
  listByFlow(flowId: string, params?: { status?: string; page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendRun[]> {
    return this.api.get<BackendRun[]>(`/api/flows/${encodeURIComponent(flowId)}/runs`, params);
  }
  listByWorkspace(wsId: string, params?: { flowId?: string; status?: string; page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendRun[]> {
    return this.api.get<BackendRun[]>(`/api/workspaces/${encodeURIComponent(wsId)}/runs`, params);
  }

  // Open an SSE stream for a given runId and emit parsed events
  stream(runId: string): { source: EventSource, on: (cb: (ev: any) => void) => void, close: () => void } {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const token = this.auth.token;
    const url = `${base}/api/runs/${encodeURIComponent(runId)}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const source = new EventSource(url);
    // Basic logs for debugging SSE lifecycle
    try { console.log('[frontend][sse] open', { runId, url }); } catch {}
    const on = (cb: (ev: any) => void) => {
      const handler = (evt: MessageEvent) => {
        try {
          const parsed = JSON.parse(evt.data);
          try { console.log('[frontend][sse] event', parsed?.type || 'message', parsed); } catch {}
          cb(parsed);
        } catch {
          try { console.log('[frontend][sse] message(raw)', evt.data); } catch {}
          cb({ raw: evt.data });
        }
      };
      // wildcard-like: subscribe to known event types and default message
      source.addEventListener('run.started', handler);
      source.addEventListener('node.done', handler);
      source.addEventListener('node.skipped', handler);
      source.addEventListener('run.completed', handler);
      source.addEventListener('run.failed', handler);
      source.addEventListener('run.success', handler);
      source.addEventListener('run.error', handler);
      source.addEventListener('heartbeat', handler);
      source.onmessage = handler as any;
    };
    source.onerror = (e) => { try { console.error('[frontend][sse] error', e); } catch {} };
    const close = () => { try { console.log('[frontend][sse] close', { runId }); } catch {} try { source.close(); } catch {} };
    return { source, on, close };
  }
}
