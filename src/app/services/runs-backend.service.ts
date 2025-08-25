import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendRun { id: string; flowId: string; workspaceId?: string; status: string; result?: any; events?: any[] }

@Injectable({ providedIn: 'root' })
export class RunsBackendService {
  constructor(private api: ApiClientService) {}

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
}

