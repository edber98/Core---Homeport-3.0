import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AccessControlService } from '../../services/access-control.service';
import { RadarBackendService, RadarMapping, RadarSnapshot, RadarSnapshotPage } from '../../services/radar-backend.service';
import { RadarLabelsService } from './radar-labels.service';

// Onglet « Données & Schémas » — traçabilité raw → ontologie.
//  - Schémas : les RadarMapping actifs (comment un champ brut devient un champ canonique).
//  - Données brutes : les snapshots observés, avec lignée (snapshot → mapping → entité).

@Component({
  selector: 'radar-data',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzSegmentedModule, NzTableModule, NzTagModule, NzDrawerModule, NzSelectModule,
    NzEmptyModule, NzSpinModule, NzIconModule, NzButtonModule,
  ],
  template: `
  <div class="data-wrap">
    <nz-segmented [nzOptions]="views" [(ngModel)]="viewIndex" (ngModelChange)="onView($event)"></nz-segmented>

    <!-- SCHÉMAS (mappings) -->
    <div *ngIf="viewIndex === 0" class="pane">
      <nz-spin *ngIf="loadingMaps" nzSimple></nz-spin>
      <nz-empty *ngIf="!loadingMaps && !mappings.length"
                nzNotFoundContent="Aucun mapping. Les mappings déclarés sont seedés au démarrage du Radar."></nz-empty>
      <div class="maps">
        <div class="map-card" *ngFor="let m of mappings">
          <div class="map-head">
            <span class="prov">{{ m.providerKey }}</span>
            <span class="arrow">·</span>
            <code>{{ m.rawEntityType }}</code>
            <span nz-icon nzType="arrow-right"></span>
            <nz-tag nzColor="geekblue">{{ labels.typeLabel(m.target.coreType, m.target.subtype) }}</nz-tag>
            <nz-tag [nzColor]="m.learnedBy === 'llm' ? 'purple' : 'default'">{{ m.learnedBy === 'llm' ? 'appris (IA)' : 'déclaré' }}</nz-tag>
            <nz-tag *ngIf="m.workspaceId" nzColor="gold">workspace</nz-tag>
            <span class="ver">v{{ m.version || 1 }}</span>
          </div>
          <table class="fmap">
            <tr><th>Champ canonique</th><th>← Champ brut</th><th>Valeurs</th></tr>
            <tr *ngFor="let f of fieldEntries(m)">
              <td class="canon">{{ f[0] }}</td>
              <td><code>{{ f[1] }}</code></td>
              <td class="vmap">{{ valueMapOf(m, f[0]) }}</td>
            </tr>
          </table>
          <div class="rules" *ngIf="m.relationRules?.length">
            <span class="rl-title">Relations :</span>
            <nz-tag *ngFor="let r of m.relationRules">{{ labels.relationLabel(r.type) }}<ng-container *ngIf="r.role"> ({{ labels.roleLabel(r.role) }})</ng-container> ← {{ r.viaField }}</nz-tag>
          </div>
          <div class="rules" *ngIf="m.roleRules?.length">
            <span class="rl-title">Rôles :</span>
            <nz-tag *ngFor="let r of m.roleRules">{{ labels.roleLabel(r.role) }} si {{ r.field }}<ng-container *ngIf="r.equals !== undefined">={{ r.equals }}</ng-container></nz-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- DONNÉES BRUTES (snapshots) -->
    <div *ngIf="viewIndex === 1" class="pane">
      <div class="filters">
        <nz-select [(ngModel)]="entityType" (ngModelChange)="loadSnaps()" nzAllowClear nzPlaceHolder="Type d'entité"
                   class="sel" nzSize="small">
          <nz-option *ngFor="let t of snapTypes" [nzValue]="t.entityType" [nzLabel]="t.entityType + ' (' + t.count + ')'"></nz-option>
        </nz-select>
        <button nz-button nzSize="small" (click)="loadSnaps()"><span nz-icon nzType="reload"></span></button>
      </div>
      <nz-spin *ngIf="loadingSnaps" nzSimple></nz-spin>
      <nz-empty *ngIf="!loadingSnaps && !snaps.length"
                nzNotFoundContent="Aucune donnée observée. Connecte un logiciel et lance une synchronisation."></nz-empty>
      <nz-table *ngIf="snaps.length" #t [nzData]="snaps" nzSize="small" [nzPageSize]="20">
        <thead><tr><th>Type</th><th>Clé</th><th>Aperçu</th><th>Modifié</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let s of t.data">
            <td><nz-tag>{{ s.entityType }}</nz-tag></td>
            <td><code>{{ s.entityKey }}</code></td>
            <td class="prev">{{ preview(s) }}</td>
            <td class="date">{{ (s.lastChangedAt || s.lastSeenAt) | date:'dd/MM HH:mm' }}</td>
            <td><button nz-button nzType="link" nzSize="small" (click)="openLineage(s)">Tracer</button></td>
          </tr>
        </tbody>
      </nz-table>
    </div>
  </div>

  <!-- LIGNÉE : snapshot brut → mapping → entité -->
  <nz-drawer [nzVisible]="!!lineage" [nzWidth]="540" nzTitle="Lignée — donnée brute → ontologie"
             (nzOnClose)="lineage = null" [nzMaskClosable]="true">
    <ng-container *nzDrawerContent>
      <div class="lin" *ngIf="lineage">
        <h4>1 · Donnée brute observée</h4>
        <pre class="json">{{ lineage.raw | json }}</pre>

        <h4>2 · Mapping appliqué</h4>
        <div *ngIf="lineage.mapping as m; else noMap">
          <nz-tag nzColor="geekblue">{{ labels.typeLabel(m.target.coreType, m.target.subtype) }}</nz-tag>
          <nz-tag [nzColor]="m.learnedBy === 'llm' ? 'purple' : 'default'">{{ m.learnedBy === 'llm' ? 'appris (IA)' : 'déclaré' }}</nz-tag>
          <table class="fmap">
            <tr *ngFor="let f of fieldEntries(m)"><td class="canon">{{ f[0] }}</td><td><code>{{ f[1] }}</code></td></tr>
          </table>
        </div>
        <ng-template #noMap><span class="muted">Aucun mapping actif pour ce type — la donnée est observée mais pas encore projetée dans le graphe.</span></ng-template>
      </div>
    </ng-container>
  </nz-drawer>
  `,
  styles: [`
    .data-wrap { padding-top: 6px; }
    .pane { margin-top: 12px; }
    .maps { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
    .map-card { border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px 12px; background: #fff; }
    .map-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .map-head .prov { font-weight: 600; text-transform: capitalize; }
    .map-head .arrow { color: #ccc; } .map-head .ver { color: #aaa; font-size: 11px; margin-left: auto; }
    table.fmap { width: 100%; border-collapse: collapse; font-size: 12px; }
    table.fmap th { text-align: left; color: #999; font-weight: 500; padding: 2px 6px; border-bottom: 1px solid #f0f0f0; }
    table.fmap td { padding: 2px 6px; border-bottom: 1px solid #fafafa; }
    table.fmap td.canon { color: #2f54eb; font-weight: 500; } table.fmap td.vmap { color: #999; font-size: 11px; }
    .rules { margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
    .rl-title { font-size: 12px; color: #888; }
    .filters { display: flex; gap: 6px; margin-bottom: 10px; } .sel { min-width: 200px; }
    td.prev { color: #555; max-width: 360px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    td.date { color: #999; white-space: nowrap; }
    .json { background: #f6f8fa; border-radius: 6px; padding: 10px; font-size: 11px; max-height: 280px; overflow: auto; }
    .lin h4 { margin: 14px 0 6px; color: #555; font-size: 13px; }
    .muted { color: #aaa; font-size: 12px; }
  `],
})
export class RadarDataComponent implements OnInit {
  // valeurs numériques explicites : nz-segmented émet la VALEUR de l'option, pas l'index
  views = [{ label: 'Schémas', value: 0 }, { label: 'Données brutes', value: 1 }];
  viewIndex = 0;

  loadingMaps = false; mappings: RadarMapping[] = [];
  loadingSnaps = false; snaps: RadarSnapshot[] = []; snapTypes: { entityType: string; count: number }[] = [];
  entityType: string | null = null;
  lineage: { raw: any; mapping: RadarMapping | null } | null = null;

  constructor(private radar: RadarBackendService, private acl: AccessControlService, public labels: RadarLabelsService) {}

  ngOnInit(): void { this.labels.load(); this.loadMaps(); }
  private wsId(): string | null { return this.acl.currentWorkspaceId(); }

  onView(i: number): void { if (i === 1 && !this.snaps.length) this.loadSnaps(); }

  loadMaps(): void {
    const ws = this.wsId(); if (!ws) return;
    this.loadingMaps = true;
    this.radar.listMappings(ws).subscribe({
      next: m => { this.mappings = m; this.loadingMaps = false; },
      error: () => { this.loadingMaps = false; },
    });
  }

  loadSnaps(): void {
    const ws = this.wsId(); if (!ws) return;
    this.loadingSnaps = true;
    this.radar.listSnapshots(ws, { entityType: this.entityType || undefined, limit: 200 }).subscribe({
      next: (p: RadarSnapshotPage) => { this.snaps = p.items; this.snapTypes = p.byType; this.loadingSnaps = false; },
      error: () => { this.loadingSnaps = false; },
    });
  }

  fieldEntries(m: RadarMapping): [string, string][] { return Object.entries(m.fieldMap || {}); }
  valueMapOf(m: RadarMapping, canon: string): string {
    const vm = m.valueMap && m.valueMap[canon];
    if (!vm) return '';
    return Object.entries(vm).map(([k, v]) => `${k}→${v}`).join(', ');
  }
  preview(s: RadarSnapshot): string {
    const d = s.data || {};
    return Object.entries(d).slice(0, 6).map(([k, v]) => `${k}: ${v}`).join('  ·  ');
  }

  openLineage(s: RadarSnapshot): void {
    const m = this.mappings.find(x => x.rawEntityType === s.entityType) || null;
    // s'assure que les mappings sont chargés pour résoudre le mapping appliqué
    if (!this.mappings.length) {
      const ws = this.wsId();
      if (ws) this.radar.listMappings(ws).subscribe({ next: ms => { this.mappings = ms; this.lineage = { raw: s.data, mapping: ms.find(x => x.rawEntityType === s.entityType) || null }; } });
    } else {
      this.lineage = { raw: s.data, mapping: m };
    }
  }
}
