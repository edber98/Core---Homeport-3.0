import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export type WebsiteStatus = 'draft' | 'test' | 'live';
export type PageStatus = 'empty' | 'in_progress' | 'done' | 'error';

export interface WebsiteRoute {
  path: string;
  title?: string;
  status?: PageStatus;
  builderState?: 'none' | 'editing' | 'published' | 'archived';
  updatedAt?: string;
}

export interface Website {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tags?: string[];
  status: WebsiteStatus;
  createdAt: string;
  updatedAt: string;
  routes: WebsiteRoute[];
}

@Injectable({ providedIn: 'root' })
export class WebsiteService {
  private sites: Website[] = [
    {
      id: 'site_demo',
      name: 'Demo Site',
      slug: 'demo-site',
      description: 'Site de démonstration',
      tags: ['demo','marketing'],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      routes: [
        { path: '/', title: 'Accueil', status: 'done', builderState: 'published', updatedAt: new Date().toISOString() },
        { path: '/about', title: 'À propos', status: 'in_progress', builderState: 'editing' }
      ]
    }
  ];

  list(): Observable<Website[]> { return of(this.sites); }
  getById(id: string): Observable<Website | undefined> { return of(this.sites.find(s => s.id === id)); }
  upsert(site: Website): Observable<Website> {
    const i = this.sites.findIndex(s => s.id === site.id);
    if (i >= 0) this.sites[i] = { ...site, updatedAt: new Date().toISOString() };
    else this.sites = [{ ...site, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...this.sites];
    return of(site);
  }
}

