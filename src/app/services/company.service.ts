import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { environment } from '../../environments/environment';

export type LicensePlan = 'free' | 'pro' | 'enterprise';

export interface CompanyLicense {
  plan: LicensePlan;
  maxUsers: number;
  maxWorkspaces: number;
}

export interface Company {
  id: string;
  name: string;
  adminUserId: string; // default admin user id
  license: CompanyLicense;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private KEY = 'company.map'; // stores Record<companyId, Company>
  private LEGACY_KEY = 'company.data';

  constructor(private api: ApiClientService) {
    if (!environment.useBackend) this.ensureSeed();
  }

  getCompany(companyId?: string): Observable<Company> {
    if (environment.useBackend) {
      return new Observable<Company>((observer) => {
        this.api.get<any>('/api/company').subscribe({
          next: (c) => {
            const id = (c?.id || companyId || 'acme');
            const local = this.loadMap();
            const merged = { ...(local[id] || this.defaultCompany(id)), id: c?.id || id, name: c?.name || (local[id]?.name) } as Company;
            observer.next(merged);
            observer.complete();
          },
          error: (err) => { observer.error(err); }
        });
      });
    }
    const id = companyId || 'acme';
    const map = this.loadMap();
    return of(map[id] || this.defaultCompany(id));
  }
  updateCompany(patch: Partial<Company>, companyId?: string): Observable<Company> {
    if (environment.useBackend) {
      return new Observable<Company>((observer) => {
        this.api.put<any>('/api/company', { name: patch?.name }).subscribe({
          next: () => {
            // Recharger depuis le backend pour récupérer le nom à jour
            this.getCompany(companyId).subscribe({ next: (c) => { observer.next(c); observer.complete(); }, error: (e) => observer.error(e) });
          },
          error: (err) => observer.error(err)
        });
      });
    }
    const id = companyId || 'acme';
    const map = this.loadMap();
    const curr = map[id] || this.defaultCompany(id);
    const next = { ...curr, ...patch, license: { ...curr.license, ...(patch.license || {}) } } as Company;
    map[id] = next;
    this.saveMap(map);
    return of(next);
  }

  canAddUser(currentCount: number, companyId?: string): boolean {
    const id = companyId || 'acme';
    const map = this.loadMap();
    const c = map[id] || this.defaultCompany(id);
    return currentCount < c.license.maxUsers;
  }
  canAddWorkspace(currentCount: number, companyId?: string): boolean {
    const id = companyId || 'acme';
    const map = this.loadMap();
    const c = map[id] || this.defaultCompany(id);
    return currentCount < c.license.maxWorkspaces;
  }

  setPlan(plan: LicensePlan, companyId?: string): Observable<Company> {
    const id = companyId || 'acme';
    const license = this.planDefaults(plan);
    const map = this.loadMap();
    const curr = map[id] || this.defaultCompany(id);
    const next = { ...curr, license } as Company;
    map[id] = next;
    this.saveMap(map);
    return of(next);
  }

  private ensureSeed() {
    // Migrate legacy single-company storage if present
    try {
      const legacy = localStorage.getItem(this.LEGACY_KEY);
      if (legacy && !localStorage.getItem(this.KEY)) {
        const c = JSON.parse(legacy) as Company;
        const map: Record<string, Company> = {};
        map[c.id || 'acme'] = c;
        // add a Beta company if missing
        if (!map['beta']) map['beta'] = this.defaultCompany('beta', 'Company BETA');
        this.saveMap(map);
        localStorage.removeItem(this.LEGACY_KEY);
        return;
      }
    } catch {}
    // Seed multi-company map if missing
    try {
      const exists = localStorage.getItem(this.KEY);
      if (exists) return;
      const map: Record<string, Company> = {};
      map['acme'] = this.defaultCompany('acme', 'Entreprise ACME');
      map['beta'] = this.defaultCompany('beta', 'Entreprise BETA');
      this.saveMap(map);
    } catch {}
  }

  private planDefaults(plan: LicensePlan): CompanyLicense {
    switch (plan) {
      case 'free': return { plan, maxUsers: 3, maxWorkspaces: 1 };
      case 'enterprise': return { plan, maxUsers: 5000, maxWorkspaces: 500 };
      case 'pro':
      default: return { plan: 'pro', maxUsers: 50, maxWorkspaces: 10 };
    }
  }

  private defaultCompany(id: string, name?: string): Company {
    return { id, name: name || `Entreprise ${id.toUpperCase()}`, adminUserId: id === 'acme' ? 'admin' : 'demo', license: this.planDefaults('pro') };
  }
  private loadMap(): Record<string, Company> {
    try { const raw = localStorage.getItem(this.KEY); if (raw) return JSON.parse(raw); } catch {}
    return { acme: this.defaultCompany('acme', 'Entreprise ACME'), beta: this.defaultCompany('beta', 'Entreprise BETA') };
  }
  private saveMap(map: Record<string, Company>) { try { localStorage.setItem(this.KEY, JSON.stringify(map)); } catch {} }

  resetAll(): Observable<boolean> {
    try {
      localStorage.removeItem(this.KEY);
      localStorage.removeItem(this.LEGACY_KEY);
      this.ensureSeed();
      return of(true);
    } catch {
      return of(false);
    }
  }
}
