import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface BackendNodeTemplateV2Handle { id: string; name: string; type: string; multiple?: boolean; accepts?: string[]; schema?: any }
export interface BackendNodeTemplate {
  schemaVersion?: number;
  key: string;
  name: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  iconUrl?: string;
  description?: string;
  tags?: string[];
  group?: string;
  providerKey?: string;
  appName?: string;
  type: 'start'|'start_form'|'function'|'condition'|'loop'|'end'|'flow'|'event'|'endpoint'|'agent'|'tool_ai'|'memory'|'router'|'choice';
  nodeKind?: BackendNodeTemplate['type'];
  category?: string;
  args?: any;
  // v1 legacy (no longer used in v2 but still may appear from older records)
  output?: string[];
  // v2 handles
  inputHandles?: BackendNodeTemplateV2Handle[];
  outputHandles?: BackendNodeTemplateV2Handle[];
  linkedHandles?: BackendNodeTemplateV2Handle[];
  authorize_catch_error?: boolean;
  authorize_skip_error?: boolean;
  allowWithoutCredentials?: boolean;
  output_array_field?: string;
  output_schema_field?: string;
  output_schema_merge_at?: string;
  outputSchema?: any[];
  risk?: 'safe' | 'write' | 'destructive' | 'elevated';
}

@Injectable({ providedIn: 'root' })
export class NodeTemplatesBackendService {
  constructor(private api: ApiClientService) {}

  list(params?: { page?: number; limit?: number; q?: string; category?: string; sort?: string; providerKey?: string; keys?: string[] | string }): Observable<BackendNodeTemplate[]> {
    return this.api.get<BackendNodeTemplate[]>(`/api/node-templates`, params);
  }
  create(tpl: BackendNodeTemplate): Observable<any> { return this.api.post<any>(`/api/node-templates`, tpl); }
  update(key: string, body: Partial<BackendNodeTemplate>, force?: boolean): Observable<any> {
    const params: any = {}; if (force) params.force = '1';
    return this.api.put<any>(`/api/node-templates/${encodeURIComponent(key)}`, body, params);
  }
  delete(key: string, force?: boolean): Observable<any> {
    const params: any = {}; if (force) params.force = '1';
    return this.api.delete<any>(`/api/node-templates/${encodeURIComponent(key)}`, params);
  }
}
