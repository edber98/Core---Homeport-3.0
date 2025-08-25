import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DemoDataCleanupService {
  private runKey = 'app.demo.cleanup.v1';
  constructor() {
    if (!environment.useBackend) return;
    try {
      if (localStorage.getItem(this.runKey)) return;
      const prefixes = ['acl.', 'catalog.', 'company.', 'auth.'];
      const keys = Object.keys(localStorage).filter(k => prefixes.some(p => k.startsWith(p)));
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(this.runKey, '1');
    } catch {}
  }
}

