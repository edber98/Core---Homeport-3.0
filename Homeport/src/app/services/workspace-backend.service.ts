import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendWorkspace { id: string; name: string; templatesAllowed?: string[]; isDefault?: boolean }

@Injectable({ providedIn: 'root' })
export class WorkspaceBackendService {
  constructor(private api: ApiClientService) {}

  list(params?: { page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendWorkspace[]> {
    return this.api.get<BackendWorkspace[]>(`/api/workspaces`, params);
  }
  update(id: string, body: Partial<BackendWorkspace> & { force?: boolean }): Observable<any> {
    return this.api.put<any>(`/api/workspaces/${encodeURIComponent(id)}`, body);
  }
  elements(id: string): Observable<{ flows: Array<{ id: string; name: string }>; credentials: Array<{ id: string; name: string; providerKey?: string }>; forms: any[]; websites: any[] }>{
    return this.api.get<any>(`/api/workspaces/${encodeURIComponent(id)}/elements`);
  }
}
