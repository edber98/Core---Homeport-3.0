import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendUser { id: string; email: string; name: string; role: 'admin'|'member'; workspaces: string[] }

@Injectable({ providedIn: 'root' })
export class UsersBackendService {
  constructor(private api: ApiClientService) {}
  list(): Observable<BackendUser[]> { return this.api.get<{ total: number; page: number; limit: number; items: BackendUser[] }>(`/api/users`).pipe(map(r => (r as any)?.items || [])); }
  get(id: string): Observable<BackendUser> { return this.api.get<BackendUser>(`/api/users/${encodeURIComponent(id)}`); }
  create(body: { email: string; password?: string; role?: 'admin'|'member'; workspaces?: string[] }): Observable<any> { return this.api.post<any>(`/api/users`, body); }
  update(id: string, body: { role?: 'admin'|'member'; workspaces?: string[] }): Observable<any> { return this.api.put<any>(`/api/users/${encodeURIComponent(id)}`, body); }
}
