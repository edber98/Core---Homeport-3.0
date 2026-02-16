import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendForm { id: string; name: string; description?: string; status?: 'draft'|'test'|'production'; schema?: any; workspaceId?: string }
export interface BackendFormCreate { name: string; description?: string; status?: string; schema?: any }
export interface BackendFormUpdate { name?: string; description?: string; status?: string; schema?: any; workspaceId?: string }

@Injectable({ providedIn: 'root' })
export class FormsBackendService {
  constructor(private api: ApiClientService) {}

  list(wsId: string, params?: { page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendForm[]> {
    return this.api.get<BackendForm[]>(`/api/workspaces/${encodeURIComponent(wsId)}/forms`, params);
  }
  get(formId: string): Observable<BackendForm> {
    return this.api.get<BackendForm>(`/api/forms/${encodeURIComponent(formId)}`);
  }
  create(wsId: string, body: BackendFormCreate): Observable<any> {
    return this.api.post<any>(`/api/workspaces/${encodeURIComponent(wsId)}/forms`, body);
  }
  update(formId: string, body: BackendFormUpdate): Observable<any> {
    return this.api.put<any>(`/api/forms/${encodeURIComponent(formId)}`, body);
  }
  delete(formId: string): Observable<any> { return this.api.delete<any>(`/api/forms/${encodeURIComponent(formId)}`); }
}
