import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendNotification { id: string; entityType?: string; entityId?: string; severity?: string; code?: string; message?: string; link?: string; acknowledged?: boolean; createdAt?: string; updatedAt?: string }
export interface BackendNotificationPage { items: BackendNotification[]; total: number; page: number; limit: number; pages: number; }

@Injectable({ providedIn: 'root' })
export class NotificationsBackendService {
  constructor(private api: ApiClientService) {}

  list(params?: { workspaceId?: string; entityType?: string; acknowledged?: 'true'|'false'; severity?: string; page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendNotification[]> {
    return this.api.get<any[]>(`/api/notifications`, params).pipe(map(arr => (arr || []).map((n: any) => ({
      id: String(n.id || n._id || ''),
      entityType: n.entityType,
      entityId: n.entityId,
      severity: n.severity,
      code: n.code,
      message: n.message,
      link: n.link,
      acknowledged: !!n.acknowledged,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }))));
  }
  listPage(params?: { workspaceId?: string; entityType?: string; acknowledged?: 'true'|'false'; severity?: string; page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendNotificationPage> {
    return this.api.get<any>(`/api/notifications`, { ...(params || {}), pagination: 'true' }).pipe(map((r: any) => {
      const rawItems = Array.isArray(r?.items) ? r.items : [];
      const items = rawItems.map((n: any) => ({
        id: String(n.id || n._id || ''),
        entityType: n.entityType,
        entityId: n.entityId,
        severity: n.severity,
        code: n.code,
        message: n.message,
        link: n.link,
        acknowledged: !!n.acknowledged,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }));
      const limit = Math.max(1, Number(r?.limit) || Number(params?.limit) || 20);
      const total = Math.max(0, Number(r?.total) || 0);
      const page = Math.max(1, Number(r?.page) || Number(params?.page) || 1);
      const pages = Math.max(1, Number(r?.pages) || Math.ceil(total / limit) || 1);
      return { items, total, page, limit, pages };
    }));
  }
  ack(id: string): Observable<any> { return this.api.post<any>(`/api/notifications/${encodeURIComponent(id)}/ack`, {}); }
  update(id: string, body: Partial<BackendNotification>): Observable<any> { return this.api.put<any>(`/api/notifications/${encodeURIComponent(id)}`, body); }
  delete(id: string): Observable<any> { return this.api.delete<any>(`/api/notifications/${encodeURIComponent(id)}`); }

  count(params?: { workspaceId?: string; entityType?: string; acknowledged?: 'true'|'false'; severity?: string; q?: string }): Observable<number> {
    return this.api.get<{ total: number }>(`/api/notifications/count`, params).pipe(map(r => (r as any)?.total ?? 0));
  }

  ackAll(workspaceId?: string): Observable<{ modifiedCount: number }> {
    return this.api.post<{ modifiedCount: number }>(`/api/notifications/ack-all`, workspaceId ? { workspaceId } : {});
  }
}
