import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../services/api-client.service';

export interface ProfileWorkspace {
  id: string;
  name: string;
  isDefault: boolean;
  role: string;
}

export interface MeProfile {
  id: string;
  email: string;
  role: string;
  companyId: string;
  defaultWorkspaceId: string | null;
  workspaces: ProfileWorkspace[];
}

export interface PatSummary {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface PatCreated extends PatSummary {
  /** Token clair, retourné UNIQUEMENT à la création. */
  token: string;
}

export interface PatCreatePayload {
  name: string;
  expiresInDays?: number;
  scopes?: string[];
}

@Injectable({ providedIn: 'root' })
export class ProfileBackendService {
  private api = inject(ApiClientService);

  me(): Observable<MeProfile> {
    return this.api.get<MeProfile>('/api/me');
  }

  listPats(): Observable<PatSummary[]> {
    return this.api.get<PatSummary[]>('/api/me/pats');
  }

  createPat(body: PatCreatePayload): Observable<PatCreated> {
    return this.api.post<PatCreated>('/api/me/pats', body);
  }

  revokePat(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`/api/me/pats/${id}`);
  }
}
