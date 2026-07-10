import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AccessControlService } from '../../services/access-control.service';
import { RadarBackendService } from '../../services/radar-backend.service';

// Onglet « Pilotage » — tableau de bord décisionnel : trésorerie, marges, recouvrement
// (DSO), pipeline (win-rate), churn, santé client, divergences, RH. Chaque carte
// interroge son analyseur backend. Vue CFO/dirigeant.
@Component({
  selector: 'radar-pilotage',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule, NzProgressModule, NzToolTipModule],
  template: `
  <div class="pil">
    <div class="ptop">
      <h3><span nz-icon nzType="dashboard"></span> Pilotage de l'entreprise</h3>
      <button nz-button nzSize="small" (click)="loadAll()" [nzLoading]="loading"><span nz-icon nzType="reload"></span> Actualiser</button>
    </div>

    <div class="grid">
      <!-- Trésorerie -->
      <section class="card big" *ngIf="cashflow as c">
        <div class="ch"><span nz-icon nzType="bank"></span> Trésorerie prévisionnelle</div>
        <div class="bignum" [class.neg]="c.netPosition < 0">{{ c.netPosition >= 0 ? '+' : '' }}{{ eur(c.netPosition) }}</div>
        <div class="sub">encaissements {{ eur(c.expectedInflow) }} · décaissements {{ eur(c.expectedOutflow) }}</div>
        <div class="windows" *ngIf="c.windows?.length">
          <div class="win" *ngFor="let w of c.windows"><b>{{ w.label }}</b><span [class.neg]="w.net<0">{{ w.net>=0?'+':'' }}{{ eur(w.net) }}</span></div>
        </div>
      </section>

      <!-- Marges -->
      <section class="card" *ngIf="margins?.totals as m">
        <div class="ch"><span nz-icon nzType="rise"></span> Marge</div>
        <div class="bignum">{{ m.rate }}%</div>
        <div class="sub">CA {{ eur(m.revenue) }} · marge {{ eur(m.margin) }}</div>
        <div class="rows" *ngIf="margins.byType">
          <div class="r" *ngFor="let t of typeEntries(margins.byType)"><span>{{ t[0] }}</span><span>{{ t[1].rate }}%</span></div>
        </div>
      </section>

      <!-- Recouvrement / DSO -->
      <section class="card" *ngIf="dso as d">
        <div class="ch"><span nz-icon nzType="clock-circle"></span> Recouvrement</div>
        <div class="bignum">{{ d.invoicesAtRisk?.length || 0 }}</div>
        <div class="sub">facture(s) à risque d'impayé</div>
        <div class="rows">
          <div class="r risk" *ngFor="let i of (d.invoicesAtRisk || []).slice(0,4)" nz-tooltip [nzTooltipTitle]="i.client">
            <span>{{ i.label }}</span><span>{{ i.daysOverdue }}j · {{ eur(i.amount) }}</span></div>
        </div>
      </section>

      <!-- Pipeline / win-rate -->
      <section class="card" *ngIf="winrate as w">
        <div class="ch"><span nz-icon nzType="funnel-plot"></span> Pipeline commercial</div>
        <div class="bignum">{{ eur(w.weightedForecast) }}</div>
        <div class="sub">CA pondéré ({{ pct(w.baseWinRate) }} de réussite) · {{ (w.openQuotes||[]).length }} devis ouverts</div>
        <div class="rows">
          <div class="r" *ngFor="let q of (w.openQuotes || []).slice(0,4)"><span>{{ q.label }}</span><span>{{ pct(q.prob) }} · {{ eur(q.amount) }}</span></div>
        </div>
      </section>

      <!-- Churn -->
      <section class="card" *ngIf="churn as ch">
        <div class="ch"><span nz-icon nzType="user-delete"></span> Risque d'attrition</div>
        <div class="bignum warn">{{ atRisk(ch) }}</div>
        <div class="sub">client(s) à risque de churn</div>
        <div class="rows">
          <div class="r risk" *ngFor="let c of (ch.atRisk || []).slice(0,4)" nz-tooltip [nzTooltipTitle]="c.reason">
            <span>{{ c.client }}</span><span>{{ pct(c.score) }}</span></div>
        </div>
      </section>

      <!-- Health score -->
      <section class="card" *ngIf="health as h">
        <div class="ch"><span nz-icon nzType="heart"></span> Santé client (360°)</div>
        <div class="hdist">
          <span class="hpill ok">{{ h.distribution?.sain || 0 }} sains</span>
          <span class="hpill mid">{{ h.distribution?.surveiller || 0 }} à surveiller</span>
          <span class="hpill bad">{{ h.distribution?.risque || 0 }} à risque</span>
        </div>
        <div class="rows">
          <div class="r" *ngFor="let c of (h.clients || []).slice(0,5)">
            <span>{{ c.client }}</span>
            <span><nz-tag [nzColor]="c.health>=70?'green':(c.health>=50?'orange':'red')">{{ c.health }}</nz-tag> {{ c.nextBestAction }}</span></div>
        </div>
      </section>

      <!-- Audit divergences -->
      <section class="card" *ngIf="audit as a">
        <div class="ch"><span nz-icon nzType="alert"></span> Divergences détectées</div>
        <div class="bignum warn">{{ a.counts?.total || 0 }}</div>
        <div class="sub">{{ a.counts?.haute || 0 }} haute(s) priorité</div>
        <div class="rows">
          <div class="r risk" *ngFor="let d of (a.divergences || []).slice(0,5)">
            <span>{{ d.label }}</span><nz-tag [nzColor]="d.severity==='haute'?'red':'orange'">{{ d.type }}</nz-tag></div>
        </div>
      </section>

      <!-- RH -->
      <section class="card" *ngIf="hr?.totals as hrt">
        <div class="ch"><span nz-icon nzType="team"></span> Équipe & charge</div>
        <div class="bignum">{{ hrt.people }}</div>
        <div class="sub">personnes · {{ hrt.hours }}h pointées · {{ hrt.assignedItems }} items</div>
        <div class="rows">
          <div class="r" *ngFor="let p of (hr.people || []).slice(0,4)"><span>{{ p.name }}</span><span>{{ p.openItems }} ouverts · {{ p.hours }}h</span></div>
        </div>
      </section>

      <!-- Calendrier -->
      <section class="card" *ngIf="calendar as cal">
        <div class="ch"><span nz-icon nzType="calendar"></span> Agenda</div>
        <div class="bignum">{{ (cal.events || []).length }}</div>
        <div class="sub">événements · {{ (cal.orphanMeetings || []).length }} sans suite</div>
      </section>
    </div>
  </div>
  `,
  styles: [`
    .pil { padding: 12px; }
    .ptop { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .ptop h3 { margin: 0; display: flex; align-items: center; gap: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .card { border: 1px solid #ececec; border-radius: 12px; padding: 14px 16px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
    .card.big { grid-column: span 1; }
    .ch { font-weight: 600; display: flex; align-items: center; gap: 8px; color: #555; margin-bottom: 8px; }
    .bignum { font-size: 30px; font-weight: 700; color: #e61982; line-height: 1.1; }
    .bignum.neg { color: #cf1322; } .bignum.warn { color: #fa8c16; }
    .sub { font-size: 12px; color: #999; margin-bottom: 6px; }
    .windows { display: flex; gap: 8px; margin-top: 8px; }
    .win { flex: 1; text-align: center; background: #faf7fb; border-radius: 8px; padding: 6px; font-size: 12px; }
    .win b { display: block; color: #888; } .win span { font-weight: 600; color: #2ec27e; } .win span.neg { color: #cf1322; }
    .rows { display: flex; flex-direction: column; gap: 3px; margin-top: 8px; }
    .r { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 3px 0; border-bottom: 1px solid #f6f6f6; }
    .r span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .r span:last-child { color: #666; white-space: nowrap; }
    .r.risk span:first-child { color: #cf1322; }
    .hdist { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0; }
    .hpill { font-size: 12px; border-radius: 10px; padding: 2px 9px; }
    .hpill.ok { background: #e6f9ee; color: #2ec27e; } .hpill.mid { background: #fff4e6; color: #fa8c16; } .hpill.bad { background: #fff1f0; color: #cf1322; }
  `],
})
export class RadarPilotageComponent implements OnInit {
  loading = false;
  margins: any; hr: any; calendar: any; audit: any;
  dso: any; winrate: any; churn: any; cashflow: any; health: any;

  constructor(private radar: RadarBackendService, private acl: AccessControlService, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void { this.loadAll(); }

  eur(n: any): string { return (Math.round(Number(n) || 0)).toLocaleString('fr-FR') + ' €'; }
  pct(n: any): string { return Math.round((Number(n) || 0) * 100) + '%'; }
  typeEntries(o: any): [string, any][] { try { return Object.entries(o || {}); } catch { return []; } }
  atRisk(ch: any): number { return ch?.summary?.clientsAtRisk ?? (ch?.atRisk || []).filter((c: any) => c.score >= 0.4).length; }

  loadAll(): void {
    const ws = this.acl.currentWorkspaceId(); if (!ws) return;
    this.loading = true;
    const done = () => { this.cdr.markForCheck(); };
    const calls: [string, any][] = [
      ['margins', this.radar.getMargins(ws)], ['hr', this.radar.getHR(ws)], ['calendar', this.radar.getCalendar(ws)],
      ['audit', this.radar.getAudit(ws)], ['dso', this.radar.getDso(ws)], ['winrate', this.radar.getWinrate(ws)],
      ['churn', this.radar.getChurn(ws)], ['cashflow', this.radar.getCashflow(ws)], ['health', this.radar.getHealth(ws)],
    ];
    let pending = calls.length;
    for (const [key, obs] of calls) {
      obs.subscribe({
        next: (r: any) => { (this as any)[key] = r; if (--pending === 0) this.loading = false; done(); },
        error: () => { if (--pending === 0) this.loading = false; done(); },
      });
    }
  }
}
