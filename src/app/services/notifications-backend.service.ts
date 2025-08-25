import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendNotification { id: string; entityType?: string; entityId?: string; severity?: string; code?: string; message?: string; link?: string; acknowledged?: boolean }

@Injectable({ providedIn: 'root' })
export class NotificationsBackendService {
  constructor(private api: ApiClientService) {}

  list(params?: { workspaceId?: string; entityType?: string; acknowledged?: 'true'|'false'; page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendNotification[]> {
    return this.api.get<BackendNotification[]>(`/api/notifications`, params);
  }
  ack(id: string): Observable<any> { return this.api.post<any>(`/api/notifications/${encodeURIComponent(id)}/ack`, {}); }
  update(id: string, body: Partial<BackendNotification>): Observable<any> { return this.api.put<any>(`/api/notifications/${encodeURIComponent(id)}`, body); }
  delete(id: string): Observable<any> { return this.api.delete<any>(`/api/notifications/${encodeURIComponent(id)}`); }
}

