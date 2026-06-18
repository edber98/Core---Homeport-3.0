import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AccessControlService } from '../../services/access-control.service';
import { RadarBackendService, RadarAnalytics, RadarRecommendations } from '../../services/radar-backend.service';

// Onglet « Analyse » — le cerveau rend ses insights : financier, retards, goulots,
// anomalies de corrélation (avec suggestion de rattachement par matching flou).

@Component({
  selector: 'radar-analyse',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzSpinModule, NzEmptyModule, NzTagModule, NzProgressModule, NzToolTipModule],
  template: `
  <div class="an-wrap">
    <div class="an-top">
      <button nz-button nzSize="small" (click)="load()"><span nz-icon nzType="reload"></span> Actualiser</button>
    </div>
    <nz-spin *ngIf="loading" nzSimple class="spin"></nz-spin>

    <!-- RECOMMANDATIONS : ce que le Radar conseille de faire -->
    <div class="section reco" *ngIf="recs && recs.recommendations.length">
      <h4><span nz-icon nzType="thunderbolt"></span> Recommandations d'action ({{ recs.recommendations.length }})</h4>
      <div class="forecast" *ngIf="recs.forecast as f">
        <span class="fc"><b>{{ fmt(f.outstanding) }}</b> à encaisser · délai moyen ~{{ f.expectedDays }} j · {{ f.atRiskCount }} à risque</span>
        <span class="model" *ngIf="f.riskModel as m" nz-tooltip [nzTooltipTitle]="'Modèle entraîné sur ' + (m.examples||0) + ' exemples'">
          <span nz-icon nzType="experiment"></span> modèle risque d'impayé :
          <b *ngIf="m.status==='active'">actif ({{ ((m.accuracy || 0)*100) | number:'1.0-0' }}%)</b>
          <b *ngIf="m.status!=='active'">{{ m.status === 'insufficient_data' ? 'apprentissage en cours' : m.status }}</b>
        </span>
      </div>
      <div class="rows">
        <div class="rrow" *ngFor="let r of recs.recommendations.slice(0, 12)" [class.high]="r.priority==='haute'">
          <span class="prio" [class.h]="r.priority==='haute'" [class.n]="r.priority==='normale'">{{ r.priority }}</span>
          <div class="rbody">
            <div class="rtitle">{{ r.title }} <nz-tag *ngIf="r.system" nzColor="blue">{{ r.system }}</nz-tag></div>
            <div class="ract"><span nz-icon nzType="arrow-right"></span> {{ r.action }}</div>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="!loading && data">
      <!-- Financier -->
      <div class="section">
        <h4><span nz-icon nzType="euro"></span> Financier</h4>
        <div class="cards">
          <div class="card"><div class="cv">{{ fmt(data.financial.billed) }}</div><div class="cl">Facturé</div></div>
          <div class="card ok"><div class="cv">{{ fmt(data.financial.paid) }}</div><div class="cl">Encaissé</div></div>
          <div class="card warn"><div class="cv">{{ fmt(data.financial.outstanding) }}</div><div class="cl">En attente</div></div>
          <div class="card"><div class="cv">{{ data.financial.collectionRate }}%</div><div class="cl">Recouvrement</div>
            <nz-progress [nzPercent]="data.financial.collectionRate" nzSize="small" [nzShowInfo]="false"></nz-progress></div>
        </div>
      </div>

      <!-- Retards -->
      <div class="section" *ngIf="data.delays.length">
        <h4><span nz-icon nzType="clock-circle"></span> Retards & en souffrance ({{ data.delays.length }})</h4>
        <div class="rows">
          <div class="row" *ngFor="let d of data.delays.slice(0, 12)" [title]="d.reason">
            <nz-tag nzColor="orange">{{ d.type }}</nz-tag>
            <nz-tag *ngIf="d.system" nzColor="blue">{{ d.system }}</nz-tag>
            <span class="rmain">{{ d.label }} — bloqué « {{ d.state }} »</span>
            <span class="rend"><b>{{ d.sinceDays }} j</b></span>
          </div>
        </div>
      </div>

      <!-- Goulots -->
      <div class="section" *ngIf="data.bottlenecks.length">
        <h4><span nz-icon nzType="hourglass"></span> Goulots d'étranglement</h4>
        <div class="rows">
          <div class="brow" *ngFor="let b of data.bottlenecks">
            <div class="bhead"><nz-tag nzColor="geekblue">{{ b.process }}</nz-tag> {{ b.from }} <span nz-icon nzType="arrow-right"></span> {{ b.to }}
              <span class="rend">≈ <b>{{ b.avgDays }} j</b> · {{ b.count }} cas</span></div>
            <div class="bdesc" *ngIf="b.description">{{ b.description }}</div>
          </div>
        </div>
      </div>

      <!-- Anomalies de corrélation -->
      <div class="section" *ngIf="data.anomalies.length">
        <h4><span nz-icon nzType="warning"></span> Anomalies de corrélation ({{ data.anomalies.length }})</h4>
        <p class="sub">Dossiers/projets non rattachés à un client (par dossier, pas par fichier). Pour les noms saisis à la main, le Radar propose le bon client par ressemblance.</p>
        <div class="rows">
          <div class="brow anom" *ngFor="let a of data.anomalies.slice(0, 15)">
            <div class="bhead">
              <nz-tag [nzColor]="a.kind === 'near_miss' ? 'gold' : 'default'">{{ a.kind === 'near_miss' ? 'à rattacher ?' : 'orphelin' }}</nz-tag>
              <nz-tag *ngIf="a.system" nzColor="blue">{{ a.system }}</nz-tag>
              <span class="rmain">{{ a.entity }}</span>
              <span class="rsugg" *ngIf="a.suggestedClient">→ probablement <b>{{ a.suggestedClient }}</b> <span class="sim">({{ a.similarity }}%)</span></span>
            </div>
            <div class="bdesc" *ngIf="a.path">📁 {{ a.path }}</div>
          </div>
        </div>
      </div>

      <nz-empty *ngIf="!data.delays.length && !data.bottlenecks.length && !data.anomalies.length && !data.financial.invoices"
                nzNotFoundContent="Pas encore assez de données pour analyser. Connectez vos logiciels et laissez le Radar observer."></nz-empty>
    </div>
  </div>
  `,
  styles: [`
    .an-wrap { padding-top: 6px; }
    .an-top { margin-bottom: 10px; } .spin { display:block; margin:40px auto; }
    .reco { background:#fff7f0; border:1px solid #ffd6b3; border-radius:10px; padding:12px 14px; }
    .reco .forecast { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:#666; margin-bottom:8px; }
    .reco .forecast .model { color:#722ed1; } .reco .forecast b { color:#222; }
    .rrow { display:flex; gap:10px; align-items:flex-start; background:#fff; border:1px solid #f5f5f5; border-radius:8px; padding:7px 12px; margin-bottom:5px; }
    .rrow.high { border-color:#ffccc7; }
    .prio { font-size:10px; text-transform:uppercase; padding:1px 7px; border-radius:8px; background:#f0f0f0; color:#888; white-space:nowrap; margin-top:2px; }
    .prio.h { background:#fff1f0; color:#cf1322; } .prio.n { background:#e6f4ff; color:#1677ff; }
    .rbody .rtitle { font-size:13px; color:#222; font-weight:500; } .rbody .ract { font-size:12px; color:#e6822d; margin-top:2px; }
    .section { margin-bottom: 20px; }
    .section h4 { font-size: 14px; margin: 0 0 8px; display:flex; align-items:center; gap:6px; }
    .section .sub { color:#999; font-size:12px; margin:-4px 0 8px; }
    .cards { display:flex; gap:10px; flex-wrap:wrap; }
    .card { flex:1; min-width:130px; background:#fafafa; border:1px solid #f0f0f0; border-radius:10px; padding:12px 14px; }
    .card.ok { background:#f6ffed; border-color:#b7eb8f; } .card.warn { background:#fff7e6; border-color:#ffd591; }
    .card .cv { font-size:22px; font-weight:700; color:#222; } .card .cl { color:#888; font-size:12px; }
    .rows { display:flex; flex-direction:column; gap:5px; }
    .row { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #f5f5f5; border-radius:8px; padding:6px 12px; font-size:13px; }
    .row .rmain { color:#333; } .row .rend { margin-left:auto; color:#666; white-space:nowrap; }
    .brow { background:#fff; border:1px solid #f5f5f5; border-radius:8px; padding:7px 12px; }
    .brow .bhead { display:flex; align-items:center; gap:6px; font-size:13px; flex-wrap:wrap; }
    .brow .bhead .rmain { color:#333; } .brow .bhead .rend { margin-left:auto; color:#666; white-space:nowrap; }
    .brow .bdesc { color:#888; font-size:12px; margin-top:3px; }
    .anom .rsugg { color:#666; } .anom .sim { color:#aaa; }
  `],
})
export class RadarAnalyseComponent implements OnInit {
  loading = false;
  data: RadarAnalytics | null = null;
  recs: RadarRecommendations | null = null;

  constructor(private radar: RadarBackendService, private acl: AccessControlService, private zone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.load(); }
  fmt(n: number): string { return (n || 0).toLocaleString('fr-FR') + ' €'; }

  load(): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws) return;
    this.loading = true;
    this.radar.getAnalytics(ws).subscribe({
      next: d => this.zone.run(() => { this.data = d; this.loading = false; this.cdr.markForCheck(); }),
      error: () => this.zone.run(() => { this.loading = false; this.cdr.markForCheck(); }),
    });
    this.radar.getRecommendations(ws).subscribe({
      next: r => this.zone.run(() => { this.recs = r; this.cdr.markForCheck(); }),
      error: () => {},
    });
  }
}
