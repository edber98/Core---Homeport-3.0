import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendFlow { id: string; name: string; status?: 'draft'|'test'|'production'; enabled?: boolean; graph?: any }
export interface BackendFlowCreate { name: string; status?: string; enabled?: boolean; graph?: any; force?: boolean }
export interface BackendFlowUpdate { name?: string; status?: string; enabled?: boolean; graph?: any; workspaceId?: string; force?: boolean }

@Injectable({ providedIn: 'root' })
export class FlowsBackendService {
  constructor(private api: ApiClientService) {}

  list(wsId: string, params?: { page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendFlow[]> {
    return this.api.get<BackendFlow[]>(`/api/workspaces/${encodeURIComponent(wsId)}/flows`, params);
  }
  get(flowId: string, params?: { populate?: '0'|'1' }): Observable<BackendFlow> {
    return this.api.get<BackendFlow>(`/api/flows/${encodeURIComponent(flowId)}`, params);
  }
  create(wsId: string, body: BackendFlowCreate): Observable<any> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/flows`, body);
  }
  update(flowId: string, body: BackendFlowUpdate): Observable<any> {
    return this.api.put<any>(`/api/flows/${encodeURIComponent(flowId)}`, body);
  }
}
