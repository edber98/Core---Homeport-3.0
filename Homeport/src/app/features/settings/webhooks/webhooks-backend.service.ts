import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../../services/api-client.service';

export type WebhookEvent =
  | 'run.started' | 'run.completed' | 'run.failed' | 'run.cancelled'
  | 'thread.message.created' | 'thread.message.updated'
  | 'deployment.activated' | 'deployment.deactivated' | 'deployment.event';

export interface WebhookFilters {
  flowIds?: string[];
  threadIds?: string[];
  runStatuses?: string[];
}

export interface Webhook {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  filters?: WebhookFilters;
  secret: string;       // masked (•••• + suffix) sauf à la création
  active: boolean;
  deliveryCount: number;
  failureCount: number;
  lastSentAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  recentDeliveries?: Array<{
    at: string; event: string; status: number; durationMs: number; error?: string; attempt: number;
  }>;
  createdAt: string;
  updatedAt: string;
  /** Vrai uniquement à la création — indique que le secret est en clair dans cette réponse. */
  _secretShownOnce?: boolean;
}

export interface WebhookCreatePayload {
  name?: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  filters?: WebhookFilters;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class WebhooksBackendService {
  private api = inject(ApiClientService);

  listEvents(): Observable<{ events: WebhookEvent[] }> {
    return this.api.get<{ events: WebhookEvent[] }>('/api/webhooks/events');
  }

  list(workspaceId: string): Observable<Webhook[]> {
    return this.api.get<Webhook[]>(`/api/workspaces/${workspaceId}/webhooks`);
  }

  create(workspaceId: string, body: WebhookCreatePayload): Observable<Webhook> {
    return this.api.post<Webhook>(`/api/workspaces/${workspaceId}/webhooks`, body);
  }

  get(id: string): Observable<Webhook> {
    return this.api.get<Webhook>(`/api/webhooks/${id}`);
  }

  update(id: string, body: Partial<WebhookCreatePayload>): Observable<Webhook> {
    return this.api.put<Webhook>(`/api/webhooks/${id}`, body);
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.api.delete<{ deleted: boolean }>(`/api/webhooks/${id}`);
  }

  rotateSecret(id: string): Observable<Webhook> {
    return this.api.post<Webhook>(`/api/webhooks/${id}/rotate-secret`, {});
  }

  test(id: string): Observable<{ ok: boolean; message?: string }> {
    return this.api.post<{ ok: boolean; message?: string }>(`/api/webhooks/${id}/test`, {});
  }
}
