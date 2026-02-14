import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendWorkspace {
  id: string;
  name: string;
  templatesAllowed?: string[];
  isDefault?: boolean;
}

export interface BackendMember {
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceBackendService {
  constructor(private api: ApiClientService) {}

  // CRUD
  list(params?: { page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendWorkspace[]> {
    return this.api.get<BackendWorkspace[]>(`/api/workspaces`, params);
  }
  create(body: { name: string; templatesAllowed?: string[] }): Observable<BackendWorkspace> {
    return this.api.post<BackendWorkspace>(`/api/workspaces`, body);
  }
  update(id: string, body: Partial<BackendWorkspace> & { force?: boolean }): Observable<any> {
    return this.api.put<any>(`/api/workspaces/${encodeURIComponent(id)}`, body);
  }
  delete(id: string, force = false): Observable<any> {
    return this.api.delete<any>(`/api/workspaces/${encodeURIComponent(id)}`, force ? { force: '1' } : undefined);
  }

  // Elements
  elements(id: string): Observable<{ flows: Array<{ id: string; name: string }>; credentials: Array<{ id: string; name: string; providerKey?: string }>; forms: any[]; websites: any[] }> {
    return this.api.get<any>(`/api/workspaces/${encodeURIComponent(id)}/elements`);
  }

  // Members
  listMembers(wsId: string): Observable<BackendMember[]> {
    return this.api.get<BackendMember[]>(`/api/workspaces/${encodeURIComponent(wsId)}/members`);
  }
  addMember(wsId: string, body: { userId?: string; email?: string; role?: string }): Observable<BackendMember> {
    return this.api.post<BackendMember>(`/api/workspaces/${encodeURIComponent(wsId)}/members`, body);
  }
  updateMemberRole(wsId: string, userId: string, role: string): Observable<any> {
    return this.api.patch<any>(`/api/workspaces/${encodeURIComponent(wsId)}/members/${encodeURIComponent(userId)}`, { role });
  }
  removeMember(wsId: string, userId: string): Observable<any> {
    return this.api.delete<any>(`/api/workspaces/${encodeURIComponent(wsId)}/members/${encodeURIComponent(userId)}`);
  }

  // User preference
  getPreference(): Observable<{ defaultWorkspaceId: string | null }> {
    return this.api.get<{ defaultWorkspaceId: string | null }>(`/api/workspaces/preference`);
  }
  setPreference(workspaceId: string): Observable<any> {
    return this.api.put<any>(`/api/workspaces/preference`, { workspaceId });
  }
}
