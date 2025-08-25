import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendNodeTemplate {
  key: string;
  name: string;
  type: 'start'|'function'|'condition'|'loop'|'end'|'flow';
  category?: string;
  args?: any;
  output?: string[];
  authorize_catch_error?: boolean;
  authorize_skip_error?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NodeTemplatesBackendService {
  constructor(private api: ApiClientService) {}

  list(params?: { page?: number; limit?: number; q?: string; category?: string; sort?: string }): Observable<BackendNodeTemplate[]> {
    return this.api.get<BackendNodeTemplate[]>(`/api/node-templates`, params);
  }
  create(tpl: BackendNodeTemplate): Observable<any> { return this.api.post<any>(`/api/node-templates`, tpl); }
  update(key: string, body: Partial<BackendNodeTemplate> & { force?: boolean }): Observable<any> {
    return this.api.put<any>(`/api/node-templates/${encodeURIComponent(key)}`, body);
  }
}

