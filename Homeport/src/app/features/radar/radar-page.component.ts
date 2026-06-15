import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { RadarChatService } from './radar-chat.service';
import { NzButtonModule } from 'ng-zorro-antd/button';

// Section Radar d'entreprise — shell au style standard de l'app.
// L'onglet actif est porté par ?tab= : il survit au refresh et est partageable.

const TABS = ['dashboard', 'activite', 'agenda', 'connecteurs', 'savoir', 'procedures'];

@Component({
  selector: 'radar-page',
  standalone: true,
  imports: [
    CommonModule, NzTabsModule, NzIconModule,
    RadarBoardComponent, RadarActivityComponent, RadarConnectorsComponent,
    RadarKnowledgeComponent, RadarPlaybooksComponent, RadarChatDrawerComponent, RadarAgendaComponent,
    NzButtonModule,
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

      <nz-tabset [nzSelectedIndex]="selectedIndex" (nzSelectedIndexChange)="onTabChange($event)">
        <nz-tab nzTitle="Dashboard">
          <ng-template nz-tab><radar-board></radar-board></ng-template>
        </nz-tab>
        <nz-tab nzTitle="Activité">
          <ng-template nz-tab><radar-activity></radar-activity></ng-template>
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
    @media (max-width: 768px) {
      .radar-page { padding: 8px; }
      .header-left h2 { font-size: 18px; }
    }
  `],
})
export class RadarPageComponent implements OnInit, OnDestroy {
  selectedIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private radarEvents: RadarEventsService,
    private acl: AccessControlService,
    private chatSvc: RadarChatService,
  ) {}

  openChat(): void { this.chatSvc.open(); }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      const idx = tab ? TABS.indexOf(tab) : 0;
      this.selectedIndex = idx >= 0 ? idx : 0;
    });
    // Flux temps réel du workspace courant (missions, signaux, board…)
    const wsId = this.acl.currentWorkspaceId();
    if (wsId) this.radarEvents.connect(wsId);
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
