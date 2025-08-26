import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendProvider {
  key: string;
  name: string;
  title?: string;
  iconClass?: string;
  iconUrl?: string;
  color?: string;
  tags?: string[];
  categories?: string[];
  enabled?: boolean;
  hasCredentials?: boolean;
  allowWithoutCredentials?: boolean;
  credentialsForm?: any;
}

@Injectable({ providedIn: 'root' })
export class ProvidersBackendService {
  constructor(private api: ApiClientService) {}

  list(params?: { page?: number; limit?: number; q?: string; sort?: string }): Observable<BackendProvider[]> {
    return this.api.get<BackendProvider[]>(`/api/providers`, params);
  }
  update(key: string, body: Partial<BackendProvider>, force?: boolean): Observable<any> {
    const params: any = {}; if (force) params.force = '1';
    return this.api.put<any>(`/api/providers/${encodeURIComponent(key)}`, body, params);
  }
}
