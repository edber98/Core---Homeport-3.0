import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RadarEventsService } from '../../services/radar-events.service';
import { AccessControlService } from '../../services/access-control.service';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { RadarBoardComponent } from './radar-board.component';
import { RadarActivityComponent } from './radar-activity.component';
import { RadarConnectorsComponent } from './radar-connectors.component';
import { RadarKnowledgeComponent } from './radar-knowledge.component';
import { RadarPlaybooksComponent } from './radar-playbooks.component';
import { RadarAgendaComponent } from './radar-agenda.component';
import { RadarChatDrawerComponent } from './radar-chat-drawer.component';
import { RadarGraphComponent } from './radar-graph.component';
import { RadarDataComponent } from './radar-data.component';
import { RadarProcessComponent } from './radar-process.component';
import { RadarAnalyseComponent } from './radar-analyse.component';
import { RadarDocumentsComponent } from './radar-documents.component';
import { RadarDictionaryComponent } from './radar-dictionary.component';
import { RadarPilotageComponent } from './radar-pilotage.component';
import { RadarChatService } from './radar-chat.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { RadarBackendService, RadarCompanyContext } from '../../services/radar-backend.service';

// Section Radar d'entreprise — shell au style standard de l'app.
// L'onglet actif est porté par ?tab= : il survit au refresh et est partageable.

const TABS = ['dashboard', 'pilotage', 'activite', 'memoire', 'dictionnaire', 'donnees', 'processus', 'analyse', 'documents', 'agenda', 'connecteurs', 'savoir', 'procedures'];

@Component({
  selector: 'radar-page',
  standalone: true,
  imports: [
    CommonModule, NzTabsModule, NzIconModule,
    RadarBoardComponent, RadarActivityComponent, RadarConnectorsComponent,
    RadarKnowledgeComponent, RadarPlaybooksComponent, RadarChatDrawerComponent, RadarAgendaComponent,
    RadarGraphComponent, RadarDataComponent, RadarProcessComponent, RadarAnalyseComponent, RadarDocumentsComponent, RadarDictionaryComponent, RadarPilotageComponent,
    NzButtonModule, FormsModule, NzInputModule, NzTagModule,
  ],
  template: `
  <div class="radar-page">
    <div class="container">
      <div class="page-header">
        <div class="header-left">
          <h2><span nz-icon nzType="radar-chart" nzTheme="outline"></span> Radar d'entreprise</h2>
          <span class="subtitle">Votre superviseur surveille les logiciels connectés, prépare le travail et apprend vos méthodes.</span>
        </div>
        <button nz-button nzType="primary" class="talk-btn" (click)="openChat()">
          <span nz-icon nzType="message"></span> Parler au radar
        </button>
      </div>

      <!-- Contexte entreprise : demandé au 1er accès pour que le cerveau comprenne le métier -->
      <div class="ctx-setup" *ngIf="ctxNeedsSetup">
        <div class="ctx-head"><span nz-icon nzType="bulb"></span> Décrivez votre activité</div>
        <p>Pour que le Radar comprenne votre métier (industrie & capteurs, expert-comptable, informatique…), charge les bons modules et nomme vos processus, décrivez en quelques phrases ce que fait votre entreprise.</p>
        <textarea nz-input [(ngModel)]="ctxDraft" rows="3" placeholder="Ex : usine de cartonnage, production sur commande, beaucoup de maintenance machine et de suivi de trésorerie."></textarea>
        <button nz-button nzType="primary" [nzLoading]="ctxSaving" [disabled]="!ctxDraft.trim()" (click)="saveContext()">Analyser mon activité</button>
      </div>
      <div class="ctx-summary" *ngIf="context && !ctxNeedsSetup">
        <span nz-icon nzType="bulb" class="ic"></span>
        <span class="csum">{{ context.summary || context.description }}</span>
        <nz-tag *ngIf="context.sector" nzColor="blue">{{ context.sector }}</nz-tag>
        <nz-tag *ngFor="let m of (context.keyMetrics || []).slice(0,4)" nzColor="default">{{ m }}</nz-tag>
        <button nz-button nzType="link" nzSize="small" (click)="ctxNeedsSetup = true; ctxDraft = context.description">Modifier</button>
        <button nz-button nzType="link" nzSize="small" (click)="toggleUsages()">
          <span nz-icon nzType="api"></span> Logiciels ({{ usageRows.length }})</button>
      </div>

      <!-- CE QU'ON FAIT SUR CHAQUE LOGICIEL — relie le contexte entreprise aux connecteurs.
           Injecté dans le cerveau : l'IA sait à quoi sert chaque outil dans CETTE entreprise. -->
      <div class="ctx-usages" *ngIf="usagesOpen && context && !ctxNeedsSetup">
        <div class="cu-row" *ngFor="let u of usageRows">
          <span class="cu-prov"><span nz-icon nzType="api"></span> {{ u.providerKey }}</span>
          <input nz-input nzSize="small" [(ngModel)]="u.usage"
                 placeholder="Ce qu'on fait sur ce logiciel (ex : devis, factures, stock…)" />
        </div>
        <div class="cu-actions">
          <button nz-button nzType="primary" nzSize="small" [nzLoading]="usagesSaving" (click)="saveUsages()">Enregistrer</button>
          <span class="cu-hint">Ces descriptions sont injectées dans le cerveau (réponses IA, mapping, processus).</span>
        </div>
      </div>

      <nz-tabset [nzSelectedIndex]="selectedIndex" (nzSelectedIndexChange)="onTabChange($event)">
        <nz-tab nzTitle="Dashboard">
          <ng-template nz-tab><radar-board></radar-board></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Pilotage">
          <ng-template nz-tab><radar-pilotage></radar-pilotage></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Activité">
          <ng-template nz-tab><radar-activity></radar-activity></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Mémoire">
          <ng-template nz-tab><radar-graph></radar-graph></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Dictionnaire">
          <ng-template nz-tab><radar-dictionary></radar-dictionary></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Données">
          <ng-template nz-tab><radar-data></radar-data></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Processus">
          <ng-template nz-tab><radar-process></radar-process></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Analyse">
          <ng-template nz-tab><radar-analyse></radar-analyse></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Documents">
          <ng-template nz-tab><radar-documents></radar-documents></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Agenda">
          <ng-template nz-tab><radar-agenda></radar-agenda></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Connecteurs">
          <ng-template nz-tab><radar-connectors></radar-connectors></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Savoir">
          <ng-template nz-tab><radar-knowledge></radar-knowledge></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Procédures">
          <ng-template nz-tab><radar-playbooks></radar-playbooks></ng-template>
        </nz-tab>
      </nz-tabset>
    </div>
    <radar-chat-drawer></radar-chat-drawer>
  </div>
  `,
  styles: [`
    .radar-page { padding: 16px 24px; height: 100%; overflow-y: auto; }
    .container { width: 100%; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 12px; }
    .header-left h2 { margin: 0; font-size: 24px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
    .header-left .subtitle { color: #8c8c8c; font-size: 13px; }
    .talk-btn { background:#e61982; border-color:#e61982; }
    .ctx-setup { background:#fffbe6; border:1px solid #ffe58f; border-radius:10px; padding:14px 16px; margin-bottom:14px; }
    .ctx-setup .ctx-head { font-weight:600; margin-bottom:4px; }
    .ctx-setup p { color:#8c6d1f; font-size:13px; margin:0 0 8px; }
    .ctx-setup textarea { margin-bottom:8px; }
    .ctx-summary { display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:#f6ffed; border:1px solid #b7eb8f; border-radius:8px; padding:6px 12px; margin-bottom:12px; font-size:13px; }
    .ctx-summary .ic { color:#52c41a; } .ctx-summary .csum { color:#555; }
    .ctx-usages { background:#fafafa; border:1px solid #eee; border-radius:8px; padding:10px 12px; margin:-6px 0 12px; display:flex; flex-direction:column; gap:6px; }
    .cu-row { display:grid; grid-template-columns: 170px 1fr; gap:10px; align-items:center; }
    .cu-prov { font-size:13px; font-weight:500; color:#555; display:flex; align-items:center; gap:6px; }
    .cu-actions { display:flex; align-items:center; gap:10px; margin-top:4px; }
    .cu-hint { font-size:12px; color:#999; }
    @media (max-width: 768px) {
      .radar-page { padding: 8px; }
      .header-left h2 { font-size: 18px; }
    }
  `],
})
export class RadarPageComponent implements OnInit, OnDestroy {
  selectedIndex = 0;
  context: RadarCompanyContext | null = null;
  ctxNeedsSetup = false;
  ctxDraft = '';
  ctxSaving = false;
  // usages par logiciel (contexte ↔ connecteurs)
  usagesOpen = false;
  usagesSaving = false;
  usageRows: { providerKey: string; usage: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private radarEvents: RadarEventsService,
    private acl: AccessControlService,
    private chatSvc: RadarChatService,
    private radar: RadarBackendService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  openChat(): void { this.chatSvc.open(); }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      const idx = tab ? TABS.indexOf(tab) : 0;
      this.selectedIndex = idx >= 0 ? idx : 0;
    });
    const wsId = this.acl.currentWorkspaceId();
    if (wsId) {
      this.radarEvents.connect(wsId);
      this.radar.getContext(wsId).subscribe({
        next: r => this.zone.run(() => { this.context = r.context; this.ctxNeedsSetup = r.needsSetup; this.cdr.markForCheck(); }),
        error: () => {},
      });
    }
  }

  saveContext(): void {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId || !this.ctxDraft.trim()) return;
    this.ctxSaving = true;
    this.radar.saveContext(wsId, this.ctxDraft.trim()).subscribe({
      next: r => this.zone.run(() => { this.context = r.context; this.ctxNeedsSetup = false; this.ctxSaving = false; this.cdr.markForCheck(); }),
      error: () => this.zone.run(() => { this.ctxSaving = false; this.cdr.markForCheck(); }),
    });
  }

  // Ouvre le panneau « logiciels » : fusionne les connecteurs réels avec les usages saisis.
  toggleUsages(): void {
    this.usagesOpen = !this.usagesOpen;
    if (!this.usagesOpen) return;
    const wsId = this.acl.currentWorkspaceId(); if (!wsId) return;
    this.radar.listConnectors(wsId).subscribe({
      next: (connectors) => this.zone.run(() => {
        const saved = new Map((this.context?.connectorUsages || []).map(u => [u.providerKey, u.usage]));
        const providers = [...new Set((connectors || []).map((c: any) => c.providerKey).filter(Boolean))] as string[];
        this.usageRows = providers.map(p => ({ providerKey: p, usage: saved.get(p) || '' }));
        // garde aussi les usages saisis pour des logiciels déconnectés (ne pas les perdre)
        for (const [p, usage] of saved) if (!providers.includes(p)) this.usageRows.push({ providerKey: p, usage });
        this.cdr.markForCheck();
      }),
      error: () => {},
    });
  }

  saveUsages(): void {
    const wsId = this.acl.currentWorkspaceId(); if (!wsId) return;
    this.usagesSaving = true;
    this.radar.saveContextUsages(wsId, this.usageRows).subscribe({
      next: r => this.zone.run(() => { this.context = r.context; this.usagesSaving = false; this.cdr.markForCheck(); }),
      error: () => this.zone.run(() => { this.usagesSaving = false; this.cdr.markForCheck(); }),
    });
  }

  ngOnDestroy(): void { this.radarEvents.disconnect(); }

  onTabChange(index: number): void {
    this.selectedIndex = index;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: TABS[index] === 'dashboard' ? null : TABS[index] },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
