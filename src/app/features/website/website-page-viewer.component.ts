import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UiPreviewHostComponent } from '../ui/preview/ui-preview-host.component';
import { WebsiteService } from './website.service';
import { UiClassStyleService } from '../ui/services/ui-class-style.service';
import { UiTokensService } from '../ui/services/ui-tokens.service';
import { UiBreakpointsService } from '../ui/services/ui-breakpoints.service';

@Component({
  selector: 'website-page-viewer',
  standalone: true,
  imports: [CommonModule, UiPreviewHostComponent],
  template: `
  <div class="wpv">
    <div class="container">
      <div class="header">
        <div class="left">
          <button class="icon-btn back" (click)="goBack()" title="Retour">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div class="card-title left"><span class="t">Site web</span><span class="s">Aperçu · {{ info }}</span></div>
        </div>
        <div class="actions">
          <button nz-button class="apple-btn" *ngIf="siteId" (click)="duplicateSite()" title="Dupliquer le site">
            <i class="fa-regular fa-copy"></i>
            <span class="label">Dupliquer</span>
          </button>
        </div>
      </div>
      <div class="preview-wrap">
        <ui-preview-host [root]="model" [selectedId]="''" [bp]="'auto'" [state]="'base'" [editing]="false" [version]="version" (select)="noop()"></ui-preview-host>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .wpv { padding: 16px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .header { display:flex; align-items:center; gap:8px; justify-content:space-between; margin-bottom: 8px; }
    .header .left { display:flex; align-items:left; gap:0px; }
    .icon-btn.back { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; border-radius:8px; cursor:pointer; }
    .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .card-title.left { align-items:flex-start; }
    .card-title .t { font-weight:600; font-size:14px; }
    .card-title .s { font-size:12px; color:#64748b; }
    .actions { display:flex; gap:8px; }
    @media (max-width: 640px) { .apple-btn .label { display:none; } }
    .preview-wrap { width: 100%; }
    .preview-wrap > ui-preview-host { display:block; width:100%; }
  `]
})
export class WebsitePageViewerComponent implements OnInit {
  model: any = { id:'root', tag:'div', children: [] };
  info = '';
  version = 1;
  siteId: string | null = null;
  constructor(private route: ActivatedRoute, private svc: WebsiteService, private cls: UiClassStyleService, private tokens: UiTokensService, private bp: UiBreakpointsService, private location: Location) {}
  ngOnInit() {
    const site = this.route.snapshot.queryParamMap.get('site') || '';
    this.siteId = site || null;
    const path = this.route.snapshot.queryParamMap.get('route') || '/';
    this.info = `${site} · ${path}`;
    this.svc.getRouteProject(site, path).subscribe(proj => {
      const p = proj || {} as any;
      if (p.classes) (this.cls as any).classes = p.classes;
      if (p.tokens) { this.tokens.tokens = p.tokens; try { this.tokens.applyToDocument(); } catch {} }
      if (p.breakpoints) (this.bp as any).list = p.breakpoints;
      this.model = p.model || this.model; this.version++;
    });
  }
  noop() {}
  goBack() { try { this.location.back(); } catch { history.back(); } }
  duplicateSite() { if (this.siteId) { (window as any).location = `/websites/editor?duplicateFrom=${encodeURIComponent(this.siteId)}`; } }
}
