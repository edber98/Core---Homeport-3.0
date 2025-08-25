import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendCredentialSummary { id: string; name: string; providerKey: string; workspaceId: string }
export interface BackendCredentialCreate { name: string; providerKey: string; values?: any }
export interface BackendCredentialUpdate { name?: string; providerKey?: string; values?: any }

@Injectable({ providedIn: 'root' })
export class CredentialsBackendService {
  constructor(private api: ApiClientService) {}

  list(wsId: string, params?: { page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendCredentialSummary[]> {
    return this.api.get<BackendCredentialSummary[]>(`/api/workspaces/${encodeURIComponent(wsId)}/credentials`, params);
  }
  create(wsId: string, body: BackendCredentialCreate): Observable<any> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/credentials`, body);
  }
  get(id: string): Observable<BackendCredentialSummary> { return this.api.get<BackendCredentialSummary>(`/api/credentials/${encodeURIComponent(id)}`); }
  update(id: string, body: BackendCredentialUpdate): Observable<any> { return this.api.put<any>(`/api/credentials/${encodeURIComponent(id)}`, body); }
  values(id: string, reveal: '0'|'1' = '0'): Observable<any> { return this.api.get<any>(`/api/credentials/${encodeURIComponent(id)}/values`, { reveal }); }
}

