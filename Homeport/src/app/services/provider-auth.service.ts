import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { apiRoot } from '../shared/api-base';
import { AppProvider } from './catalog.service';

/**
 * Champs gérés automatiquement par le flow OAuth2 managé (bouncer). Ils sont
 * remplis par le backend après la connexion — l'utilisateur ne les saisit pas.
 */
const OAUTH2_MANAGED_KEYS = new Set([
  'accessToken', 'refreshToken', 'expiresIn', 'expiresAt', 'accountEmail',
  'accountName', 'scope', 'connectedAt', 'providerKey', 'tokenType',
  'openId', 'unionId', 'username', 'avatarUrl', 'id', 'displayName', 'email',
]);

export interface OAuth2CredentialValues {
  refreshToken?: string;
  accessToken?: string;
  accountEmail?: string;
  accountName?: string;
  scope?: string;
  connectedAt?: string;
  providerKey?: string;
  tokenType?: string;
  [key: string]: any;
}

type AuthPrepareResponse = {
  authorizeUrl: string;
  callbackOrigin?: string;
  providerKey: string;
  vendor?: string;
  authType: string;
  state: string;
};

type AuthPopupMessage = {
  type: 'kinn:provider-auth:result';
  state: string;
  success: boolean;
  payload?: { providerKey: string; workspaceId: string; authType: string; values: OAuth2CredentialValues };
  error?: { code?: string; message?: string };
};

@Injectable({ providedIn: 'root' })
export class ProviderAuthService {
  constructor(private api: ApiClientService) {}

  private normalizeOrigin(value?: string | null): string {
    try {
      const raw = String(value || '').trim();
      if (!raw) return '';
      return new URL(raw).origin;
    } catch {
      return '';
    }
  }

  /** Type d'auth managée du provider ('oauth2' | null). */
  getManagedAuthType(provider?: AppProvider | null): string | null {
    const type = String(provider?.auth?.type || '').trim().toLowerCase();
    return type || null;
  }

  /** True si le provider expose un flow de connexion managé (bouton « Connecter »). */
  hasManagedCredentialFlow(provider?: AppProvider | null): boolean {
    return this.getManagedAuthType(provider) === 'oauth2';
  }

  /** True si un credential donné est effectivement connecté. */
  hasCredentialValues(provider: AppProvider | null | undefined, values: any): boolean {
    if (this.getManagedAuthType(provider) === 'oauth2') {
      return !!String(values?.refreshToken || values?.accessToken || '').trim();
    }
    return false;
  }

  /** Schéma d'affichage (lecture seule) du credential managé. */
  getCredentialSchema(provider?: AppProvider | null): any {
    if (!this.hasManagedCredentialFlow(provider)) return null;
    if (provider?.credentialsForm) return provider.credentialsForm;
    return {
      title: 'Connexion OAuth2',
      ui: { layout: 'vertical', labelsOnTop: true },
      fields: [
        { type: 'text', key: 'accountEmail', label: 'Compte connecté', col: { xs: 24 } },
        { type: 'textarea', key: 'scope', label: 'Périmètres accordés', col: { xs: 24 } },
        { type: 'text', key: 'connectedAt', label: 'Connecté le', col: { xs: 24 } },
      ],
      displayTitle: false,
      displayDescription: false,
    };
  }

  /**
   * Schéma des champs SUPPLÉMENTAIRES à saisir manuellement pour un provider
   * managé : on retire tous les champs gérés automatiquement par le flow OAuth2
   * (refreshToken, accountEmail, scope…). Retourne `null` s'il ne reste rien
   * → dans ce cas l'UI n'affiche que le bouton « Se connecter ».
   */
  getSupplementalCredentialSchema(provider?: AppProvider | null): any {
    if (!this.hasManagedCredentialFlow(provider)) return provider?.credentialsForm || null;
    return this.cloneSchemaWithoutManagedFields(provider?.credentialsForm || null, OAUTH2_MANAGED_KEYS);
  }

  /** Clone un FormSchema en supprimant les champs dont la clé est gérée. */
  private cloneSchemaWithoutManagedFields(schema: any, managedKeys: Set<string>): any | null {
    if (!schema || typeof schema !== 'object') return null;
    let hasContent = false;
    const next: any = { ...schema };

    const filterFields = (fields: any[]) => fields
      .filter((f: any) => { const k = String(f?.key || '').trim(); return !k || !managedKeys.has(k); })
      .map((f: any) => ({ ...f }));

    if (Array.isArray(schema.fields)) {
      const fields = filterFields(schema.fields);
      if (fields.length) { next.fields = fields; hasContent = true; } else { delete next.fields; }
    }
    if (Array.isArray(schema.steps)) {
      const steps = schema.steps
        .map((step: any) => {
          const ns: any = { ...step };
          if (Array.isArray(step?.fields)) ns.fields = filterFields(step.fields);
          return ns;
        })
        .filter((step: any) => !Array.isArray(step?.fields) || step.fields.length > 0);
      if (steps.length) { next.steps = steps; hasContent = true; } else { delete next.steps; }
    }
    return hasContent ? next : null;
  }

  /**
   * Lance le flow OAuth2 managé : ouvre une popup, prépare le flow côté backend
   * (signe le state + pose le cookie CSRF), redirige la popup vers le provider,
   * puis attend le postMessage du callback (relayé par le bouncer).
   * Résout avec les `values` à sauvegarder dans un Credential.
   */
  connect(provider: AppProvider, workspaceId: string): Promise<{ providerKey: string; workspaceId: string; authType: string; values: OAuth2CredentialValues }> {
    if (this.getManagedAuthType(provider) !== 'oauth2') {
      return Promise.reject(new Error('Le provider ne supporte pas de flow d’authentification managé.'));
    }
    const popup = this.openPopup();
    if (!popup) {
      return Promise.reject(new Error('Popup bloquée. Autorisez les popups pour lancer la connexion OAuth2.'));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let state = '';
      let callbackOrigin = '';
      let closePoll: ReturnType<typeof setInterval> | null = null;
      let lsPoll: ReturnType<typeof setInterval> | null = null;
      let bc: BroadcastChannel | null = null;

      // Triple-canal pour recevoir le résultat depuis la popup (le callback
      // backend kinn-app diffuse sur les 3) :
      //  1. window 'message' (postMessage via window.opener)
      //  2. BroadcastChannel('kinn:oauth') (same-origin, indépendant de l'opener)
      //  3. localStorage 'storage' event + polling backup (clé kinn:oauth:result:<state>)
      // Le premier qui arrive gagne, finish() nettoie les 3 abonnements.

      const finish = (cb: () => void) => {
        if (settled) return;
        settled = true;
        try { window.removeEventListener('message', onMessage); } catch {}
        try { window.removeEventListener('storage', onStorage); } catch {}
        if (closePoll) clearInterval(closePoll);
        if (lsPoll) clearInterval(lsPoll);
        if (bc) { try { bc.removeEventListener('message', onBcMessage); bc.close(); } catch {} }
        try { if (!popup.closed) popup.close(); } catch {}
        // Cleanup localStorage si la popup a posé le résultat sans qu'on l'ait
        // consommé via storage event (cas où on l'a chopé via BC/postMessage)
        try { if (state) localStorage.removeItem('kinn:oauth:result:' + state); } catch {}
        cb();
      };

      const consumeResult = (data: AuthPopupMessage) => {
        if (!data || data.type !== 'kinn:provider-auth:result') return false;
        if (state && data.state !== state) return false;
        finish(() => {
          if (data.success && data.payload?.values) resolve(data.payload);
          else reject(new Error(String(data.error?.message || 'La connexion OAuth2 a échoué.')));
        });
        return true;
      };

      const onMessage = (event: MessageEvent<AuthPopupMessage>) => {
        const allowedOrigins = new Set([
          this.normalizeOrigin(apiRoot()),
          this.normalizeOrigin(callbackOrigin),
          this.normalizeOrigin(window.location.origin),
        ].filter(Boolean));
        if (!allowedOrigins.has(String(event.origin || ''))) return;
        consumeResult(event.data);
      };

      const onBcMessage = (event: MessageEvent<AuthPopupMessage>) => {
        // BroadcastChannel est déjà same-origin par construction.
        consumeResult(event.data);
      };

      const onStorage = (event: StorageEvent) => {
        // Détecte la pose du résultat par la popup via localStorage.
        if (!event.key || !event.key.startsWith('kinn:oauth:result:')) return;
        if (!event.newValue) return; // suppression (cleanup)
        try { consumeResult(JSON.parse(event.newValue) as AuthPopupMessage); } catch {}
      };

      try { window.addEventListener('message', onMessage); } catch {}
      try { window.addEventListener('storage', onStorage); } catch {}
      try {
        if (typeof BroadcastChannel === 'function') {
          bc = new BroadcastChannel('kinn:oauth');
          bc.addEventListener('message', onBcMessage);
        }
      } catch {}

      // Polling `popup.closed` UNIQUEMENT pour détecter une fermeture
      // utilisateur (croix de la fenêtre). NE PAS rejeter sur exception :
      // quand la popup est sur un cross-origin (Google), Chrome applique
      // `Cross-Origin-Opener-Policy: same-origin-allow-popups` qui throw
      // sur l'accès à `popup.closed` depuis le parent. Si on rejette dans
      // le catch, on annule à tort le flow alors qu'il est encore en cours.
      // Source de vérité de fin = postMessage/BC/localStorage du callback.
      closePoll = setInterval(() => {
        try {
          if (popup.closed) finish(() => reject(new Error('Connexion OAuth2 interrompue.')));
        } catch {
          // COOP cross-origin : popup hors de notre domaine. Ignore.
        }
      }, 1000);

      // Backup : polling localStorage toutes les 500ms. Certains navigateurs
      // ne dispatchent pas le 'storage' event vers la fenêtre qui a écrit,
      // mais ici parent ≠ popup, donc ça devrait fire — ce poll est juste
      // une ceinture-bretelles au cas où.
      lsPoll = setInterval(() => {
        if (!state) return;
        try {
          const raw = localStorage.getItem('kinn:oauth:result:' + state);
          if (raw) consumeResult(JSON.parse(raw) as AuthPopupMessage);
        } catch {}
      }, 500);

      this.api.post<AuthPrepareResponse>('/api/auth/connections/prepare', {
        providerKey: provider.id,
        workspaceId,
        frontendOrigin: window.location.origin,
      }).subscribe({
        next: (resp) => {
          state = String(resp?.state || '').trim();
          callbackOrigin = String(resp?.callbackOrigin || '').trim();
          if (!resp?.authorizeUrl) {
            finish(() => reject(new Error('URL OAuth2 manquante.')));
            return;
          }
          try {
            popup.location.href = resp.authorizeUrl;
            popup.focus();
          } catch {
            finish(() => reject(new Error('Impossible d’ouvrir la fenêtre OAuth2.')));
          }
        },
        error: (err) => {
          finish(() => reject(new Error(String(err?.message || 'Préparation du flow OAuth2 échouée'))));
        }
      });
    });
  }

  /**
   * Liste des providers OAuth2 CONNECTABLES maintenant (app OAuth configurée
   * côté serveur : client_id/secret injectés + concentrateur prêt). Sert à
   * n'afficher « Se connecter » que quand ça marchera réellement.
   * Retourne un Set de providerKey.
   */
  fetchAvailableKeys(): Promise<Set<string>> {
    return new Promise((resolve) => {
      this.api.get<{ providers: Array<{ providerKey: string }> }>('/api/auth/connections/available').subscribe({
        next: (resp) => resolve(new Set((resp?.providers || []).map(p => String(p.providerKey)))),
        error: () => resolve(new Set()),
      });
    });
  }

  listScopes(values: any): string[] {
    const raw = String(values?.scope || '').trim();
    if (!raw) return [];
    return raw.split(/[,\s]+/).filter(Boolean);
  }

  private openPopup(): Window | null {
    try {
      const width = 540, height = 720;
      const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
      const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
      return window.open(
        'about:blank',
        'kinn-provider-auth',
        `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    } catch {
      return null;
    }
  }
}
