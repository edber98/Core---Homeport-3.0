import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
// @ts-ignore — pas de types @types/cytoscape installés
import cytoscape from 'cytoscape';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AccessControlService } from '../../services/access-control.service';
import { RadarBackendService, RadarGraphData, RadarGraphEntity, RadarGraphSummary } from '../../services/radar-backend.service';
import { RadarLabelsService } from './radar-labels.service';

// Onglet « Mémoire » — Knowledge Graph avec Cytoscape.js (layout force-directed
// auto). Clic sur un nœud → il devient le centre, son voisinage est mis en
// évidence (sous-liens de 2e degré atténués). Bouton « Infos » → panneau détaillé.

const CORE_COLORS: Record<string, string> = {
  Party: '#1890ff', Project: '#722ed1', WorkItem: '#fa8c16', Transaction: '#52c41a',
  Document: '#13c2c2', Event: '#eb2f96', Communication: '#2f54eb', Asset: '#faad14',
};

// Icônes SVG vectorielles (style ligne) par type — contenu interne d'un viewBox 24x24,
// tracé avec la couleur du type. Aucune dépendance, aucun emoji.
const ICON_PATHS: Record<string, string> = {
  organization: '<path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5M8.5 11h.01M11.99 11h.01M15.5 11h.01"/>',
  person: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
  folder: '<path d="M3 7a1 1 0 0 1 1-1h4.5l2 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  task: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12.5l2.8 2.8L16 9"/>',
  ticket: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5a2 2 0 0 0 0 7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5a2 2 0 0 0 0-7z"/>',
  invoice: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  quote: '<path d="M6 3h8l4 4v14H6z"/><path d="M9 13h6M9 17h4"/>',
  order: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12.5V21"/>',
  file: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 13h5M10 17h5"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9.5h16M9 3v4M15 3v4"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
};
function iconKey(coreType: string, subtype?: string): string {
  if (coreType === 'Party') return subtype === 'person' ? 'person' : 'organization';
  if (coreType === 'Project') return 'folder';
  if (coreType === 'Asset') return 'folder';
  if (coreType === 'WorkItem') return subtype === 'ticket' ? 'ticket' : 'task';
  if (coreType === 'Transaction') return subtype === 'quote' ? 'quote' : subtype === 'order' ? 'order' : 'invoice';
  if (coreType === 'Document') return 'file';
  if (coreType === 'Event') return 'calendar';
  if (coreType === 'Communication') return 'email';
  return 'file';
}

@Component({
  selector: 'radar-graph',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzSelectModule, NzInputModule, NzTagModule, NzIconModule,
    NzEmptyModule, NzSpinModule, NzDrawerModule, NzToolTipModule,
  ],
  template: `
  <div class="graph-wrap">
    <div class="toolbar">
      <div class="summary" *ngIf="summary">
        <span class="chip"><b>{{ summary.entities }}</b> entités</span>
        <span class="chip"><b>{{ summary.relations }}</b> relations</span>
        <span class="chip type" *ngFor="let t of summary.byType.slice(0, 7)"
              (click)="setCoreType(t.coreType)" nz-tooltip [nzTooltipTitle]="labels.typeLabel(t.coreType, t.subtype)">
          <i [style.background]="colorOf(t.coreType)"></i>{{ labels.typeLabel(t.coreType, t.subtype) }} · {{ t.count }}
        </span>
      </div>
      <div class="filters">
        <nz-select [(ngModel)]="coreType" (ngModelChange)="reload()" nzAllowClear nzPlaceHolder="Type" class="sel" nzSize="small">
          <nz-option *ngFor="let c of coreTypeKeys" [nzValue]="c" [nzLabel]="labels.coreLabel(c)"></nz-option>
        </nz-select>
        <nz-select [(ngModel)]="role" (ngModelChange)="reload()" nzAllowClear nzPlaceHolder="Rôle" class="sel" nzSize="small">
          <nz-option *ngFor="let r of roles" [nzValue]="r" [nzLabel]="labels.roleLabel(r)"></nz-option>
        </nz-select>
        <input nz-input [(ngModel)]="q" (keyup.enter)="reload()" placeholder="Rechercher…" class="search" nzSize="small" />
        <button nz-button nzSize="small" (click)="reload()"><span nz-icon nzType="reload"></span></button>
      </div>
    </div>

    <!-- Bandeau de focus -->
    <div class="focus-bar" *ngIf="focus">
      <span nz-icon nzType="aim"></span>
      <b>{{ focus.label }}</b>
      <span class="fsub">{{ labels.typeLabel(focus.coreType, focus.subtype) }} · {{ focusDegree1 }} lien(s)</span>
      <span class="fowner" *ngIf="ownerOf(focus) as o">· rattaché à <b>{{ o }}</b></span>
      <button nz-button nzSize="small" nzType="primary" (click)="openInfo()"><span nz-icon nzType="info-circle"></span> Infos</button>
      <button nz-button nzSize="small" (click)="resetView()"><span nz-icon nzType="fullscreen-exit"></span> Tout afficher</button>
    </div>

    <div class="canvas-host">
      <nz-spin *ngIf="loading" nzSimple class="spin"></nz-spin>
      <nz-empty *ngIf="!loading && empty" class="empty"
                nzNotFoundContent="Aucune entité dans le graphe. Connecte un logiciel et lance une synchronisation."></nz-empty>
      <div #cy class="cy" [class.hidden]="empty"></div>
      <div class="hint" *ngIf="!empty && !focus">Clic = centrer sur l'élément · double-clic = détails</div>
    </div>
  </div>

  <nz-drawer [nzVisible]="!!selected" [nzWidth]="380" nzTitle="Entité" (nzOnClose)="selected = null" [nzMaskClosable]="true">
    <ng-container *nzDrawerContent>
      <div class="detail" *ngIf="selected">
        <span class="d-type" [style.background]="colorOf(selected.coreType)">{{ labels.coreLabel(selected.coreType) }}<ng-container *ngIf="selected.subtype"> · {{ labels.subtypeLabel(selected.coreType, selected.subtype) }}</ng-container></span>
        <h3>{{ selected.label }}</h3>
        <div class="d-owner" *ngIf="ownerOf(selected) as o"><span nz-icon nzType="link"></span> Rattaché à <b>{{ o }}</b></div>
        <div class="d-roles" *ngIf="selected.roles?.length"><nz-tag *ngFor="let r of selected.roles" nzColor="blue">{{ labels.roleLabel(r) }}</nz-tag></div>
        <div class="d-key"><code>{{ selected.canonicalKey }}</code></div>
        <h4>Attributs</h4>
        <table class="attrs" *ngIf="attrEntries(selected).length; else noAttr">
          <tr *ngFor="let a of attrEntries(selected)"><td class="k">{{ a[0] }}</td><td class="v">{{ a[1] }}</td></tr>
        </table>
        <ng-template #noAttr><span class="muted">Aucun attribut.</span></ng-template>
      </div>
    </ng-container>
  </nz-drawer>
  `,
  styles: [`
    .graph-wrap { display: flex; flex-direction: column; height: calc(100vh - 230px); min-height: 480px; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .summary { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .chip { font-size: 12px; background: #f5f5f5; border-radius: 12px; padding: 2px 10px; color: #444; }
    .chip.type { border: 1px solid #eee; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
    .chip.type i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .filters { display: flex; gap: 6px; align-items: center; } .sel { min-width: 120px; } .search { width: 160px; }
    .focus-bar { display: flex; align-items: center; gap: 8px; background: #fff0f6; border: 1px solid #ffadd2; border-radius: 8px; padding: 6px 12px; margin-bottom: 8px; font-size: 13px; }
    .focus-bar .fsub { color: #999; } .focus-bar .fowner { color: #666; } .focus-bar .fowner b { color: #1890ff; }
    .focus-bar button { margin-left: 4px; } .focus-bar > button:nth-of-type(1) { margin-left: auto; }
    .d-owner { margin: 4px 0 8px; color: #555; font-size: 13px; } .d-owner b { color: #1890ff; }
    .canvas-host { position: relative; flex: 1; border: 1px solid #f0f0f0; border-radius: 8px; background: #fafbfc; overflow: hidden; }
    .cy { width: 100%; height: 100%; } .cy.hidden { display: none; }
    .spin, .empty { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 2; }
    .hint { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,.55); color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 10px; pointer-events: none; }
    .detail h3 { margin: 10px 0 6px; } .d-type { color: #fff; border-radius: 6px; padding: 2px 8px; font-size: 12px; text-transform: capitalize; }
    .d-roles { margin: 6px 0; } .d-key { margin: 4px 0 12px; } .d-key code { font-size: 11px; color: #888; word-break: break-all; }
    .detail h4 { margin: 14px 0 6px; font-size: 13px; color: #555; }
    table.attrs { width: 100%; border-collapse: collapse; font-size: 12px; }
    table.attrs td { padding: 3px 6px; border-bottom: 1px solid #f5f5f5; vertical-align: top; }
    table.attrs td.k { color: #888; width: 40%; } table.attrs td.v { color: #222; word-break: break-word; } .muted { color: #aaa; font-size: 12px; }
  `],
})
export class RadarGraphComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cy', { static: false }) cyRef!: ElementRef<HTMLDivElement>;
  private cy: any = null;

  loading = false;
  empty = true;
  summary: RadarGraphSummary | null = null;
  selected: RadarGraphEntity | null = null;
  focus: RadarGraphEntity | null = null;
  focusDegree1 = 0;

  coreType: string | null = null;
  role: string | null = null;
  q = '';
  coreTypeKeys: string[] = [];
  roles: string[] = [];
  private viewReady = false;
  private savedPos: Record<string, { x: number; y: number }> = {};
  private savedViewport: { pan: any; zoom: number } | null = null;

  constructor(private radar: RadarBackendService, private acl: AccessControlService, public labels: RadarLabelsService) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initCy();
    this.labels.load().then(() => {
      const o = this.labels.ontology;
      if (o) { this.coreTypeKeys = o.coreTypes.map(c => c.coreType); this.roles = o.roles; }
    });
    this.reload();
  }

  ngOnDestroy(): void { try { this.cy?.destroy(); } catch {} }

  private wsId(): string | null { return this.acl.currentWorkspaceId(); }
  colorOf(coreType: string): string { return CORE_COLORS[coreType] || '#8c8c8c'; }
  setCoreType(c: string): void { this.coreType = c; this.reload(); }
  attrEntries(e: RadarGraphEntity): [string, any][] { return Object.entries(e.attributes || {}).slice(0, 30); }
  openInfo(): void { this.selected = this.focus; }

  private initCy(): void {
    if (this.cy || !this.cyRef) return;
    this.cy = cytoscape({
      container: this.cyRef.nativeElement,
      minZoom: 0.15, maxZoom: 3, wheelSensitivity: 0.25,
      textureOnViewport: false, motionBlur: false, pixelRatio: 'auto',  // rendu net (pas de cache flou)
      style: [
        { selector: 'node', style: {
          'shape': 'ellipse', 'background-color': '#ffffff',
          'background-image': 'data(iconUrl)', 'background-width': '58%', 'background-height': '58%', 'background-clip': 'none',
          'border-width': 3, 'border-color': 'data(color)',
          'width': 46, 'height': 46,
          'label': 'data(label)', 'color': '#595959', 'font-size': '10px', 'font-weight': 500,
          'text-valign': 'bottom', 'text-margin-y': 5, 'text-wrap': 'wrap', 'text-max-width': '150px',
          'line-height': 1.4, 'text-outline-width': 3, 'text-outline-color': '#fafbfc', 'min-zoomed-font-size': 7,
        } },
        { selector: 'node.center', style: {
          'width': 70, 'height': 70, 'border-width': 5, 'border-color': '#e61982',
          'font-size': '15px', 'font-weight': 700, 'z-index': 20, 'background-width': '60%', 'background-height': '60%',
        } },
        { selector: 'edge', style: {
          'width': 2, 'line-color': '#d0d0d0', 'target-arrow-color': '#c0c0c0', 'target-arrow-shape': 'triangle',
          'arrow-scale': 1.1, 'curve-style': 'bezier', 'label': 'data(rel)', 'font-size': '10px', 'color': '#8c8c8c',
          'text-rotation': 'autorotate', 'text-background-color': '#fafbfc', 'text-background-opacity': 1,
          'text-background-padding': '2px', 'min-zoomed-font-size': 8,
        } },
        { selector: '.sub', style: { 'opacity': 0.45 } },           // 2e degré atténué
        { selector: '.gone', style: { 'display': 'none' } },        // masqué en focus
      ],
    });
    this.cy.on('tap', 'node', (ev: any) => {
      const e = ev.target.data('entity') as RadarGraphEntity;
      if (e) this.focusOn(ev.target);
    });
    // double-clic → ouvrir la drawer de détails
    this.cy.on('dbltap', 'node', (ev: any) => {
      const e = ev.target.data('entity') as RadarGraphEntity;
      if (e) { this.focus = e; this.selected = e; }
    });
    this.cy.on('tap', (ev: any) => { if (ev.target === this.cy) this.resetView(); });
  }

  private svgIcon(coreType: string, subtype: string | undefined, color: string): string {
    const inner = ICON_PATHS[iconKey(coreType, subtype)] || ICON_PATHS['file'];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  reload(): void {
    const ws = this.wsId(); if (!ws) return;
    this.loading = true; this.focus = null;
    this.radar.getGraphSummary(ws).subscribe({ next: s => this.summary = s, error: () => {} });
    this.radar.getGraph(ws, { coreType: this.coreType || undefined, role: this.role || undefined, q: this.q || undefined, limit: 400 })
      .subscribe({
        next: (data: RadarGraphData) => { this.render(data); this.loading = false; },
        error: () => { this.loading = false; this.empty = true; },
      });
  }

  private render(data: RadarGraphData): void {
    if (!this.cy) this.initCy();
    this.empty = !data.entities.length;
    const ids = new Set(data.entities.map(e => e.canonicalKey));

    // À qui appartient chaque élément : 1re Party reliée (client de préférence).
    const partyLabel = new Map<string, string>();
    for (const e of data.entities) if (e.coreType === 'Party') partyLabel.set(e.canonicalKey, e.label);
    this.ownerMap = {};
    for (const r of data.relations) {
      if (partyLabel.has(r.to) && !partyLabel.has(r.from) && !this.ownerMap[r.from]) {
        this.ownerMap[r.from] = partyLabel.get(r.to)!;
      }
    }

    const trunc = (s: string) => (s.length > 26 ? s.slice(0, 25) + '…' : s);
    const elements = [
      ...data.entities.map(e => ({ data: {
        id: e.canonicalKey,
        name: e.label || e.canonicalKey,
        label: `${trunc(e.label || e.canonicalKey)}\n${this.labels.typeLabel(e.coreType, e.subtype)}`,
        color: this.colorOf(e.coreType),
        iconUrl: this.svgIcon(e.coreType, e.subtype, this.colorOf(e.coreType)), entity: e,
      } })),
      ...data.relations.filter(r => ids.has(r.from) && ids.has(r.to)).map(r => ({ data: {
        id: `${r.from}__${r.to}__${r.type}__${r.role || ''}`, source: r.from, target: r.to,
        rel: r.role ? `${this.labels.relationLabel(r.type)} (${this.labels.roleLabel(r.role)})` : this.labels.relationLabel(r.type),
      } })),
    ];
    this.cy.elements().remove();
    this.cy.add(elements);
    if (!this.empty) this.runLayout(this.cy.elements());
  }
  ownerMap: Record<string, string> = {};
  ownerOf(e: RadarGraphEntity | null): string | null { return e ? (this.ownerMap[e.canonicalKey] || null) : null; }

  private runLayout(eles: any): void {
    const lay = eles.layout({
      name: 'cose', animate: false, padding: 40, randomize: true,
      nodeRepulsion: 20000, idealEdgeLength: 150, edgeElasticity: 120,
      nodeOverlap: 36, gravity: 0.25, componentSpacing: 140, fit: true,
      nestingFactor: 1.1, numIter: 1200,
    });
    lay.run();
    // mémorise les positions de la vue d'ensemble (pour y revenir sans re-mélanger)
    this.savedPos = {};
    this.cy.nodes().forEach((n: any) => { this.savedPos[n.id()] = { ...n.position() }; });
  }

  // Centre sur un nœud : on MASQUE le reste (le fond ne pollue plus), voisinage
  // direct net, 2e degré (sous-liens) atténué.
  private focusOn(node: any): void {
    // mémorise la vue (position + zoom) lors du passage vue d'ensemble → focus
    if (!this.focus) this.savedViewport = { pan: { ...this.cy.pan() }, zoom: this.cy.zoom() };
    this.focus = node.data('entity');
    const d1 = node.closedNeighborhood();           // nœud + voisins directs + arêtes
    const d2 = d1.closedNeighborhood();              // + 2e degré (sous-liens)
    this.focusDegree1 = d1.nodes().length - 1;
    this.cy.batch(() => {
      this.cy.elements().addClass('gone').removeClass('center sub');
      d2.removeClass('gone').addClass('sub');        // 2e degré visible mais atténué
      d1.removeClass('gone sub');                    // 1er degré net
      node.addClass('center');
    });
    // concentric : le nœud au centre, voisins en anneaux
    d2.layout({
      name: 'concentric', fit: true, padding: 60, animate: true, animationDuration: 350,
      concentric: (n: any) => (n.id() === node.id() ? 3 : (d1.contains(n) ? 2 : 1)),
      levelWidth: () => 1, minNodeSpacing: 50,
    }).run();
  }

  resetView(): void {
    this.focus = null; this.selected = null;
    if (!this.cy) return;
    this.cy.elements().removeClass('gone sub center');
    // revient aux positions mémorisées (pas de re-mélange) plutôt que relayout
    const keys = Object.keys(this.savedPos);
    if (keys.length) {
      this.cy.nodes().forEach((n: any) => { const p = this.savedPos[n.id()]; if (p) n.position(p); });
      // restaure exactement la vue qu'on avait (pan + zoom), pas un fit
      if (this.savedViewport) this.cy.animate({ pan: this.savedViewport.pan, zoom: this.savedViewport.zoom, duration: 300 });
      else this.cy.animate({ fit: { eles: this.cy.elements(), padding: 40 }, duration: 300 });
    } else {
      this.runLayout(this.cy.elements());
    }
  }
}
