import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AccessControlService } from '../../services/access-control.service';
import { RadarBackendService, DictItem, EntityDetail } from '../../services/radar-backend.service';
import { RadarLabelsService } from './radar-labels.service';

const CORE_COLORS: Record<string, string> = {
  Party: '#1890ff', Project: '#722ed1', WorkItem: '#fa8c16', Transaction: '#52c41a',
  Document: '#13c2c2', Event: '#eb2f96', Communication: '#2f54eb', Asset: '#faad14',
};

// Onglet « Dictionnaire » (I9) — recherche big-data sur TOUTES les entités de la mémoire,
// avec filtres par type ; clic sur un élément → VIEWER complet (attributs, relations
// résolues entrantes/sortantes cliquables, origine, dates, sentiment, analyse).
@Component({
  selector: 'radar-dictionary',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzTagModule, NzDrawerModule, NzEmptyModule, NzToolTipModule],
  template: `
  <div class="dict-wrap">
    <div class="dsearchrow">
      <input nz-input [(ngModel)]="q" (keyup.enter)="search(1)" placeholder="Chercher un client, devis, facture, contact, document…" class="dq" />
      <button nz-button nzType="primary" (click)="search(1)"><span nz-icon nzType="search"></span> Chercher</button>
    </div>
    <div class="dtypes">
      <span class="tchip" [class.on]="!type" (click)="type=null; search(1)">Tout ({{ total }})</span>
      <span class="tchip" *ngFor="let t of byType" [class.on]="type===t.coreType" (click)="type=t.coreType; search(1)">
        <i [style.background]="color(t.coreType)"></i>{{ labels.coreLabel(t.coreType) }} ({{ t.n }})</span>
    </div>

    <div class="dlist" *ngIf="items.length; else noItem">
      <div class="ditem" *ngFor="let it of items" (click)="open(it.key)">
        <span class="dot" [style.background]="color(it.coreType)"></span>
        <span class="dlabel">{{ it.label }}</span>
        <span class="dtype">{{ labels.typeLabel(it.coreType, it.subtype) }}</span>
        <nz-tag *ngFor="let r of it.roles" nzColor="blue">{{ labels.roleLabel(r) }}</nz-tag>
        <span class="dstat" *ngIf="it.status">{{ it.status }}</span>
        <span *ngIf="it.sentiment" class="dsent">{{ sent(it.sentiment) }}</span>
        <span class="dsrc" *ngIf="it.source">{{ it.source }}</span>
      </div>
    </div>
    <ng-template #noItem><nz-empty nzNotFoundContent="Aucun élément — lance une synchronisation."></nz-empty></ng-template>

    <div class="dpage" *ngIf="total > size">
      <button nz-button nzSize="small" [disabled]="page<=1" (click)="search(page-1)">‹ Précédent</button>
      <span>{{ page }} / {{ pages }}  ·  {{ total }} éléments</span>
      <button nz-button nzSize="small" [disabled]="page>=pages" (click)="search(page+1)">Suivant ›</button>
    </div>
  </div>

  <!-- VIEWER complet -->
  <nz-drawer [nzVisible]="!!detail || detailLoading" [nzWidth]="460" nzTitle="Détail de l'élément" (nzOnClose)="detail = null" [nzMaskClosable]="true">
    <ng-container *nzDrawerContent>
      <div class="muted" *ngIf="detailLoading"><span nz-icon nzType="loading"></span> chargement…</div>
      <div class="detail" *ngIf="detail as d">
        <span class="d-type" [style.background]="color(d.coreType)">{{ labels.typeLabel(d.coreType, d.subtype) }}</span>
        <h3>{{ d.label }}</h3>
        <div class="d-badges">
          <nz-tag *ngIf="d.attributes['payment_state'] || d.attributes['state']" nzColor="geekblue">{{ d.attributes['payment_state'] || d.attributes['state'] }}</nz-tag>
          <nz-tag *ngIf="d.analysis.sentiment" [nzColor]="d.analysis.sentiment==='négatif'?'red':(d.analysis.sentiment==='positif'?'green':'default')">{{ sent(d.analysis.sentiment) }} {{ d.analysis.sentiment }}</nz-tag>
        </div>
        <div class="d-roles" *ngIf="d.roles?.length"><nz-tag *ngFor="let r of d.roles" nzColor="blue">{{ labels.roleLabel(r) }}</nz-tag></div>

        <div class="d-flags">
          <nz-tag *ngIf="d.analysis.typed" nzColor="purple">typé</nz-tag>
          <nz-tag *ngIf="d.analysis.categorized" nzColor="purple">catégorisé</nz-tag>
          <nz-tag *ngIf="d.analysis.docAnalyzed" nzColor="purple">document analysé</nz-tag>
          <nz-tag *ngIf="d.analysis.docType" nzColor="purple">relié : {{ d.analysis.docType }}</nz-tag>
        </div>

        <h4>Origine & dates</h4>
        <div class="d-meta">
          <div *ngIf="d.sources?.length"><span class="mk">Source :</span> {{ d.sources[0].providerKey }}</div>
          <div *ngIf="d.firstSeenAt"><span class="mk">Vu le :</span> {{ d.firstSeenAt | date:'dd/MM/yyyy' }}</div>
          <div *ngIf="d.lastSeenAt"><span class="mk">Maj :</span> {{ d.lastSeenAt | date:'dd/MM/yyyy' }}</div>
        </div>

        <h4>Attributs</h4>
        <table class="attrs"><tr *ngFor="let a of attrs(d)"><td class="k">{{ a[0] }}</td>
          <td class="v"><ng-container *ngTemplateOutlet="valTpl; context: { $implicit: a[1], k: a[0] }"></ng-container></td></tr></table>

        <h4>Relations ({{ d.relationCount }})</h4>
        <div class="rels" *ngIf="d.relations?.length; else noRel">
          <div class="relrow" *ngFor="let r of d.relations" (click)="open(r.target.key)"
               nz-tooltip [nzTooltipTitle]="relLevelLabel(r.level) + ' · force ' + ((r.strength || 0)*100|number:'1.0-0') + '%'">
            <span class="rellvl" [attr.data-lvl]="r.level">N{{ r.level }}</span>
            <span class="reldir" [class.out]="r.direction==='out'">{{ r.direction==='out' ? '→' : '←' }}</span>
            <span class="reltype">{{ labels.relationLabel(r.type) }}<span *ngIf="r.role"> · {{ r.role }}</span></span>
            <span class="reltarget">{{ r.target.label }}</span>
          </div>
        </div>
        <ng-template #noRel><span class="muted">Aucune relation.</span></ng-template>
      </div>
    </ng-container>
  </nz-drawer>

  <!-- Rendu RÉCURSIF dynamique d'une valeur (scalaire / tableau / objet) — zéro hardcode de champ -->
  <ng-template #valTpl let-v let-k="k">
    <ng-container [ngSwitch]="kind(v)">
      <!-- tableau : liste d'éléments, chacun rendu récursivement -->
      <div *ngSwitchCase="'array'" class="varr">
        <div class="vitem" *ngFor="let it of v; let i = index">
          <span class="vidx">{{ i + 1 }}.</span>
          <ng-container *ngTemplateOutlet="valTpl; context: { $implicit: it }"></ng-container>
        </div>
        <span class="vempty" *ngIf="!v.length">∅</span>
      </div>
      <!-- objet : table clé/valeur, valeurs rendues récursivement -->
      <div *ngSwitchCase="'object'" class="vobj">
        <div class="vrow" *ngFor="let e of entries(v)">
          <span class="vk">{{ e[0] }}</span>
          <span class="vv"><ng-container *ngTemplateOutlet="valTpl; context: { $implicit: e[1], k: e[0] }"></ng-container></span>
        </div>
      </div>
      <!-- scalaire : formaté selon le type/heuristique (date, booléen, montant) -->
      <span *ngSwitchDefault [class.vmuted]="v===null||v===undefined">{{ fmtScalar(v, k) }}</span>
    </ng-container>
  </ng-template>
  `,
  styles: [`
    .dict-wrap { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
    .dsearchrow { display: flex; gap: 8px; } .dq { flex: 1; }
    .dtypes { display: flex; flex-wrap: wrap; gap: 6px; }
    .tchip { font-size: 12px; background: #f3f3f3; border-radius: 12px; padding: 3px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
    .tchip.on { background: #e61982; color: #fff; }
    .tchip i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dlist { display: flex; flex-direction: column; border: 1px solid #eee; border-radius: 10px; overflow: hidden; }
    .ditem { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid #f4f4f4; cursor: pointer; }
    .ditem:hover { background: #faf0f6; }
    .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .dlabel { font-weight: 500; }
    .dtype { color: #999; font-size: 12px; }
    .dstat { font-size: 11px; background: #f0f0f0; border-radius: 8px; padding: 1px 7px; color: #666; }
    .dsrc { margin-left: auto; font-size: 11px; color: #bbb; }
    .dpage { display: flex; gap: 12px; align-items: center; justify-content: center; font-size: 12px; color: #666; }
    .detail h3 { margin: 10px 0 6px; } .d-type { color: #fff; border-radius: 6px; padding: 2px 8px; font-size: 12px; }
    .detail h4 { margin: 14px 0 6px; font-size: 13px; color: #555; }
    .d-badges, .d-roles, .d-flags { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0; }
    .d-meta { font-size: 12px; color: #555; display: flex; flex-direction: column; gap: 3px; } .d-meta .mk { color: #999; margin-right: 4px; }
    .attrs { width: 100%; font-size: 12px; } .attrs .k { color: #999; padding-right: 10px; vertical-align: top; white-space: nowrap; } .attrs .v { word-break: break-word; }
    .rels { display: flex; flex-direction: column; gap: 3px; max-height: 320px; overflow: auto; }
    .relrow { display: grid; grid-template-columns: 26px 18px 1fr 1.2fr; gap: 6px; align-items: center; font-size: 12px; padding: 4px 6px; border-radius: 6px; cursor: pointer; }
    .relrow:hover { background: #faf0f6; }
    .rellvl { font-size: 10px; font-weight: 700; text-align: center; border-radius: 8px; padding: 1px 0; color: #fff; }
    .rellvl[data-lvl="1"] { background: #2ec27e; } .rellvl[data-lvl="2"] { background: #f5a623; } .rellvl[data-lvl="3"] { background: #c9c9c9; }
    .reldir { color: #bbb; font-weight: 700; text-align: center; } .reldir.out { color: #e61982; }
    .reltype { color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .reltarget { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .muted { color: #aaa; font-size: 12px; }
    .vmuted { color: #ccc; }
    .varr { display: flex; flex-direction: column; gap: 3px; }
    .vitem { display: flex; gap: 5px; align-items: flex-start; }
    .vidx { color: #e61982; font-size: 11px; flex-shrink: 0; }
    .vobj { border-left: 2px solid #f0e6f0; padding-left: 8px; display: flex; flex-direction: column; gap: 2px; }
    .vrow { display: grid; grid-template-columns: minmax(70px, auto) 1fr; gap: 6px; font-size: 12px; }
    .vk { color: #999; }
    .vempty { color: #ccc; }
  `],
})
export class RadarDictionaryComponent implements OnInit {
  items: DictItem[] = []; q = ''; type: string | null = null;
  total = 0; page = 1; size = 40; byType: { coreType: string; n: number }[] = [];
  detail: EntityDetail | null = null; detailLoading = false;
  get pages(): number { return Math.max(1, Math.ceil(this.total / this.size)); }

  constructor(private radar: RadarBackendService, private acl: AccessControlService, public labels: RadarLabelsService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.search(1); }
  color(c: string): string { return CORE_COLORS[c] || '#888'; }
  sent(s?: string): string { return s === 'négatif' ? '😞' : (s === 'positif' ? '😊' : '😐'); }
  relLevelLabel(lvl?: number): string { return lvl === 1 ? 'Relation directe' : (lvl === 2 ? 'Relation indirecte' : 'Relation contextuelle'); }
  attrs(d: EntityDetail): [string, any][] { return Object.entries(d.attributes || {}).filter(([k]) => k !== 'body').slice(0, 40); }

  // Rendu dynamique — type de valeur (pour le ngSwitch récursif)
  kind(v: any): string { if (Array.isArray(v)) return 'array'; if (v !== null && typeof v === 'object') return 'object'; return 'scalar'; }
  entries(v: any): [string, any][] { try { return Object.entries(v); } catch { return []; } }
  // Formatage d'un scalaire selon des HEURISTIQUES de valeur (pas de hardcode de champ) :
  // timestamp unix → date ; booléen → Oui/Non ; nombre/decimal → format FR ; sinon brut.
  fmtScalar(v: any, k?: string): string {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
    const n = typeof v === 'number' ? v : (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : NaN);
    if (!isNaN(n)) {
      // timestamp unix (secondes 2001–2035) ou millisecondes → date lisible
      if (Number.isInteger(n) && n >= 1_000_000_000 && n <= 2_100_000_000) return new Date(n * 1000).toLocaleDateString('fr-FR');
      if (Number.isInteger(n) && n >= 1_000_000_000_000 && n <= 2_100_000_000_000) return new Date(n).toLocaleDateString('fr-FR');
      // nombre « monétaire »/décimal (ex. "3816.00000000") → format FR sans zéros superflus
      if (typeof v === 'string' && /\.\d{3,}/.test(v)) return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
      if (!Number.isInteger(n)) return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }
    return String(v);
  }

  search(page: number): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws) return;
    this.radar.dictionary(ws, { page, size: this.size, q: this.q || undefined, coreType: this.type || undefined }).subscribe({
      next: r => { this.items = r.items; this.total = r.total; this.page = r.page; if (!this.type) this.byType = r.byType; this.cdr.markForCheck(); },
      error: () => {},
    });
  }
  open(key: string): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws || !key) return;
    this.detail = null; this.detailLoading = true; this.cdr.markForCheck();
    this.radar.entityDetail(ws, key).subscribe({
      next: r => { this.detail = r.entity; this.detailLoading = false; this.cdr.markForCheck(); },
      error: () => { this.detailLoading = false; this.cdr.markForCheck(); },
    });
  }
}
