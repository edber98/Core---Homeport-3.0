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
  attempts?: any[];
}

@Injectable({ providedIn: 'root' })
export class RunsBackendService {
  constructor(private api: ApiClientService, private auth: AuthTokenService) {}

  start(flowId: string, payload: any): Observable<any> {
    return this.api.post<any>(`/api/flows/${encodeURIComponent(flowId)}/runs`, { payload });
  }
  get(runId: string, params?: { populate?: '0'|'1' }): Observable<BackendRun> { return this.api.get<BackendRun>(`/api/runs/${encodeURIComponent(runId)}`, params); }
  getWith(runId: string, include: Array<'attempts'|'events'> = []): Observable<BackendRun> {
    const p: any = {};
    if (include && include.length) p.include = include.join(',');
    return this.api.get<BackendRun>(`/api/runs/${encodeURIComponent(runId)}`, p);
  }
  cancel(runId: string): Observable<any> { return this.api.post<any>(`/api/runs/${encodeURIComponent(runId)}/cancel`, {}); }
  listByFlow(flowId: string, params?: { status?: string; page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendRun[]> {
    return this.api.get<BackendRun[]>(`/api/flows/${encodeURIComponent(flowId)}/runs`, params);
  }
  listByWorkspace(wsId: string, params?: { flowId?: string; status?: string; page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendRun[]> {
    return this.api.get<BackendRun[]>(`/api/workspaces/${encodeURIComponent(wsId)}/runs`, params);
  }

  // Open an SSE stream for a given runId and emit parsed LiveEvents
  stream(runId: string): { source: EventSource, on: (cb: (ev: any) => void) => void, close: () => void } {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const token = this.auth.token;
    const url = `${base}/api/runs/${encodeURIComponent(runId)}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const source = new EventSource(url);
    // Basic logs for debugging SSE lifecycle
    try { console.log('[frontend][sse] open', { runId, url }); } catch {}
    const on = (cb: (ev: any) => void) => {
      const live = (evt: MessageEvent) => {
        try {
          const parsed = JSON.parse(evt.data);
          try { console.log('[frontend][sse] live', parsed?.type, parsed); } catch {}
          cb(parsed);
        } catch (e) {
          try { console.warn('[frontend][sse] bad json', evt.data); } catch {}
        }
      };
      // New channel: 'live' events with seq and type
      source.addEventListener('live', live);
      // Fallback: default message
      source.onmessage = live as any;
    };
    source.onerror = (e) => { try { console.error('[frontend][sse] error', e); } catch {} };
    const close = () => { try { console.log('[frontend][sse] close', { runId }); } catch {} try { source.close(); } catch {} };
    return { source, on, close };
  }
}
