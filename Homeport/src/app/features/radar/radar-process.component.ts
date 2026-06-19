import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Vflow, Edge, Node } from 'ngx-vflow';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { AccessControlService } from '../../services/access-control.service';
import { RadarBackendService, RadarProcess, RadarCrossProcess, RadarSalesProcess } from '../../services/radar-backend.service';
import { RadarLabelsService } from './radar-labels.service';

// Onglet « Processus » — process mining (style Celonis). Découvre les processus
// métier (ex. Facture : brouillon → émise → payée) depuis les cycles de vie des
// entités, montre le graphe des enchaînements (DFG), les variantes et les durées.

@Component({
  selector: 'radar-process',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Vflow,
    NzSelectModule, NzTableModule, NzTagModule, NzEmptyModule, NzSpinModule,
    NzIconModule, NzButtonModule, NzProgressModule, NzSegmentedModule,
  ],
  template: `
  <div class="proc-wrap">
    <nz-segmented [nzOptions]="modes" [(ngModel)]="modeIndex" (ngModelChange)="onMode($event)" class="modeseg"></nz-segmented>

    <!-- UN SEUL vflow, TOUJOURS monté (hors des *ngIf de mode) → plus de rendu vide.
         Le template s'adapte au type de nœud (cycle de vie / cross / vente). -->
    <div class="dfg" *ngIf="activeNodes.length">
      <vflow view="auto" background="dots" [minZoom]="0.05" [maxZoom]="2" [nodes]="activeNodes" [edges]="activeEdges">
        <ng-template let-ctx nodeHtml>
          <ng-container [ngSwitch]="ctx.node.data.kind">
            <div *ngSwitchCase="'state'" class="snode" [class.dev]="!ctx.node.data.main">
              <handle type="target" position="left" id="in" /><handle type="source" position="right" id="out" />
              <div class="sname">{{ ctx.node.data.state }}</div>
              <div class="scount">{{ ctx.node.data.count }} cas</div>
            </div>
            <div *ngSwitchDefault class="xnode" [style.borderColor]="ctx.node.data.color"
                 [class.drill]="ctx.node.data.drill" (click)="onCrossDrill(ctx.node.data.activity)">
              <handle type="target" position="left" id="in" /><handle type="source" position="right" id="out" />
              <div class="xsys" [style.background]="ctx.node.data.color">{{ ctx.node.data.system }}</div>
              <div class="xname">{{ ctx.node.data.activity }}</div>
            </div>
          </ng-container>
        </ng-template>
      </vflow>
    </div>

    <!-- ════ CROSS-LOGICIEL (object-centric, par client) ════ -->
    <div *ngIf="modeIndex === 1" class="cross">
      <nz-spin *ngIf="loadingX" nzSimple class="spin"></nz-spin>
      <nz-empty *ngIf="!loadingX && !discovered.length" nzNotFoundContent="Aucun processus détecté pour l'instant."></nz-empty>
      <div *ngIf="discovered.length" class="procsel">
        <span class="lbl">Processus découverts :</span>
        <nz-select [(ngModel)]="selectedProcKey" (ngModelChange)="selectProcess($event)" nzSize="small" style="min-width:280px">
          <nz-option *ngFor="let p of discovered" [nzValue]="p.key" [nzLabel]="p.name + ' · ' + p.cases + ' cas'"></nz-option>
        </nz-select>
      </div>
      <div *ngIf="cross && cross.cases">
        <div class="kpis">
          <span class="kpi"><b>{{ cross.cases }}</b> cas suivis</span>
          <span class="kpi"><b>{{ cross.activities.length }}</b> types d'activité</span>
          <span class="kpi"><b>{{ cross.parallels.length }}</b> co-occurrences</span>
        </div>

        <h4><span nz-icon nzType="partition"></span> Flux global inter-logiciels <small style="color:#999;font-weight:400">(cliquez une étape pour ouvrir son cycle de vie — graphe ci-dessus)</small></h4>

        <h4><span nz-icon nzType="swap"></span> Actions parallèles inter-logiciels</h4>
        <p class="sub">Activités qui surviennent ensemble pour un même client (ex. un devis validé → dossier Nextcloud + projet OpenProject).</p>
        <div class="paras">
          <div class="para" *ngFor="let p of cross.parallels">
            <span class="actchip"><nz-tag nzColor="blue">{{ p.activities[0] }}</nz-tag><small class="sys">{{ sysOf(p.activities[0]) }}</small></span>
            <span nz-icon nzType="swap" class="psign"></span>
            <span class="actchip"><nz-tag nzColor="purple">{{ p.activities[1] }}</nz-tag><small class="sys">{{ sysOf(p.activities[1]) }}</small></span>
            <span class="pcount">{{ p.count }} client(s)</span>
          </div>
        </div>
        <h4>Variantes (chemins réels) <small style="color:#999;font-weight:400">(% des cas · logiciel d'origine sous chaque étape)</small></h4>
        <div class="variants">
          <div class="variant" *ngFor="let v of cross.variants">
            <div class="vbar">
              <nz-progress [nzPercent]="pct(v.count, cross.cases)" nzSize="small" [nzFormat]="fmtPct" [nzStrokeColor]="'#e61982'"></nz-progress>
            </div>
            <div class="vseq">
              <ng-container *ngFor="let s of v.sequence.split(' → '); let last = last">
                <span class="actchip"><nz-tag>{{ s }}</nz-tag><small class="sys">{{ sysOf(s) }}</small></span>
                <span *ngIf="!last" class="varrow">→</span>
              </ng-container>
              <span class="vcount">{{ v.count }} cas</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════ PAR CYCLE DE VIE (par type) ════ -->
    <div *ngIf="modeIndex === 0">
    <div class="toolbar">
      <nz-select [(ngModel)]="selectedKey" (ngModelChange)="onSelect()" class="psel" nzSize="small"
                 nzPlaceHolder="Processus découvert">
        <nz-option *ngFor="let p of processes" [nzValue]="keyOf(p)"
                   [nzLabel]="labels.typeLabel(p.coreType, p.subtype) + ' · ' + p.entityCount + ' cas'"></nz-option>
      </nz-select>
      <button nz-button nzSize="small" (click)="reload()"><span nz-icon nzType="reload"></span></button>
      <span class="hint" *ngIf="!loading && !processes.length">
        Les processus apparaissent dès que des entités changent d'état dans le temps (2+ synchronisations).
      </span>
    </div>

    <nz-spin *ngIf="loading" nzSimple class="spin"></nz-spin>
    <nz-empty *ngIf="!loading && !processes.length"
              nzNotFoundContent="Aucun processus détecté pour l'instant. Le Radar apprend les enchaînements au fil des observations."></nz-empty>

    <div class="proc-body" *ngIf="current as p">
      <div class="kpis">
        <span class="kpi"><b>{{ p.entityCount }}</b> cas observés</span>
        <span class="kpi"><b>{{ p.entitiesWithTransitions }}</b> avec évolution</span>
        <span class="kpi"><b>{{ p.variants.length }}</b> variantes</span>
        <span class="kpi"><b>{{ p.states.length }}</b> états</span>
      </div>

      <!-- (DFG des enchaînements affiché en haut, partagé) -->

      <!-- Explorateur de variantes -->
      <h4>Variantes (chemins réels)</h4>
      <div class="variants">
        <div class="variant" *ngFor="let v of p.variants">
          <div class="vbar">
            <nz-progress [nzPercent]="pct(v.count, p.entityCount)" nzSize="small"
                         [nzFormat]="fmtPct" [nzStrokeColor]="'#e61982'"></nz-progress>
          </div>
          <div class="vseq">
            <ng-container *ngFor="let s of v.sequence.split(' → '); let last = last">
              <nz-tag>{{ s }}</nz-tag><span *ngIf="!last" class="varrow">→</span>
            </ng-container>
            <span class="vcount">{{ v.count }} cas</span>
          </div>
        </div>
      </div>
    </div>
    </div><!-- fin modeIndex===0 -->
  </div>
  `,
  styles: [`
    .proc-wrap { padding-top: 6px; }
    .modeseg { margin-bottom: 14px; }
    .cross h4 { margin: 16px 0 4px; font-size: 14px; } .cross .sub { color: #999; font-size: 12px; margin: 0 0 10px; }
    .paras { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .para { display: flex; align-items: center; gap: 8px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 6px 12px; }
    .para .psign { color: #e61982; } .para .pcount { margin-left: auto; color: #999; font-size: 12px; }
    .actchip { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; }
    .actchip .sys { font-size: 10px; color: #1890ff; }
    .toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .psel { min-width: 260px; } .hint { color: #999; font-size: 12px; }
    .spin { display: block; margin: 40px auto; }
    .kpis { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .kpi { background: #f5f5f5; border-radius: 12px; padding: 3px 12px; font-size: 12px; color: #444; }
    .dfg { height: 440px; border: 1px solid #f0f0f0; border-radius: 8px; background: #fafafa; overflow: hidden; margin-bottom: 16px; }
    .procsel { display:flex; align-items:center; gap:8px; margin-bottom:10px; } .procsel .lbl { font-size:12px; color:#666; }
    /* Nœuds du flux global cross-logiciel (colorés par logiciel d'origine). */
    .xnode { background: #fff; border: 2px solid #6b7280; border-radius: 14px; padding: 0 0 8px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,.08); min-width: 130px; overflow: hidden; cursor: default; }
    .xnode.drill { cursor: pointer; } .xnode.drill:hover { box-shadow: 0 4px 12px rgba(0,0,0,.16); transform: translateY(-1px); }
    .xnode .xsys { color: #fff; font-size: 10px; font-weight: 600; letter-spacing: .3px; padding: 2px 6px; text-transform: uppercase; }
    .xnode .xname { font-weight: 600; color: #222; font-size: 13px; padding: 6px 12px 0; }
    .snode { background: #fff; border: 2px solid #e61982; border-radius: 18px; padding: 8px 14px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,.08); min-width: 90px; }
    .snode.dev { border-color: #d9d9d9; opacity: .8; }   /* états de déviation (hors chemin principal) */
    .sname { font-weight: 600; color: #222; font-size: 13px; }
    .scount { font-size: 11px; color: #999; }
    h4 { margin: 8px 0; font-size: 13px; color: #555; }
    .variants { display: flex; flex-direction: column; gap: 8px; }
    .variant { border: 1px solid #f5f5f5; border-radius: 8px; padding: 8px 10px; }
    .vbar { margin-bottom: 4px; } .vseq { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .varrow { color: #bbb; } .vcount { color: #999; font-size: 12px; margin-left: 8px; }
  `],
})
export class RadarProcessComponent implements OnInit {
  loading = false;
  processes: RadarProcess[] = [];
  selectedKey: string | null = null;
  current: RadarProcess | null = null;
  vNodes: Node[] = [];
  vEdges: Edge[] = [];
  // bascule cycle de vie / cross-logiciel / processus de vente
  // 2 axes : le cycle de vie par TYPE, et les PROCESSUS MÉTIER découverts dynamiquement
  // (commercial, achat, support, production… — rien de fixe, tout émerge des données).
  modes = [{ label: 'Par cycle de vie', value: 0 }, { label: 'Processus métier (découverts)', value: 1 }];
  modeIndex = 0;
  loadingX = false;
  cross: RadarCrossProcess | null = null;
  vNodesX: Node[] = [];
  vEdgesX: Edge[] = [];
  // processus DÉCOUVERTS dynamiquement (commercial, achat, support…)
  discovered: (RadarCrossProcess & { key: string; name: string })[] = [];
  selectedProcKey = '';
  // processus de vente (global + par segment)
  loadingS = false;
  sales: RadarSalesProcess | null = null;
  vNodesS: Node[] = [];
  vEdgesS: Edge[] = [];

  // Le vflow partagé affiche les nœuds/arêtes du mode courant.
  get activeNodes(): Node[] { return this.modeIndex === 0 ? this.vNodes : this.modeIndex === 1 ? this.vNodesX : this.vNodesS; }
  get activeEdges(): Edge[] { return this.modeIndex === 0 ? this.vEdges : this.modeIndex === 1 ? this.vEdgesX : this.vEdgesS; }

  constructor(private radar: RadarBackendService, private acl: AccessControlService, public labels: RadarLabelsService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.labels.load(); this.reload(); }
  private wsId(): string | null { return this.acl.currentWorkspaceId(); }

  onMode(i: number): void {
    if (i === 1 && !this.discovered.length) this.loadCross();
  }

  loadSales(): void {
    const ws = this.wsId(); if (!ws) return;
    this.loadingS = true;
    this.radar.getSalesProcess(ws).subscribe({
      next: s => { this.sales = s; this.loadingS = false; this.buildSalesDfg(s); console.log('[radar][sales] deals=', s?.deals, 'transitions=', s?.transitions?.length, '→ vNodesS=', this.vNodesS.length); this.cdr.markForCheck(); },
      error: () => { this.loadingS = false; this.sales = null; this.vNodesS = []; this.vEdgesS = []; },
    });
  }
  // Couleur d'une étape de vente selon la pièce (devis/commande/facture).
  private stageColor(stage: string): string {
    if (/devis/i.test(stage)) return '#8b5cf6';
    if (/commande/i.test(stage)) return '#1e6fd6';
    if (/facture/i.test(stage)) return '#16a34a';
    return '#6b7280';
  }
  private buildSalesDfg(s: RadarSalesProcess | null): void {
    try {
      const r = s ? this.layeredDfg(s.transitions.map(t => ({ from: t.from, to: t.to, count: t.count })),
        new Map((s.stages || []).map(x => [x.stage, x.count])), (st) => this.stageColor(st),
        new Map((s.transitions || []).map(t => [`${t.from}__${t.to}`, this.dur(t.avgDurationMs)]))) : { nodes: [], edges: [] };
      this.vNodesS = r.nodes; this.vEdgesS = r.edges;
    } catch (e) { console.error('[radar] buildSalesDfg', e); this.vNodesS = []; this.vEdgesS = []; }
  }
  // Builder DFG en couches GÉNÉRIQUE (longest-path), réutilisé par cross + vente.
  private layeredDfg(transitions: { from: string; to: string; count: number }[], freq: Map<string, number>, colorOf: (s: string) => string, durByEdge?: Map<string, string>): { nodes: Node[]; edges: Edge[] } {
    if (!transitions?.length) return { nodes: [], edges: [] };
    const acts = new Set<string>(); for (const t of transitions) { acts.add(t.from); acts.add(t.to); }
    const layer = new Map<string, number>(); acts.forEach(a => layer.set(a, 0));
    for (let it = 0; it < acts.size + 2; it++) {
      let ch = false;
      for (const t of transitions) { const nl = (layer.get(t.from) || 0) + 1; if (nl > (layer.get(t.to) || 0)) { layer.set(t.to, nl); ch = true; } }
      if (!ch) break;
    }
    const byLayer = new Map<number, string[]>();
    acts.forEach(a => { const l = layer.get(a) || 0; const arr = byLayer.get(l) || []; arr.push(a); byLayer.set(l, arr); });
    const COL = 240, ROW = 100; const pos = new Map<string, { x: number; y: number }>();
    for (const [l, arr] of byLayer) { arr.sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0)); arr.forEach((a, i) => pos.set(a, { x: l * COL + 30, y: i * ROW + 30 })); }
    const nodes = [...acts].map(a => ({ id: a, type: 'html-template', point: pos.get(a) || { x: 30, y: 30 }, width: 160, height: 60, data: { kind: 'sales', activity: a, system: 'vente', color: colorOf(a), drill: false } } as Node));
    const edges = transitions.filter(t => t.from !== t.to).map(t => ({
      id: `s__${t.from}__${t.to}`, source: t.from, target: t.to, sourceHandle: 'out', targetHandle: 'in',
      type: 'default', curve: 'bezier', floating: true,
      markers: { end: { type: 'arrow-closed', width: 7, height: 7, color: '#bfbfbf' } },
      edgeLabels: { center: { type: 'default', text: durByEdge?.get(`${t.from}__${t.to}`) ? `${t.count} · ${durByEdge.get(`${t.from}__${t.to}`)}` : `${t.count}`, style: { fill: '#888', fontSize: '11px' } } },
    } as Edge));
    return { nodes, edges };
  }
  sysOf(activity: string): string { return this.cross?.systemByActivity?.[activity] || ''; }
  loadCross(): void {
    const ws = this.wsId(); if (!ws) return;
    this.loadingX = true;
    // Découverte DYNAMIQUE : on récupère TOUS les processus détectés (commercial, achat…)
    this.radar.getDiscoveredProcesses(ws).subscribe({
      next: r => {
        this.discovered = r.processes || [];
        this.loadingX = false;
        if (this.discovered.length) { this.selectedProcKey = this.discovered[0].key; this.selectProcess(this.selectedProcKey); }
        else { this.cross = null; this.vNodesX = []; this.vEdgesX = []; }
        console.log('[radar][discover] processus=', this.discovered.map(p => `${p.name}:${p.cases}cas/${p.transitions.length}tr`));
        this.cdr.markForCheck();
      },
      error: () => { this.loadingX = false; this.discovered = []; this.cross = null; this.vNodesX = []; this.vEdgesX = []; },
    });
  }
  selectProcess(key: string): void {
    const p = this.discovered.find(x => x.key === key); if (!p) return;
    this.selectedProcKey = key; this.cross = p; this.buildCrossDfg(p);
    console.log('[radar][cross] sélection', p.name, '→ vNodesX=', this.vNodesX.length, 'vEdgesX=', this.vEdgesX.length);
    this.cdr.markForCheck();
  }

  // Couleur par logiciel d'origine (cohérente avec le graphe Mémoire).
  private sysColor(system: string): string {
    const s = (system || '').toLowerCase();
    if (s.includes('dolibarr')) return '#1e6fd6';
    if (s.includes('nextcloud')) return '#0a86c4';
    if (s.includes('openproject')) return '#8b5cf6';
    if (s.includes('email') || s.includes('mail')) return '#f59e0b';
    if (s.includes('home')) return '#16a34a';
    if (s.includes('sap')) return '#0ea5e9';
    return '#6b7280';
  }

  // DFG cross-logiciel en COUCHES (longest-path) : les actions parallèles d'un
  // même cas tombent sur la même colonne, le flux global se lit de gauche à droite.
  private buildCrossDfg(cross: RadarCrossProcess | null): void {
    try { this.buildCrossDfgUnsafe(cross); }
    catch (e) { console.error('[radar] buildCrossDfg', e); this.vNodesX = []; this.vEdgesX = []; }
  }
  private buildCrossDfgUnsafe(cross: RadarCrossProcess | null): void {
    if (!cross || !cross.transitions?.length) { this.vNodesX = []; this.vEdgesX = []; return; }
    const acts = new Set<string>();
    for (const t of cross.transitions) { acts.add(t.from); acts.add(t.to); }
    // Adjacence (hors auto-boucles).
    const succ = new Map<string, string[]>(); acts.forEach(a => succ.set(a, []));
    for (const t of cross.transitions) if (t.from !== t.to) succ.get(t.from)!.push(t.to);
    // DFS : ordre topologique + détection des BACK-EDGES (cycles) qu'on exclut du calcul
    // de couches → la profondeur reflète le vrai processus, pas les boucles de données.
    const color = new Map<string, number>(); acts.forEach(a => color.set(a, 0)); // 0 blanc,1 gris,2 noir
    const fwd: [string, string][] = []; const order: string[] = [];
    const stack: string[] = [...acts];
    const visit = (u: string) => {
      const st: [string, number][] = [[u, 0]];
      while (st.length) {
        const top = st[st.length - 1]; const [node, idx] = top;
        if (idx === 0) color.set(node, 1);
        const kids = succ.get(node)!;
        if (idx < kids.length) {
          top[1]++; const v = kids[idx];
          const c = color.get(v)!;
          if (c === 1) continue;                       // back-edge (cycle) → ignoré pour les couches
          fwd.push([node, v]);
          if (c === 0) st.push([v, 0]);
        } else { color.set(node, 2); order.unshift(node); st.pop(); }
      }
    };
    for (const a of stack) if (color.get(a) === 0) visit(a);
    // longest-path sur le DAG (back-edges retirés)
    const layer = new Map<string, number>(); acts.forEach(a => layer.set(a, 0));
    for (const u of order) for (const [a, b] of fwd) if (a === u) layer.set(b, Math.max(layer.get(b)!, layer.get(u)! + 1));
    // Regroupement par couche, espacement LARGE (lecture gauche→droite claire).
    const byLayer = new Map<number, string[]>();
    acts.forEach(a => { const l = layer.get(a) || 0; const arr = byLayer.get(l) || []; arr.push(a); byLayer.set(l, arr); });
    const freq = new Map((cross.activities || []).map(a => [a.activity, a.count]));
    const COL = 250, ROW = 120;
    const maxRows = Math.max(1, ...[...byLayer.values()].map(arr => arr.length));
    const midY = ((maxRows - 1) * ROW) / 2;
    const pos = new Map<string, { x: number; y: number }>();
    for (const [l, arr] of byLayer) {
      arr.sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0));
      const off = midY - ((arr.length - 1) * ROW) / 2 + 30;   // centrage vertical par couche
      arr.forEach((a, i) => pos.set(a, { x: l * COL + 30, y: off + i * ROW }));
    }
    const typeMap = cross.typeByActivity || {};
    this.vNodesX = [...acts].map(a => {
      const system = cross.systemByActivity?.[a] || '';
      return {
        id: a, type: 'html-template', point: pos.get(a) || { x: 30, y: 40 },
        width: 160, height: 60,
        data: { kind: 'cross', activity: a, system, color: this.sysColor(system), drill: !!typeMap[a] },
      } as Node;
    });
    this.vEdgesX = cross.transitions.filter(t => acts.has(t.from) && acts.has(t.to) && t.from !== t.to).map(t => ({
      id: `x__${t.from}__${t.to}`, source: t.from, target: t.to, sourceHandle: 'out', targetHandle: 'in',
      type: 'default', curve: 'bezier', floating: true,
      markers: { end: { type: 'arrow-closed', width: 7, height: 7, color: '#bfbfbf' } },
      edgeLabels: { center: { type: 'default', text: (t as any).avgDurationMs ? `${t.count} · ${this.dur((t as any).avgDurationMs)}` : `${t.count}`, style: { fill: '#888', fontSize: '11px' } } },
    } as Edge));
  }

  // Clic sur une étape du flux global → ouvre son cycle de vie détaillé (mode 0).
  onCrossDrill(activity: string): void {
    const key = this.cross?.typeByActivity?.[activity];
    if (!key) return;
    const proc = this.processes.find(p => this.keyOf(p) === key);
    if (!proc) return;
    this.modeIndex = 0;
    this.selectedKey = key;
    this.onSelect();
  }
  keyOf(p: RadarProcess): string { return `${p.coreType}.${p.subtype || ''}`; }
  pct(n: number, total: number): number { return total ? Math.round((n / total) * 100) : 0; }
  fmtPct = (p: number) => `${p}%`;

  reload(): void {
    const ws = this.wsId(); if (!ws) return;
    this.loading = true;
    this.radar.getProcesses(ws).subscribe({
      next: r => {
        this.processes = r.processes || [];
        this.loading = false;
        if (this.processes.length) {
          const keep = this.processes.find(p => this.keyOf(p) === this.selectedKey);
          this.selectedKey = this.keyOf(keep || this.processes[0]);
          this.onSelect();
        } else { this.current = null; this.vNodes = []; this.vEdges = []; }
      },
      error: () => { this.loading = false; this.processes = []; },
    });
  }

  onSelect(): void {
    this.current = this.processes.find(p => this.keyOf(p) === this.selectedKey) || null;
    if (this.current) this.buildDfg(this.current);
  }

  // DFG : états positionnés selon la variante dominante (chemin gauche→droite).
  private buildDfg(p: RadarProcess): void {
    const mainPath = p.variants[0]?.sequence.split(' → ') || [];
    const mainSet = new Set(mainPath);
    const order: string[] = [...mainPath];
    p.states.forEach(s => { if (!order.includes(s.state)) order.push(s.state); }); // déviations à la suite
    const xOf = new Map(order.map((s, i) => [s, i]));
    const freq = new Map(p.states.map(s => [s.state, s.count]));
    const X = 230, TOP = 60, BOTTOM = 230;
    this.vNodes = order.map(s => ({
      id: s, type: 'html-template',
      point: { x: (xOf.get(s) || 0) * X + 30, y: mainSet.has(s) ? TOP : BOTTOM },
      width: 130, height: 56, data: { kind: 'state', state: s, count: freq.get(s) || 0, main: mainSet.has(s) },
    } as Node));
    const nodeSet = new Set(order);
    this.vEdges = p.transitions.filter(t => nodeSet.has(t.from) && nodeSet.has(t.to)).map(t => ({
      id: `${t.from}__${t.to}`, source: t.from, target: t.to, sourceHandle: 'out', targetHandle: 'in',
      type: 'default', curve: 'bezier', floating: true,
      markers: { end: { type: 'arrow-closed', width: 7, height: 7, color: '#bfbfbf' } },
      edgeLabels: { center: { type: 'default', text: t.avgDurationMs ? `${t.count} · ${this.dur(t.avgDurationMs)}` : `${t.count}`, style: { fill: '#888', fontSize: '11px' } } },
    } as Edge));
  }

  private dur(ms: number): string {
    const d = ms / 86400000;
    if (d >= 1) return `${d.toFixed(d < 10 ? 1 : 0)} j`;
    const h = ms / 3600000;
    if (h >= 1) return `${h.toFixed(0)} h`;
    return `${Math.round(ms / 60000)} min`;
  }
}
