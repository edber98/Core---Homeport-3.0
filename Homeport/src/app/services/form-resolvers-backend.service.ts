import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface ResolverVariant { id: string; label: string; value: string; meta?: any }
export interface ResolverResult {
  variants: ResolverVariant[];
  current: string;
  lastResolvedAt: string;
}

export interface ResolverContext {
  flowId: string;
  nodeId: string;
}

@Injectable({ providedIn: 'root' })
export class FormResolversBackendService {
  private api = inject(ApiClientService);

  resolve(resolver: string, context: ResolverContext, variant?: string): Observable<ResolverResult> {
    return this.api.post<ResolverResult>('/api/form-resolvers/resolve', { resolver, variant, context });
  }

  runAction(resolver: string, action: string, context: ResolverContext): Observable<ResolverResult> {
    return this.api.post<ResolverResult>('/api/form-resolvers/action', { resolver, action, context });
  }
}
