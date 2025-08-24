import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

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
  private KEY = 'company.data';
  private ID = 'acme';

  constructor() {
    this.ensureSeed();
  }

  getCompany(): Observable<Company> { return of(this.load()); }
  updateCompany(patch: Partial<Company>): Observable<Company> {
    const curr = this.load();
    const next = { ...curr, ...patch, license: { ...curr.license, ...(patch.license || {}) } };
    this.save(next);
    return of(next);
  }

  canAddUser(currentCount: number): boolean {
    const c = this.load();
    return currentCount < c.license.maxUsers;
  }
  canAddWorkspace(currentCount: number): boolean {
    const c = this.load();
    return currentCount < c.license.maxWorkspaces;
  }

  setPlan(plan: LicensePlan): Observable<Company> {
    const license = this.planDefaults(plan);
    const curr = this.load();
    const next = { ...curr, license };
    this.save(next);
    return of(next);
  }

  private ensureSeed() {
    try {
      const exists = localStorage.getItem(this.KEY);
      if (exists) return;
      const seed: Company = {
        id: this.ID,
        name: 'Demo Company',
        adminUserId: 'admin',
        license: this.planDefaults('pro'),
      };
      this.save(seed);
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

  private load(): Company {
    try { const raw = localStorage.getItem(this.KEY); if (raw) return JSON.parse(raw); } catch {}
    return { id: this.ID, name: 'Demo Company', adminUserId: 'admin', license: this.planDefaults('pro') };
  }
  private save(c: Company) { try { localStorage.setItem(this.KEY, JSON.stringify(c)); } catch {} }
}

