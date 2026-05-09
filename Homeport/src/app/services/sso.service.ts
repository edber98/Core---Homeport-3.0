import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { apiRoot, apiSuffix } from '../shared/api-base';
import { environment } from '../../environments/environment';

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
   * Construit une URL backend complète. En dev, l'apiRoot pointe sur le port
   * backend (ex http://localhost:5055). En prod, sur le même origin que le front.
   * On NE PASSE PAS par ApiClientService car ces endpoints font des redirects
   * HTTP (302) — il faut une navigation full page, pas un fetch XHR.
   */
  private backendUrl(path: string): string {
    const root = apiRoot();
    const suffix = apiSuffix();
    // En prod, suffix = '/api' → on retire ce préfixe du path pour éviter doublon
    const cleanPath = environment.production ? path.replace(/^\/api\b/, '') : path;
    return `${root}${suffix}${cleanPath}`;
  }

  /**
   * Démarre le flow SSO : redirige le navigateur vers /api/auth/sso/start
   * (qui lui-même redirige vers Zitadel).
   */
  start(redirectAfter?: string) {
    const qs = redirectAfter ? `?redirect_after=${encodeURIComponent(redirectAfter)}` : '';
    window.location.href = this.backendUrl('/api/auth/sso/start') + qs;
  }

  /**
   * RP-initiated logout : redirige vers /api/auth/sso/logout qui termine la
   * session Zitadel ET nettoie la session Kinn.
   */
  logout(sessionId?: string) {
    const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    window.location.href = this.backendUrl('/api/auth/sso/logout') + qs;
  }
}
