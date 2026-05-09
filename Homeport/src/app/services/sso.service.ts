import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface SsoStatus {
  enabled: boolean;
  mode: 'disabled' | 'hybrid' | 'enforced';
  passwordLoginAllowed: boolean;
}

@Injectable({ providedIn: 'root' })
export class SsoService {
  private api = inject(ApiClientService);

  getStatus(): Observable<SsoStatus> {
    return this.api.get<SsoStatus>('/api/auth/sso/status');
  }

  /**
   * Démarre le flow SSO : redirige le navigateur vers /api/auth/sso/start
   * (qui lui-même redirige vers Zitadel).
   */
  start(redirectAfter?: string) {
    const base = (window as any).__API_BASE__ || '';
    const qs = redirectAfter ? `?redirect_after=${encodeURIComponent(redirectAfter)}` : '';
    window.location.href = `${base}/api/auth/sso/start${qs}`;
  }

  /**
   * RP-initiated logout : redirige vers /api/auth/sso/logout qui termine la
   * session Zitadel ET nettoie la session Kinn.
   */
  logout(sessionId?: string) {
    const base = (window as any).__API_BASE__ || '';
    const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    window.location.href = `${base}/api/auth/sso/logout${qs}`;
  }
}
