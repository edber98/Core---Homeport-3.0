import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { CatalogService, AppProvider } from '../services/catalog.service';
import { Vflow, Edge, Connection, ConnectionSettings } from 'ngx-vflow';

@Component({
  selector: 'dev-dnd-overlay-playground',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, NzButtonModule, NzInputModule, Vflow, NzDrawerModule],
  template: `
  <div class="dev-page">
    <div class="header">
      <div>
        <h1>DEV — DnD + Dialog overlay</h1>
        <p>Test d'interactions iOS: éléments draggable, drop lists, et drawer (comme palette).</p>
      </div>
      <div class="actions btn-row">
        <label class="apple-btn" style="gap:8px;">
          <input type="checkbox" [(ngModel)]="hardUnmountVflow" style="margin:0" />
          <span class="label">Démonter vflow pendant drawer</span>
        </label>
        <button nz-button nzType="primary" (click)="openDrawer()" (touchstart)="openDrawer(); $event.preventDefault(); $event.stopPropagation()"><i class="fa-regular fa-square-plus"></i> Ouvrir le drawer</button>
      </div>
    </div>
    <!-- Outside palette (same template as in drawer) -->
    <ng-template #paletteContent let-prefix="prefix">
      <aside class="palette" >
        <div class="panel-heading">
          <div class="card-title left">
            <span class="t">Node</span>
            <span class="s">Palette & Contexte</span>
          </div>
        </div>
        <!-- Test input (nz-input) to verify focus/tap inside drawer on iPhone -->
        <div class="search-row">
          <input nz-input placeholder="Tapez ici pour tester le focus (iPhone)" />
        </div>
        <div class="groups">
          <div class="group" *ngFor="let g of paletteGroups; let gi = index">
            <div class="group-title">
              <span class="group-mini" *ngIf="g.appId" [style.background]="g.appColor || '#f3f4f6'">
                <i *ngIf="g.appIconClass" [class]="g.appIconClass"></i>
                <img *ngIf="!g.appIconClass && g.appIconUrl" [src]="g.appIconUrl" alt="icon" />
                <img *ngIf="!g.appIconClass && !g.appIconUrl && g.appId" [src]="simpleIconUrl(g.appId)" alt="icon" />
              </span>
              {{ g.title }}
            </div>
            <div class="items" cdkDropList [id]="prefix + '_group_' + gi" [cdkDropListData]="g.items" [cdkDropListSortingDisabled]="true" [cdkDropListConnectedTo]="(prefix === 'drawer') ? ['drawerDrop'] : ['devCanvasList']" (cdkDropListDropped)="dropped($event)">
              <div class="item" *ngFor="let it of g.items" cdkDrag [cdkDragData]="it" [cdkDragStartDelay]="touchDragDelay" [cdkDragBoundary]="'.ant-drawer'" [cdkDragRootElement]="'.ant-drawer'" (cdkDragStarted)="onDragStarted()" (cdkDragEnded)="onDragEnded()">
                <i *ngIf="miniIconClass(it)" class="mini" [class]="miniIconClass(it)"></i>
                <span class="lbl">{{ it.label }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Proxy drop zone inside the drawer to add nodes into vflow without dragging over the canvas -->
        <div *ngIf="prefix === 'drawer'" class="drawer-drop" cdkDropList id="drawerDrop" [cdkDropListData]="drawerDrops" [cdkDropListConnectedTo]="drawerGroupIds" (cdkDropListDropped)="dropIntoDrawer($event)">
          <div class="hint">Déposez ici pour ajouter le nœud au canvas</div>
          <div class="chip" *ngFor="let it of drawerDrops">{{ it.label }}</div>
        </div>
      </aside>
    </ng-template>

    <div class="layout">
      <div class="left">
        <ng-container [ngTemplateOutlet]="paletteContent" [ngTemplateOutletContext]="{ prefix: 'outside' }"></ng-container>
      </div>
      <div class="right">
        <div class="playground">
          <div class="list" cdkDropList [cdkDropListData]="left" [cdkDropListConnectedTo]="['rightList']" (cdkDropListDropped)="dropped($event)" id="leftList">
            <div class="item" *ngFor="let it of left" cdkDrag>{{ it }}</div>
          </div>
          <div class="list" cdkDropList [cdkDropListData]="right" [cdkDropListConnectedTo]="['leftList']" (cdkDropListDropped)="dropped($event)" id="rightList">
            <div class="item" *ngFor="let it of right" cdkDrag>{{ it }}</div>
          </div>
        </div>
        <div class="canvas-host" *ngIf="!(hardUnmountVflow && drawerVisible)">
          <div class="hint">Drop depuis la palette (drawer ou hors-drawer) ⇒ un nœud est ajouté ci‑dessous</div>
          <vflow view="auto" background="#EEF0F4" [entitiesSelectable]="true" [minZoom]="0.05" [maxZoom]="3"
                
                  [nodes]="nodes" [edges]="edges" [connection]="connectionSettings"
                  (onConnect)="onConnect($event)"
                  #flow>
            <ng-template let-ctx edge>
              <svg:g customTemplateEdge>
                <svg:path fill="none" [attr.d]="ctx.path()" [attr.stroke-width]="2" [attr.stroke]="'#b1b1b7'" [attr.marker-end]="ctx.markerEnd()" />
              </svg:g>
            </ng-template>
            <ng-template let-ctx nodeHtml>
              <div class="node-card" [attr.data-node-id]="ctx.node.id">
                <div class="header">
                  <i [class]="ctx.node.data.model.templateObj?.icon" class="icon" *ngIf="ctx.node.data.model.templateObj?.icon"></i>
                  <div class="meta">
                    <div class="title">{{ ctx.node.data.model.templateObj?.title || ctx.node.data.model?.name }}</div>
                    <div class="subtitle">{{ ctx.node.data.model.templateObj?.subtitle || ctx.node.data.model.templateObj?.category || ctx.node.data.model.templateObj?.type }}</div>
                  </div>
                </div>
                <ng-container *ngIf="inputId(ctx.node.data.model.templateObj) as inId">
                  <ng-template #handleInTpl let-hctx>
                    <svg:g>
                      <svg:circle [attr.cx]="hctx.point().x" [attr.cy]="hctx.point().y" [attr.r]="4" [attr.fill]="'#000'" [attr.stroke]="'#fff'" stroke-width="1"></svg:circle>
                    </svg:g>
                  </ng-template>
                  <handle position="top" type="target" [id]="inId" [template]="handleInTpl" />
                </ng-container>
                <div class="outputs" *ngIf="outputIds(ctx.node.data.model)?.length as outs">
                  <div class="out" *ngFor="let out of outputIds(ctx.node.data.model); let i = index" [ngClass]="{ error: out === 'err' }">
                    <ng-template #hTpl let-hctx>
                      <svg:g>
                        <svg:circle [attr.cx]="hctx.point().x" [attr.cy]="hctx.point().y" [attr.r]="4" [attr.fill]="(out === 'err') ? '#f759ab' : '#000'" [attr.stroke]="'#fff'" stroke-width="1"></svg:circle>
                      </svg:g>
                    </ng-template>
                    <handle position="bottom" type="source" [id]="out" [template]="hTpl" />
                  </div>
                </div>
              </div>
            </ng-template>
          </vflow>
        </div>
      </div>
    </div>
    <div class="canvas-drop" cdkDropList id="devCanvasList" [cdkDropListData]="canvas" (cdkDropListDropped)="dropped($event)" [cdkDropListConnectedTo]="paletteConnectedIds">
      <div class="hint">Zone de drop (ajoute un nœud dans le canvas)</div>
      <div class="canvas-chip" *ngFor="let it of canvas">{{ it.label }}</div>
    </div>

    <nz-drawer [nzVisible]="drawerVisible" [nzZIndex]="20000" (nzOnClose)="closeDrawer()" nzPlacement="left" [nzWidth]="360" [nzBodyStyle]="{padding:'8px'}" [nzClosable]="true" [nzMaskClosable]="!dragging" nzWrapClassName="ios-safe-drawer" nzTitle="Drawer avec DnD (palette)">
      <ng-container *nzDrawerContent>
        <ng-container [ngTemplateOutlet]="paletteContent" [ngTemplateOutletContext]="{ prefix: 'drawer' }"></ng-container>
      </ng-container>
    </nz-drawer>
  </div>
  `,
  styles: [`
    .layout { display:grid; grid-template-columns: 320px 1fr; gap: 12px; }
    @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
    .dev-page { padding: 16px; max-width: 1080px; margin: 0 auto; }
    .header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 12px; gap: 10px; flex-wrap: wrap; position: relative; z-index: 5; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 650; }
    .header p { margin: 4px 0 0; color:#6b7280; }
    .playground { display:flex; gap: 12px; }
    .list { flex:1 1 0; min-height: 140px; border:1px dashed #d1d5db; border-radius: 10px; padding: 8px; background: #fff; }
    .item { padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom: 8px; background:#fff; cursor: grab; }
    .item:active { cursor: grabbing; }
    .canvas-host { height: 380px; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; background:#EEF0F4; }
    .canvas-drop { margin-top: 12px; min-height: 80px; border:1px dashed #9ca3af; border-radius:10px; padding:8px; background:#fafafa; }
    .canvas-drop .hint { color:#6b7280; font-size:12px; margin-bottom:6px; }
    .canvas-chip { display:inline-block; background:#fff; border:1px solid #e5e7eb; border-radius:999px; padding:2px 8px; font-size:12px; margin: 2px; }

    /* Drawer palette styles */
    .palette { display:block; }
    .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; margin:0 0 8px; border-bottom:1px solid #E2E1E4; }
    .panel-heading .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .panel-heading .card-title .t { font-weight:600; font-size:13px; }
    .panel-heading .card-title .s { font-size:12px; color:#64748b; }
    .search-row { position: sticky; top: 0; background: #fff; z-index: 2; padding: 8px 0 8px; }
    .search-row input[nz-input] { height: 32px; }
    .group { margin-bottom: 10px; }
    .group-title { font-weight:600; font-size:13px; color:#111; margin: 10px 0 6px; display:flex; align-items:center; gap:6px; }
    .group-mini { width: 14px; height: 14px; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; }
    .group-mini i { font-size: 10px; line-height: 1; color:#fff; }
    .group-mini img { width: 10px; height: 10px; object-fit: contain; display:block; }
    .items .item { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
    .items .item .mini { font-size:12px; color:#64748b; }
    .items .item:active { cursor: grabbing; }
    .drawer-drop { margin-top: 10px; padding: 8px; border:1px dashed #cbd5e1; border-radius: 10px; background:#fff; }
    .drawer-drop .hint { font-size:12px; color:#64748b; margin-bottom:6px; }
    .drawer-drop .chip { display:inline-block; background:#f8fafc; border:1px solid #e5e7eb; border-radius:999px; padding:2px 8px; font-size:12px; margin: 2px; }

    /* Node card styles copied from flow-builder */
    .node-card { position: relative; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; min-width: 180px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .node-card .header { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
    .node-card .icon { width: 20px; height: 20px; display:inline-block; }
    .node-card .meta .title { font-weight: 600; }
    .node-card .meta .subtitle { color:#8c8c8c; font-size: 12px; }
    .node-card .outputs { display:flex; gap:10px; justify-content:center; margin-top: 0; }
    .node-card .outputs .out { display:flex; align-items:center; justify-content:center; width:16px; }
  `]
})
export class DevDndOverlayPlaygroundComponent {
  // Base lists on page to demonstrate background DnD
  left = ['A', 'B', 'C'];
  right = ['D', 'E'];

  // Palette data (from node templates)
  items: any[] = [];
  private appsMap = new Map<string, AppProvider>();
  drawerVisible = false;

  // Canvas accepting drops from palette (drawer)
  canvas: any[] = [];
  nodes: any[] = [];
  edges: Edge[] = [];
  connectionSettings: ConnectionSettings = {};
  private nextX = 120;
  private nextY = 100;
  touchDragDelay = 150; // ms, to allow taps to be recognized on touch devices
   dragging = false;
  hardUnmountVflow = true;
  drawerDrops: any[] = [];

  constructor(private catalog: CatalogService, private zone: NgZone, private cdr: ChangeDetectorRef) {
    try {
      this.catalog.listApps().subscribe(list => this.zone.run(() => {
        (list || []).forEach(a => this.appsMap.set(a.id, a));
      }));
      this.catalog.listNodeTemplates().subscribe(tpls => this.zone.run(() => {
        this.items = (tpls || []).map(t => ({ label: (t as any).title || t.name || t.id, template: t }));
        try { this.cdr.detectChanges(); } catch {}
      }));
    } catch {}
  }

  onPalettePointerDown(ev: Event) {
    // Keep interactions inside palette from bubbling to vflow/CDK/global handlers
    try { (ev as any).stopImmediatePropagation?.(); } catch {}
    try { ev.stopPropagation(); } catch {}
    // do not preventDefault to keep clicks/focus working inside palette
  }

  onDragStarted() { this.dragging = true; }
  onDragEnded() { this.dragging = false; }

  get paletteConnectedIds(): string[] { return this.paletteGroups.map((_g: any, i: number) => `outside_group_${i}`); }
  get drawerGroupIds(): string[] { return this.paletteGroups.map((_g: any, i: number) => `drawer_group_${i}`); }

  // Open/close with explicit change detection to ensure *ngIf updates
  openDrawer() {
    this.zone.run(() => {
      this.drawerVisible = true;
      try { this.cdr.detectChanges(); } catch {}
    });
  }
  closeDrawer() {
    this.zone.run(() => {
      this.drawerVisible = false;
      try { this.cdr.detectChanges(); } catch {}
    });
  }

  // Group by app (provider) like flow-builder palette
  get paletteGroups(): { title: string; items: any[]; appId?: string; appColor?: string; appIconClass?: string; appIconUrl?: string }[] {
    const out: { title: string; items: any[]; appId?: string; appColor?: string; appIconClass?: string; appIconUrl?: string }[] = [];
    const byApp = new Map<string, any[]>();
    const ensure = (key: string) => { if (!byApp.has(key)) byApp.set(key, []); return byApp.get(key)!; };
    for (const it of this.items) {
      const tpl = it?.template || {};
      const appId = String(((tpl as any)?.appId || (tpl as any)?.app?._id || '')).trim();
      const key = appId || '';
      ensure(key).push(it);
    }
    const appKeys = Array.from(byApp.keys()).sort((a, b) => a.localeCompare(b));
    for (const key of appKeys) {
      const app = key ? this.appsMap.get(key) : undefined;
      const title = app ? (app.title || app.name || app.id) : 'Sans App';
      out.push({ title, items: byApp.get(key)!, appId: key || undefined, appColor: app?.color, appIconClass: app?.iconClass, appIconUrl: app?.iconUrl });
    }
    return out;
  }

  // Only show template icon class (no app icon fallback)
  miniIconClass(it: any): string {
    try { const ic = it?.template?.icon; return (ic && typeof ic === 'string' && !/^https?:\/\//i.test(ic)) ? ic : ''; } catch { return ''; }
  }

  simpleIconUrl(id: string): string { return id ? `https://cdn.simpleicons.org/${encodeURIComponent(id)}` : ''; }

  // Handle drops across all lists
  dropped(ev: CdkDragDrop<any[]>) {
    if (!ev) return;
    if (ev.previousContainer === ev.container) {
      moveItemInArray(ev.container.data, ev.previousIndex, ev.currentIndex);
      return;
    }
    // If dropping from a palette group into canvas
    if ((ev.container?.id || '').toString() === 'devCanvasList') {
      const data = ev.previousContainer.data;
      const src = Array.isArray(data) ? data[ev.previousIndex] : null;
      if (src) {
        this.canvas.splice(ev.currentIndex, 0, src);
        this.addNodeFromItem(src);
      }
      return;
    }
    // Generic transfer between cdk lists
    transferArrayItem(ev.previousContainer.data, ev.container.data, ev.previousIndex, ev.currentIndex);
  }

  dropIntoDrawer(ev: CdkDragDrop<any[]>) {
    const data = ev.previousContainer.data;
    const src = Array.isArray(data) ? data[ev.previousIndex] : null;
    if (src) {
      this.addNodeFromItem(src);
      this.drawerDrops.splice(ev.currentIndex, 0, src);
      try { this.cdr.detectChanges(); } catch {}
    }
  }

  private addNodeFromItem(it: any) {
    const templateObj = it?.template || it;
    const id = 'devnode_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const model: any = { id, name: templateObj?.name || templateObj?.title || templateObj?.type || 'Node', template: templateObj?.id, templateObj, context: {} };
    const node = { id, point: { x: this.nextX, y: this.nextY }, type: 'html-template', data: { model } };
    this.nodes = [...this.nodes, node];
    this.nextX += 180; if (this.nextX > 600) { this.nextX = 120; this.nextY += 160; }
  }

  // Minimal connection handler
  onConnect(_c: Connection) {}

  inputId(tpl: any): string | null { try { return (tpl?.type || '') === 'start' ? null : 'in'; } catch { return 'in'; } }
  outputIds(model: any): string[] {
    try {
      const tmpl = model?.templateObj || {};
      if ((tmpl?.type || '') === 'start') return ['out'];
      if ((tmpl?.type || '') === 'condition') {
        const field = tmpl.output_array_field || 'items';
        const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        if (Array.isArray(arr) && arr.length) return arr.map((_, i) => String(i));
        return ['0','1'];
      }
      if ((tmpl?.type || '') === 'loop') return ['each','next','end'];
      const outs: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output.map((_v: any, i: number) => String(i)) : ['0'];
      if (tmpl.authorize_catch_error) return ['err', ...outs];
      return outs;
    } catch { return ['0']; }
  }
}
