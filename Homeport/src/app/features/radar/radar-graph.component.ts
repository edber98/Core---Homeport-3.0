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
import { RadarBackendService, RadarGraphData, RadarGraphEntity, RadarGraphSummary, EntityDetail } from '../../services/radar-backend.service';
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
        <button nz-button nzSize="small" [nzType]="cfgOpen ? 'primary' : 'default'" (click)="cfgOpen=!cfgOpen"><span nz-icon nzType="filter"></span> Affichage</button>
      </div>
    </div>

    <!-- Panneau de CONFIGURATION d'affichage : masquer des types, filtrer les niveaux de lien -->
    <div class="cfgbar" *ngIf="cfgOpen && summary">
      <span class="cfglbl">Afficher :</span>
      <span class="cfgchip" *ngFor="let t of coreTypeChips()" [class.off]="hiddenTypes.has(t.coreType)" (click)="toggleType(t.coreType)">
        <i [style.background]="colorOf(t.coreType)"></i>{{ labels.coreLabel(t.coreType) }} ({{ t.count }})
        <span nz-icon [nzType]="hiddenTypes.has(t.coreType) ? 'eye-invisible' : 'eye'"></span>
      </span>
      <span class="cfgsep"></span>
      <span class="cfglbl">Liens :</span>
      <span class="cfgchip lvl" [class.off]="maxLevel<3" (click)="setMaxLevel(3)">Tous</span>
      <span class="cfgchip lvl" [class.off]="maxLevel!==2" (click)="setMaxLevel(2)">Directs + indirects</span>
      <span class="cfgchip lvl" [class.off]="maxLevel!==1" (click)="setMaxLevel(1)">Directs (N1) seulement</span>
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
      <div class="hint" *ngIf="!empty && !focus">Clic = centrer · appui long ou double-clic = détails complets</div>
    </div>
  </div>

  <nz-drawer [nzVisible]="!!selected" [nzWidth]="420" nzTitle="Détail de l'élément" (nzOnClose)="selected = null; selectedStats = null; detail = null" [nzMaskClosable]="true">
    <ng-container *nzDrawerContent>
      <div class="detail" *ngIf="selected">
        <span class="d-type" [style.background]="colorOf(selected.coreType)">{{ labels.coreLabel(selected.coreType) }}<ng-container *ngIf="selected.subtype"> · {{ labels.subtypeLabel(selected.coreType, selected.subtype) }}</ng-container></span>
        <h3>{{ selected.label }}</h3>

        <!-- Synthèse : statut, sentiment, ce que le cerveau a analysé, connexions -->
        <div class="d-badges">
          <nz-tag *ngIf="statusOf(selected) as st" [nzColor]="st.tone">{{ st.label }}</nz-tag>
          <nz-tag *ngIf="sentimentOf(selected) as se" [nzColor]="se.tone">{{ se.label }}</nz-tag>
        </div>
        <div class="d-owner" *ngIf="ownerOf(selected) as o"><span nz-icon nzType="link"></span> Rattaché à <b>{{ o }}</b></div>
        <div class="d-roles" *ngIf="selected.roles?.length"><nz-tag *ngFor="let r of selected.roles" nzColor="blue">{{ labels.roleLabel(r) }}</nz-tag></div>

        <div class="d-analysis" *ngIf="analysisFlags(selected).length">
          <span class="al">Analysé par le cerveau :</span>
          <nz-tag *ngFor="let f of analysisFlags(selected)" nzColor="purple"><span nz-icon nzType="check"></span> {{ f }}</nz-tag>
        </div>
        <div class="d-stats" *ngIf="selectedStats">
          <div class="ds-num"><b>{{ selectedStats.relations }}</b> connexion(s)</div>
          <div class="ds-nb"><span *ngFor="let nb of selectedStats.neighbors" class="nbchip">{{ nb.n }} {{ nb.type }}</span></div>
        </div>

        <div class="d-key"><code>{{ selected.canonicalKey }}</code></div>
        <h4>Attributs</h4>
        <table class="attrs" *ngIf="attrEntries(selected).length; else noAttr">
          <tr *ngFor="let a of attrEntries(selected)"><td class="k">{{ a[0] }}</td><td class="v">{{ a[1] }}</td></tr>
        </table>
        <ng-template #noAttr><span class="muted">Aucun attribut.</span></ng-template>

        <!-- Viewer complet : origine, dates, toutes les relations résolues -->
        <ng-container *ngIf="detail as d">
          <h4>Origine & dates</h4>
          <div class="d-meta">
            <div *ngIf="d.sources?.length"><span class="mk">Source :</span> {{ d.sources[0].providerKey }}</div>
            <div *ngIf="d.firstSeenAt"><span class="mk">Vu le :</span> {{ d.firstSeenAt | date:'dd/MM/yyyy' }}</div>
            <div *ngIf="d.lastSeenAt"><span class="mk">Maj :</span> {{ d.lastSeenAt | date:'dd/MM/yyyy' }}</div>
          </div>
          <h4>Relations ({{ d.relationCount }})</h4>
          <div class="rels" *ngIf="d.relations?.length; else noRel">
            <div class="relrow" *ngFor="let r of d.relations" (click)="openByKey(r.target.key)">
              <span class="reldir" [class.out]="r.direction==='out'">{{ r.direction==='out' ? '→' : '←' }}</span>
              <span class="reltype">{{ labels.relationLabel(r.type) }}<span *ngIf="r.role"> · {{ r.role }}</span></span>
              <span class="reltarget">{{ r.target.label }}</span>
            </div>
          </div>
          <ng-template #noRel><span class="muted">Aucune relation.</span></ng-template>
        </ng-container>
        <div class="muted" *ngIf="detailLoading"><span nz-icon nzType="loading"></span> chargement du détail…</div>
      </div>
    </ng-container>
  </nz-drawer>
  `,
  styles: [`
    .graph-wrap { display: flex; flex-direction: column; height: calc(100vh - 230px); min-height: 480px; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .summary { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .chip { font-size: 12px; background: #f5f5f5; border-radius: 12px; padding: 2px 10px; color: #444; }
    .cfgbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 10px; margin-bottom: 8px; background: #faf7fb; border: 1px solid #f0e6f0; border-radius: 10px; }
    .cfglbl { font-size: 12px; color: #888; }
    .cfgchip { font-size: 12px; background: #fff; border: 1px solid #e8e8e8; border-radius: 12px; padding: 2px 9px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
    .cfgchip i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .cfgchip.off { opacity: 0.4; text-decoration: line-through; }
    .cfgchip.lvl.off { opacity: 0.45; }
    .cfgchip.lvl:not(.off) { background: #e61982; color: #fff; border-color: #e61982; }
    .cfgsep { width: 1px; height: 18px; background: #e0d0e0; margin: 0 4px; }
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
    .d-badges { margin: 10px 0 6px; display: flex; gap: 6px; flex-wrap: wrap; }
    .d-analysis { margin: 10px 0; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .d-analysis .al { font-size: 12px; color: #888; }
    .d-stats { margin: 8px 0; padding: 8px 10px; background: #faf8fb; border-radius: 8px; }
    .ds-num { font-size: 13px; color: #444; } .ds-num b { color: #e61982; font-size: 16px; }
    .ds-nb { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
    .nbchip { font-size: 11px; background: #eef; border-radius: 10px; padding: 1px 8px; color: #557; }
    .d-meta { font-size: 12px; color: #555; display: flex; flex-direction: column; gap: 3px; }
    .d-meta .mk { color: #999; margin-right: 4px; }
    .rels { display: flex; flex-direction: column; gap: 3px; max-height: 320px; overflow: auto; }
    .relrow { display: grid; grid-template-columns: 18px 1fr 1.2fr; gap: 6px; align-items: center; font-size: 12px; padding: 4px 6px; border-radius: 6px; cursor: pointer; }
    .relrow:hover { background: #faf0f6; }
    .reldir { color: #bbb; font-weight: 700; text-align: center; } .reldir.out { color: #e61982; }
    .reltype { color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .reltarget { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dict { display: flex; flex-direction: column; gap: 10px; }
    .dsearchrow { display: flex; gap: 6px; } .dsearchrow input { flex: 1; }
    .dtypes { display: flex; flex-wrap: wrap; gap: 5px; }
    .tchip { font-size: 11px; background: #f3f3f3; border-radius: 12px; padding: 2px 9px; cursor: pointer; }
    .tchip.on { background: #e61982; color: #fff; }
    .dlist { display: flex; flex-direction: column; max-height: 60vh; overflow: auto; }
    .ditem { display: grid; grid-template-columns: 12px 1fr auto auto; gap: 8px; align-items: center; padding: 7px 6px; border-bottom: 1px solid #f4f4f4; cursor: pointer; font-size: 13px; }
    .ditem:hover { background: #faf0f6; }
    .dot { width: 9px; height: 9px; border-radius: 50%; }
    .dlabel { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dmeta { color: #aaa; font-size: 11px; }
    .dpage { display: flex; gap: 10px; align-items: center; justify-content: center; font-size: 12px; color: #666; }
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
  selectedStats: { relations: number; neighbors: { type: string; n: number }[] } | null = null;
  detail: EntityDetail | null = null; detailLoading = false;
  cfgOpen = false; hiddenTypes = new Set<string>(); maxLevel = 3;
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
        { selector: '.cfg-off', style: { 'display': 'none' } },     // masqué par la config d'affichage
        { selector: '.sub', style: { 'opacity': 0.45 } },           // 2e degré atténué
        { selector: '.gone', style: { 'display': 'none' } },        // masqué en focus
      ],
    });
    // simple clic → focus : met en avant les liens/enfants de l'élément (comportement habituel)
    this.cy.on('tap', 'node', (ev: any) => {
      const e = ev.target.data('entity') as RadarGraphEntity;
      if (e) this.focusOn(ev.target);
    });
    // APPUI LONG (rester appuyé) → ouvre le panneau de détail
    this.cy.on('taphold', 'node', (ev: any) => {
      const e = ev.target.data('entity') as RadarGraphEntity;
      if (e) this.openDetail(ev.target, e);
    });
    // double-clic → ouvre aussi le détail (raccourci alternatif)
    this.cy.on('dbltap', 'node', (ev: any) => {
      const e = ev.target.data('entity') as RadarGraphEntity;
      if (e) this.openDetail(ev.target, e);
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
    this.radar.getGraph(ws, { coreType: this.coreType || undefined, role: this.role || undefined, q: this.q || undefined, limit: 1200 })
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
        id: `${r.from}__${r.to}__${r.type}__${r.role || ''}`, source: r.from, target: r.to, rtype: r.type, rlevel: this.relLevel(r.type, r.role),
        rel: r.role ? `${this.labels.relationLabel(r.type)} (${this.labels.roleLabel(r.role)})` : this.labels.relationLabel(r.type),
      } })),
    ];
    this.cy.elements().remove();
    this.cy.add(elements);
    if (!this.empty) this.runLayout(this.cy.elements());
    this.applyVisibility();   // ré-applique la config d'affichage (types masqués / niveaux)
  }
  ownerMap: Record<string, string> = {};
  ownerOf(e: RadarGraphEntity | null): string | null { return e ? (this.ownerMap[e.canonicalKey] || null) : null; }

  // Niveau d'un lien (1 direct · 2 indirect · 3 contextuel) — miroir du backend.
  relLevel(type: string, role?: string): number {
    const W: Record<string, number> = { party_of: 1, billed_to: 1, derived_from: 1, pays: 1, documents: 1, line_item: 1, assigned_to: 1, references: 2, produces: 2, addressed_by: 2, scheduled_for: 2, part_of: 2, relates_to: 3 };
    let lvl = W[type] || 2;
    if (role && /\b(cc|bcc|copie|observ|mention|témoin)\b/i.test(role)) lvl = Math.min(3, lvl + 1);
    return lvl;
  }
  // Chips de type UNIQUES par coreType (byType est par coreType+subtype → on agrège,
  // sinon « Ressources » apparaît plusieurs fois : Asset.folder, Asset.product…).
  coreTypeChips(): { coreType: string; count: number }[] {
    const map = new Map<string, number>();
    for (const t of (this.summary?.byType || [])) map.set(t.coreType, (map.get(t.coreType) || 0) + (t.count || 0));
    return [...map.entries()].map(([coreType, count]) => ({ coreType, count })).sort((a, b) => b.count - a.count);
  }
  // Config d'affichage : masquer un type d'entité / filtrer les niveaux de lien.
  toggleType(ct: string): void { if (this.hiddenTypes.has(ct)) this.hiddenTypes.delete(ct); else this.hiddenTypes.add(ct); this.applyVisibility(); }
  setMaxLevel(n: number): void { this.maxLevel = n; this.applyVisibility(); }
  applyVisibility(): void {
    if (!this.cy) return;
    this.cy.nodes().forEach((n: any) => {
      const ct = n.data('entity')?.coreType;
      if (ct && this.hiddenTypes.has(ct)) n.addClass('cfg-off'); else n.removeClass('cfg-off');
    });
    this.cy.edges().forEach((e: any) => {
      const tooWeak = (e.data('rlevel') || 2) > this.maxLevel;
      const endHidden = e.source().hasClass('cfg-off') || e.target().hasClass('cfg-off');
      if (tooWeak || endHidden) e.addClass('cfg-off'); else e.removeClass('cfg-off');
    });
  }

  // Charge le viewer complet d'un élément par sa clé (depuis une relation cliquée).
  openByKey(key: string): void {
    const ws = this.wsId(); if (!ws || !key) return;
    this.detail = null; this.detailLoading = true;
    this.radar.entityDetail(ws, key).subscribe({
      next: r => { if (r.entity) { this.selected = { canonicalKey: r.entity.key, label: r.entity.label, coreType: r.entity.coreType, subtype: r.entity.subtype, roles: r.entity.roles, attributes: r.entity.attributes } as any; this.detail = r.entity; this.selectedStats = null; } this.detailLoading = false; },
      error: () => { this.detailLoading = false; },
    });
  }

  // Ouvre le détail d'un nœud + calcule ses stats de connexions depuis le graphe + charge le viewer complet.
  openDetail(node: any, e: RadarGraphEntity): void {
    this.focus = e; this.selected = e;
    this.detail = null; this.detailLoading = true;
    const ws = this.wsId();
    if (ws) this.radar.entityDetail(ws, e.canonicalKey).subscribe({
      next: r => { this.detail = r.entity; this.detailLoading = false; },
      error: () => { this.detailLoading = false; },
    });
    try {
      const byType: Record<string, number> = {};
      node.connectedEdges().connectedNodes().forEach((n: any) => {
        if (n.id() === node.id()) return;
        const ne = n.data('entity') as RadarGraphEntity;
        const t = ne ? this.labels.coreLabel(ne.coreType) : '?';
        byType[t] = (byType[t] || 0) + 1;
      });
      this.selectedStats = { relations: node.degree(false), neighbors: Object.entries(byType).map(([type, n]) => ({ type, n })).sort((a, b) => b.n - a.n) };
    } catch { this.selectedStats = null; }
  }

  // Statut « lisible » de l'entité (état/paiement/avancement) → badge dans le détail.
  statusOf(e: RadarGraphEntity | null): { label: string; tone: string } | null {
    if (!e) return null; const a: any = e.attributes || {};
    const v = a.payment_state || a.state || a.statut;
    if (v) {
      const neg = /impay|retard|refus|annul|brouillon|bloqu|perdu/i.test(String(v));
      const pos = /pay|sign|livr|fermé|terminé|résolu|validé/i.test(String(v));
      return { label: String(v), tone: neg ? 'red' : (pos ? 'green' : 'blue') };
    }
    if (a.progress != null) return { label: `Avancement ${a.progress}%`, tone: Number(a.progress) >= 100 ? 'green' : 'blue' };
    return null;
  }
  // Sentiment (emails) → badge.
  sentimentOf(e: RadarGraphEntity | null): { label: string; tone: string } | null {
    const s = e?.attributes?.['sentiment']; if (!s) return null;
    return { label: s === 'négatif' ? '😞 Négatif' : (s === 'positif' ? '😊 Positif' : '😐 Neutre'), tone: s === 'négatif' ? 'red' : (s === 'positif' ? 'green' : 'default') };
  }
  // Couverture d'analyse : ce que le cerveau a déjà déterminé sur ce nœud.
  analysisFlags(e: RadarGraphEntity | null): string[] {
    if (!e) return []; const a: any = e.attributes || {}; const f: string[] = [];
    if (e.subtype) f.push('typé');
    if (a.segmentLabel || a.segment || a.kind) f.push('catégorisé');
    if (a.docAnalyzed) f.push('document analysé');
    if (a.sentiment) f.push('sentiment');
    if (a.docType) f.push('relié à une pièce');
    return f;
  }

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
