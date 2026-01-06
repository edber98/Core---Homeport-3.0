import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClientService } from './api-client.service';

export interface ToolMeta {
  name: string;
  label?: string;
  description?: string;
  logo?: string;
  component?: string;
  template?: string;
}

@Injectable({ providedIn: 'root' })
export class ToolsBackendService {
  constructor(private api: ApiClientService) {}
  list(opts?: { limit?: number; q?: string }): Observable<ToolMeta[]> {
    // Bypass any caching by adding a timestamp param
    return this.api.get<ToolMeta[]>(`/api/tools`, { limit: opts?.limit ?? 1000, q: opts?.q, ts: Date.now() });
  }
}
