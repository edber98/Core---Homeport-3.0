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
  preview(flowId: string, targetNodeId: string, payload: any): Observable<{ nodeId: string; msgIn?: any; payload?: any }> {
    return this.api.post<{ nodeId: string; msgIn?: any; payload?: any }>(`/api/flows/${encodeURIComponent(flowId)}/preview`, { targetNodeId, payload });
  }
  testNode(flowId: string, nodeId: string, msg: any): Observable<any> {
    return this.api.post<any>(`/api/flows/${encodeURIComponent(flowId)}/test-node`, { nodeId, msg });
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
      const handler = (evt: MessageEvent) => {
        try {
          const parsed = JSON.parse(evt.data);
          try { console.log('[frontend][sse]', parsed?.type, parsed); } catch {}
          cb(parsed);
        } catch (e) {
          try { console.warn('[frontend][sse] bad json', evt.data); } catch {}
        }
      };
      // Support both generic 'live' channel and typed events from engine
      const types = ['live','run.status','node.started','node.status','node.done','node.result','edge.taken','run.failed','error'];
      types.forEach(t => source.addEventListener(t, handler as any));
      // Fallback default message
      source.onmessage = handler as any;
    };
    source.onerror = (e) => { try { console.error('[frontend][sse] error', e); } catch {} };
    const close = () => { try { console.log('[frontend][sse] close', { runId }); } catch {} try { source.close(); } catch {} };
    return { source, on, close };
  }

  // Ad-hoc (editor) run APIs — do not persist, run from provided graph
  startAdhoc(graph: any, payload: any): Observable<any> {
    return this.api.post<any>(`/api/test/runs`, { graph, payload });
  }
  getAdhoc(runId: string): Observable<BackendRun> { return this.api.get<BackendRun>(`/api/test/runs/${encodeURIComponent(runId)}`); }
  streamAdhoc(runId: string): { source: EventSource, on: (cb: (ev: any) => void) => void, close: () => void } {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const token = this.auth.token;
    const url = `${base}/api/test/runs/${encodeURIComponent(runId)}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const source = new EventSource(url);
    const on = (cb: (ev: any) => void) => {
      const handler = (evt: MessageEvent) => { try { const parsed = JSON.parse(evt.data); cb(parsed); } catch {} };
      // Listen to common event types emitted by the engine
      const types = ['run.status','node.started','node.done','node.result','edge.taken','run.failed','error'];
      types.forEach(t => source.addEventListener(t, handler as any));
      // Fallback default message
      source.onmessage = handler as any;
    };
    source.onerror = (e) => { try { console.error('[frontend][sse][adhoc] error', e); } catch {} };
    const close = () => { try { console.log('[frontend][sse][adhoc] close', { runId }); } catch {} try { source.close(); } catch {} };
    return { source, on, close };
  }
}
