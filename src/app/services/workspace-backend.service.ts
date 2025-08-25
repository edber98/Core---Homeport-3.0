import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendWorkspace { id: string; name: string; templatesAllowed?: string[] }

@Injectable({ providedIn: 'root' })
export class WorkspaceBackendService {
  constructor(private api: ApiClientService) {}

  list(params?: { page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendWorkspace[]> {
    return this.api.get<BackendWorkspace[]>(`/api/workspaces`, params);
  }
}

