import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { AccessControlService } from '../../services/access-control.service';
import { RadarBackendService, RadarAnalytics, RadarRecommendations } from '../../services/radar-backend.service';

// Onglet « Analyse » — le cerveau rend ses insights : financier, retards, goulots,
// anomalies de corrélation (avec suggestion de rattachement par matching flou).

@Component({
  selector: 'radar-analyse',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzSpinModule, NzEmptyModule, NzTagModule, NzProgressModule, NzToolTipModule, NzPaginationModule],
  template: `
  <div class="an-wrap">
    <div class="an-top">
      <button nz-button nzSize="small" (click)="load()"><span nz-icon nzType="reload"></span> Actualiser</button>
    </div>

    <!-- I5 — Interroge le cerveau en langage naturel -->
    <div class="askbox">
      <div class="askrow">
        <span nz-icon nzType="message" class="aski"></span>
        <input [(ngModel)]="question" (keydown.enter)="ask()" [disabled]="asking"
               placeholder="Pose une question : « où sont mes goulots sur les clients industriels ? »" class="askinput" />
        <button nz-button nzType="primary" nzSize="small" (click)="ask()" [nzLoading]="asking" [disabled]="!question.trim()">Demander</button>
      </div>
      <div class="suggest" *ngIf="!answer && !asking">
        <span *ngFor="let q of suggestions" class="chip" (click)="question=q; ask()">{{ q }}</span>
      </div>
      <div class="answer" *ngIf="answer">
        <div class="atext">{{ answer }}</div>
        <div class="asrc" *ngIf="answerSources.length"><span nz-icon nzType="link"></span> {{ answerSources.join(' · ') }}</div>
      </div>
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
          <b *ngIf="m.status!=='active'">{{ modelStatusLabel(m.status, m.accuracy) }}</b>
        </span>
      </div>
      <div class="rows">
        <div class="rrow" *ngFor="let r of recs.recommendations | slice: (recPage-1)*recSize : recPage*recSize" [class.high]="r.priority==='haute'">
          <span class="prio" [class.h]="r.priority==='haute'" [class.n]="r.priority==='normale'">{{ r.priority }}</span>
          <div class="rbody">
            <div class="rtitle">{{ r.title }} <nz-tag *ngIf="r.system" nzColor="blue">{{ r.system }}</nz-tag></div>
            <div class="ract"><span nz-icon nzType="arrow-right"></span> {{ r.action }}
              <button *ngIf="r.executable && !r.done" nz-button nzSize="small" nzType="primary" class="execbtn" (click)="exec(r)" [nzLoading]="r.busy">Exécuter</button>
              <span *ngIf="r.done" class="doneflag"><span nz-icon nzType="check-circle"></span> fait</span>
            </div>
          </div>
        </div>
      </div>
      <nz-pagination *ngIf="recs.recommendations.length > recSize" class="pager"
        [nzPageIndex]="recPage" (nzPageIndexChange)="recPage=$event" [nzPageSize]="recSize" [nzTotal]="recs.recommendations.length" nzSize="small"></nz-pagination>
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
          <div class="row" *ngFor="let d of data.delays" [title]="d.reason">
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

      <!-- Goulots de STOCK -->
      <div class="section" *ngIf="data.stockRisks?.length">
        <h4><span nz-icon nzType="inbox"></span> Goulots de stock ({{ (data.stockRisks||[]).length }})</h4>
        <div class="rows">
          <div class="brow" *ngFor="let s of data.stockRisks || []">
            <div class="bhead">
              <nz-tag [nzColor]="s.severity==='high' ? 'red' : 'orange'">{{ s.severity==='high' ? 'rupture probable' : 'tendu' }}</nz-tag>
              <span class="rmain">{{ s.product }}</span>
              <span class="rend">stock <b>{{ s.stock }}</b> / demande <b>{{ s.demand }}</b></span>
            </div>
            <div class="bdesc">{{ s.reason }}</div>
          </div>
        </div>
      </div>

      <!-- Ruptures de FLUX (étape sautée dans le processus de vente) -->
      <div class="section" *ngIf="data.processGaps?.length">
        <h4><span nz-icon nzType="disconnect"></span> Ruptures de flux ({{ (data.processGaps||[]).length }})</h4>
        <p class="sub">Pièces qui sautent une étape attendue (commande sans devis, facture sans commande).</p>
        <div class="rows">
          <div class="brow anom" *ngFor="let g of data.processGaps || []">
            <div class="bhead">
              <nz-tag [nzColor]="g.severity==='high' ? 'red' : 'gold'">{{ g.subtype }} sans {{ g.missing }}</nz-tag>
              <span class="rmain">{{ g.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Anomalies de corrélation -->
      <div class="section" *ngIf="data.anomalies.length">
        <h4><span nz-icon nzType="warning"></span> Anomalies de corrélation ({{ data.anomalies.length }})</h4>
        <p class="sub">Dossiers/projets non rattachés à un client (par dossier, pas par fichier). Pour les noms saisis à la main, le Radar propose le bon client par ressemblance.</p>
        <div class="rows">
          <div class="brow anom" *ngFor="let a of data.anomalies">
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
    .askbox { background:#f0f7ff; border:1px solid #bae0ff; border-radius:10px; padding:12px 14px; margin-bottom:16px; }
    .askrow { display:flex; align-items:center; gap:8px; } .askrow .aski { color:#1677ff; }
    .askinput { flex:1; border:1px solid #d9e8ff; border-radius:8px; padding:6px 10px; font-size:13px; outline:none; }
    .askinput:focus { border-color:#1677ff; }
    .suggest { margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; }
    .suggest .chip { font-size:12px; background:#fff; border:1px solid #d9e8ff; border-radius:14px; padding:3px 10px; color:#1677ff; cursor:pointer; }
    .suggest .chip:hover { background:#e6f4ff; }
    .answer { margin-top:10px; background:#fff; border:1px solid #e6f0ff; border-radius:8px; padding:10px 12px; }
    .answer .atext { font-size:13px; color:#222; white-space:pre-wrap; line-height:1.5; }
    .answer .asrc { margin-top:6px; font-size:11px; color:#8aa; display:flex; align-items:center; gap:4px; }
    .pager { margin-top:8px; text-align:right; }
    .execbtn { margin-left:8px; height:22px; padding:0 10px; font-size:11px; }
    .doneflag { margin-left:8px; color:#52c41a; font-size:12px; }
  `],
})
export class RadarAnalyseComponent implements OnInit {
  loading = false;
  data: RadarAnalytics | null = null;
  recs: RadarRecommendations | null = null;
  recPage = 1;
  recSize = 15;
  // I5 — interrogation conversationnelle
  question = '';
  asking = false;
  answer = '';
  answerSources: string[] = [];
  suggestions = ['Quelles factures relancer en priorité ?', 'Où sont mes goulots de vente ?', 'Ai-je un risque de rupture de stock ?', 'Quelles ruptures dans mon flux de vente ?'];

  constructor(private radar: RadarBackendService, private acl: AccessControlService, private zone: NgZone, private cdr: ChangeDetectorRef) {}

  // Libellé lisible du statut du modèle (évite le jargon « shadow »/« trained »).
  modelStatusLabel(status: string, accuracy?: number): string {
    const acc = accuracy != null ? ` (${Math.round(accuracy * 100)}%)` : '';
    switch (status) {
      case 'insufficient_data': return 'apprentissage en cours (pas assez de données)';
      case 'shadow': return `fiabilité insuffisante${acc} — non appliqué`;
      case 'trained': return `entraîné${acc}`;
      default: return status || 'inconnu';
    }
  }

  ngOnInit(): void { this.load(); }
  fmt(n: number): string { return (n || 0).toLocaleString('fr-FR') + ' €'; }

  exec(r: any): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws || r.busy) return;
    r.busy = true;
    this.radar.executeAction(ws, { type: r.type, keepKey: r.keepKey, dropKey: r.dropKey, fromKey: r.fromKey, toKey: r.toKey }).subscribe({
      next: res => this.zone.run(() => { r.busy = false; if (res.ok) { r.done = true; } else { r.error = res.error || res.note; } this.cdr.markForCheck(); }),
      error: () => this.zone.run(() => { r.busy = false; r.error = 'échec'; this.cdr.markForCheck(); }),
    });
  }

  ask(): void {
    const ws = this.acl.currentWorkspaceId(); const q = this.question.trim(); if (!ws || !q || this.asking) return;
    this.asking = true; this.answer = ''; this.answerSources = [];
    this.radar.askRadar(ws, q).subscribe({
      next: r => this.zone.run(() => { this.answer = r.answer; this.answerSources = r.sources || []; this.asking = false; this.cdr.markForCheck(); }),
      error: () => this.zone.run(() => { this.answer = 'Désolé, je n\'ai pas pu analyser la question.'; this.asking = false; this.cdr.markForCheck(); }),
    });
  }

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
