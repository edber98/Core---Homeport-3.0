import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FlowViewerComponent } from './flow-viewer.component';
import { AiConsoleChatComponent } from './components/ai-console-chat.component';
import { CatalogService, NodeTemplate } from '../../services/catalog.service';
import { AiConsoleBackendService, AiChatThread, AiContext } from '../../services/ai-console-backend.service';

import { ConnectionSettings } from 'ngx-vflow';
import { backAwareCurve } from './edge-curves';

@Component({
  selector: 'flow-ai-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, NzButtonModule, NzInputModule, NzIconModule, NzSelectModule, NzDrawerModule, FlowViewerComponent, AiConsoleChatComponent],
  template: `
  <div class="ai-console">
    <section class="viewer">
      <div class="loading-overlay" *ngIf="loadingFlowDoc">
        <div class="spinner"></div>
        <div class="text">Chargement du flow…</div>
      </div>
      <div class="empty" *ngIf="!flowId && !loadingFlowDoc">Sélectionnez un flow (paramètre ?flow=ID) pour afficher le viewer.</div>
      <flow-viewer *ngIf="flowId" [nodes]="nodes" [edges]="edges" [background]="flowBackground" [connectionSettings]="connectionSettings" [useStorage]="false" [showBottomBar]="true" [showRun]="false" [showSave]="false" [showCenterFlow]="true" [meta]="flowMeta" [showExecBadges]="false"></flow-viewer>
    </section>
    <aside class="chat">
      <ai-console-chat [flowId]="flowId" (openThread)="onOpenThread($event)" (snapshot)="onGraph($event)" (save)="onSave()" (openViewer)="drawerVisible = true"></ai-console-chat>
    </aside>
  </div>
  <nz-drawer *ngIf="isMobile" [nzVisible]="drawerVisible" nzPlacement="right" [nzWidth]="'100%'" [nzClosable]="true" nzTitle="Flow" [nzBodyStyle]="{padding:'0'}" (nzOnClose)="drawerVisible=false">
    <ng-container *nzDrawerContent>
      <flow-viewer *ngIf="flowId" [nodes]="nodes" [edges]="edges" [background]="flowBackground" [connectionSettings]="connectionSettings" [useStorage]="false" [showBottomBar]="true" [showRun]="false" [showSave]="false" [showCenterFlow]="true" [meta]="flowMeta" [showExecBadges]="false"></flow-viewer>
    </ng-container>
  </nz-drawer>
  `,
  styles: [`
    .ai-console { position: relative; display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 0; height:100%; min-height:0; }
    .viewer { position: relative; min-height:0; height:100%; }
    .viewer .empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#6b7280; font-size:13px; }
    .chat { background:#fff; display:flex; flex-direction:column; min-height:0; height:100%; }
    .loading-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; background:rgba(255,255,255,0.6); z-index:2; }
    .loading-overlay .spinner { width:26px; height:26px; border-radius:50%; border:3px solid #eee; border-top-color:#1677ff; animation:spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    @media (max-width: 1024px) {
      .ai-console { grid-template-columns: 1fr; }
      .viewer { display: none; }
      .chat { border-left:none; border-top: 1px solid #e5e7eb; }
    }
  `]
})
 export class FlowAiConsoleComponent implements OnInit, OnDestroy {
  flowId: string | null = null;
  loadingFlowDoc = false;
 nodes: any[] = [];
 edges: any[] = [];
  flowName = '';
  flowMeta: any = {};
  drawerVisible = false;
  isMobile = false;
  private mql?: MediaQueryList;
  private onMqlChange?: () => void;
  flowBackground = '#EEF0F4';
  portOrientation: 'vertical'|'horizontal' = 'horizontal';
  connectionSettings: ConnectionSettings = { type: 'template', curve: backAwareCurve } as any;
  private templatesMap = new Map<string, NodeTemplate>();

  constructor(private route: ActivatedRoute, private router: Router, private cdr: ChangeDetectorRef, private catalog: CatalogService, private ai: AiConsoleBackendService, private msg: NzMessageService) {
    try {
      const qp = this.route.snapshot.queryParamMap;
      this.flowId = qp.get('flow');
      if (qp.get('port') === 'vertical') this.portOrientation = 'vertical';
    } catch {}
    // TECH NOTE (template enrichment):
    // FlowViewer relies on model.templateObj to decide handle placement (start/condition/loop…)
    // In Console AI we may only have template IDs. Preload templates and enrich nodes so
    // the viewer renders identically to Builder/Executions.
    try {
      this.catalog.listNodeTemplates().subscribe(list => {
        (list || []).forEach(t => this.templatesMap.set(t.id, t));
        // If nodes already loaded without enrichment, re-enrich now
        try {
          if (Array.isArray(this.nodes) && this.nodes.some((n:any)=>!(n?.data?.model?.templateObj))) {
            this.nodes = this.enrichNodes(this.nodes);
            try { this.cdr.detectChanges(); } catch {}
          }
        } catch {}
      });
    } catch {}
    this.loadFlow();
  }

  ngOnInit() {
    try {
      this.mql = window.matchMedia('(max-width: 1024px)');
      this.onMqlChange = () => { this.isMobile = !!this.mql?.matches; if (!this.isMobile) this.drawerVisible = false; try { this.cdr.detectChanges(); } catch {} };
      this.mql.addEventListener ? this.mql.addEventListener('change', this.onMqlChange) : (this.mql as any).addListener?.(this.onMqlChange);
      this.onMqlChange();
    } catch {}
  }
  ngOnDestroy() {
    try {
      if (this.mql && this.onMqlChange) {
        this.mql.removeEventListener ? this.mql.removeEventListener('change', this.onMqlChange) : (this.mql as any).removeListener?.(this.onMqlChange);
      }
    } catch {}
  }

  private loadFlow() {
    const id = this.flowId; if (!id) return;
    this.loadingFlowDoc = true;
    this.catalog.getFlow(id).subscribe({
      next: (doc) => {
        const nodes = (doc?.nodes || []).map(n => ({ ...n }));
        this.nodes = this.enrichNodes(nodes);
        this.edges = (doc?.edges || []).map(e => ({ ...e }));
        this.flowName = doc?.name || id;
        this.flowMeta = (doc?.meta ? { ...doc.meta } : {});
        this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {}
      },
      error: () => { this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {} }
    });
  }

  onGraph(g: any) {
    try {
      const nodes = Array.isArray(g?.nodes) ? g.nodes : [];
      const edges = Array.isArray(g?.edges) ? g.edges : [];
      this.nodes = this.enrichNodes(nodes.map((n: any) => ({ ...n })));
      this.edges = edges.map((e: any) => ({ ...e }));
      this.cdr.detectChanges();
    } catch {}
  }
  onOpenThread(_t: any) {}

  onSave() {
    const id = this.flowId; if (!id) return;
    const doc = { id, name: this.flowName || id, nodes: this.nodes || [], edges: this.edges || [], meta: this.flowMeta || {} } as any;
    this.catalog.saveFlow(doc).subscribe({
      next: () => { try { this.msg.success('Flow sauvegardé'); } catch {} },
      error: (err) => { try { console.error('Save error', err); this.msg.error('Échec de la sauvegarde'); } catch {} }
    });
  }

  // Patch template metadata to nodes when missing (align visuals with Builder/Executions)
  // Tries common fields: model.templateId | model.template?.id | model.templateKey
  private enrichNodes(nodes: any[]): any[] {
    try {
      if (!Array.isArray(nodes) || nodes.length === 0) return nodes || [];
      const map = this.templatesMap || new Map<string, NodeTemplate>();
      return nodes.map((n: any) => {
        try {
          const m = (n?.data?.model || {});
          if (!m) return n;
          if (!m.templateObj) {
            const key = String(m.templateId || m.template?.id || m.templateKey || m.template || '').trim();
            if (key && map.has(key)) {
              const tpl = map.get(key)!;
              n = { ...n, data: { ...(n.data || {}), model: { ...m, templateObj: tpl } } };
            }
          }
          return n;
        } catch { return n; }
      });
    } catch { return nodes || []; }
  }
}
