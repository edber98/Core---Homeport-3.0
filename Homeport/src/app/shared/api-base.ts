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

// Construit une URL API à partir d'un chemin; en production, supprime le préfixe '/api' du chemin
