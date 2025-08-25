import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface PluginRepoDto { id: string; name: string; type: 'local'|'git'|'http'; path?: string|null; url?: string|null; branch?: string|null; enabled?: boolean; status?: string; lastSyncAt?: string; gitAuth?: 'ssh'|'http'|'token'|'basic'; gitUsername?: string }

@Injectable({ providedIn: 'root' })
export class PluginReposBackendService {
  constructor(private api: ApiClientService) {}
  list(params?: { page?: number; limit?: number; q?: string; sort?: string }): Observable<PluginRepoDto[]> { return this.api.get<PluginRepoDto[]>(`/api/plugin-repos`, params); }
  create(body: Partial<PluginRepoDto> & { name: string; type?: 'local'|'git'|'http' }): Observable<any> { return this.api.post<any>(`/api/plugin-repos`, body); }
  update(id: string, body: Partial<PluginRepoDto>): Observable<any> { return this.api.put<any>(`/api/plugin-repos/${encodeURIComponent(id)}`, body); }
  delete(id: string): Observable<any> { return this.api.delete<any>(`/api/plugin-repos/${encodeURIComponent(id)}`); }
  reload(): Observable<{ loaded: string[]; repos: string[] }> { return this.api.post<any>(`/api/plugin-repos/reload`, {}); }
  sync(id: string, body?: { force?: boolean; credentials?: { username?: string; password?: string; token?: string } }): Observable<any> { return this.api.post<any>(`/api/plugin-repos/${encodeURIComponent(id)}/sync`, body || {}); }
}
