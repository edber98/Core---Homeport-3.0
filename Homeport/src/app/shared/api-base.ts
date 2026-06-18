import { environment } from '../../environments/environment';

export function apiRoot(): string {
  if (environment.production) {
    const fromWindow = (window as any)?.env?.apiBaseUrl;
    const origin = (fromWindow && String(fromWindow)) || location.origin;
    return String(origin).replace(/\/$/, '');
  }
  const base = (environment.apiBaseUrl || '').replace(/\/$/, '');
  return base;
}

export function apiSuffix(): string {
  if (environment.production) {
    const s = (environment as any).pathSuffix || '/api';
    return String(s).startsWith('/') ? String(s) : '/' + String(s);
  }
  return '';
}

// Base URL pour les requêtes API (incluant le pathSuffix en production)
export function apiBase(): string {
  return `${apiRoot()}${apiSuffix()}`;
}

// Construit une URL API ABSOLUE à partir d'un chemin '/api/...'.
// À utiliser pour EventSource/SSE qui ne passent pas par l'intercepteur HTTP.
// En production, le suffix est inclus dans la base → on retire le préfixe '/api' du chemin.
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : '/' + path;
  const cleanPath = environment.production ? p.replace(/^\/api\b/, '') : p;
  return `${apiRoot()}${apiSuffix()}${cleanPath}`;
}
