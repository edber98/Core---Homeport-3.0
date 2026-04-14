import { Component, Input, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { Subscription } from 'rxjs';
import { AiService } from '../ai.service';
import { AiCanvasDocumentComponent } from './ai-canvas-document.component';
import { AiCanvasResearchComponent } from './ai-canvas-research.component';
import { AiCanvasTasksComponent } from './ai-canvas-tasks.component';
import { AiCanvasFilesComponent } from './ai-canvas-files.component';

@Component({
  selector: 'ai-canvas-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NzTabsModule, NzButtonModule, NzIconModule, NzToolTipModule, NzBadgeModule,
    AiCanvasDocumentComponent, AiCanvasResearchComponent, AiCanvasTasksComponent, AiCanvasFilesComponent,
  ],
  template: `
    <div class="canvas-panel">
      <div class="canvas-header">
        <div class="canvas-tabs-wrap">
          <div class="canvas-tabs">
            <button *ngIf="showDocumentTab()" class="ctab" [class.active]="activeTab === 'document'" (click)="setTab('document')">
              <span nz-icon nzType="file-text" nzTheme="outline"></span>
              <span>Document</span>
            </button>
            <button *ngIf="showResearchTab()" class="ctab" [class.active]="activeTab === 'research'" (click)="setTab('research')">
              <span nz-icon nzType="search" nzTheme="outline"></span>
              <span>Recherche</span>
              <nz-badge *ngIf="researchCount()" [nzCount]="researchCount()" [nzOverflowCount]="9" nzSize="small"></nz-badge>
            </button>
            <button *ngIf="showTasksTab()" class="ctab" [class.active]="activeTab === 'tasks'" (click)="setTab('tasks')">
              <span nz-icon nzType="ordered-list" nzTheme="outline"></span>
              <span>Tâches</span>
              <nz-badge *ngIf="tasksCount()" [nzCount]="tasksCount()" [nzOverflowCount]="9" nzSize="small"></nz-badge>
            </button>
            <button *ngIf="showFilesTab()" class="ctab" [class.active]="activeTab === 'files'" (click)="setTab('files')">
              <span nz-icon nzType="folder" nzTheme="outline"></span>
              <span>Fichiers</span>
            </button>
          </div>
        </div>
        <div class="canvas-controls">
          <button nz-button nzType="text" nzSize="small" (click)="togglePin()"
            nz-tooltip [nzTooltipTitle]="ai.canvasPinned() ? 'Détacher' : 'Épingler'">
            <span nz-icon [nzType]="ai.canvasPinned() ? 'pushpin' : 'pushpin'" [nzTheme]="ai.canvasPinned() ? 'fill' : 'outline'"></span>
          </button>
          <button nz-button nzType="text" nzSize="small" (click)="close()" nz-tooltip nzTooltipTitle="Fermer">
            <span nz-icon nzType="close" nzTheme="outline"></span>
          </button>
        </div>
      </div>
      <div class="canvas-body">
        <ai-canvas-document *ngIf="activeTab === 'document'" [threadId]="threadId"></ai-canvas-document>
        <ai-canvas-research *ngIf="activeTab === 'research'" [threadId]="threadId"></ai-canvas-research>
        <ai-canvas-tasks *ngIf="activeTab === 'tasks'" [threadId]="threadId" (answerPermission)="onAnswerPermission($event)"></ai-canvas-tasks>
        <ai-canvas-files *ngIf="activeTab === 'files'" [threadId]="threadId"></ai-canvas-files>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; background: #fff; }
    .canvas-panel { display: flex; flex-direction: column; height: 100%; min-width: 0; }
    .canvas-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-bottom: 1px solid #f0f0f0; background: #fafafa; gap: 8px; flex-shrink: 0; }
    .canvas-tabs-wrap { flex: 1; min-width: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -ms-overflow-style: none; }
    .canvas-tabs-wrap::-webkit-scrollbar { display: none; height: 0; width: 0; }
    .canvas-tabs { display: flex; gap: 4px; }
    .ctab { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border: none; background: transparent; border-radius: 6px; font-size: 13px; color: #666; cursor: pointer; transition: all .15s; white-space: nowrap; }
    .ctab:hover { background: rgba(230, 25, 130, 0.06); color: #e61982; }
    .ctab.active { background: #fff; color: #e61982; box-shadow: 0 1px 3px rgba(0,0,0,0.08); font-weight: 500; }
    .canvas-controls { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
    .canvas-body { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
    @media (max-width: 640px) {
      .ctab { padding: 6px 8px; font-size: 12px; }
      .canvas-header { padding: 4px 6px; }
    }
  `],
})
export class AiCanvasPanelComponent implements OnInit, OnDestroy {
  @Input() threadId!: string;
  public ai = inject(AiService);

  activeTab: 'document' | 'research' | 'tasks' | 'files' = 'document';
  private sub?: Subscription;

  researchCount = computed(() => this.ai.canvasState()?.research?.steps?.length || 0);
  tasksCount = computed(() => this.ai.canvasState()?.tasks?.length || 0);

  // Visibilité des onglets selon le mode du thread + activité
  // - Mode projet : tous les onglets
  // - Chat classique : seuls les onglets PERTINENTS (ceux qui ont du contenu)
  showDocumentTab = computed(() => {
    if (this.isProject()) return true;
    return !!this.ai.canvasState()?.document?.previewHtml;
  });
  showResearchTab = computed(() => {
    if (this.isProject()) return true;
    return (this.ai.canvasState()?.research?.steps?.length || 0) > 0;
  });
  showTasksTab = computed(() => {
    if (this.isProject()) return true;
    return (this.ai.canvasState()?.tasks?.length || 0) > 0;
  });
  // Fichiers toujours visible : en projet = fichiers distant + chat ; en chat = fichiers partagés dans le thread
  showFilesTab = computed(() => true);

  private isProject(): boolean {
    return this.ai.currentThread()?.mode === 'project';
  }

  constructor() {
    // Effect unifié : sélectionne l'onglet actif selon state serveur + onglets visibles.
    // Priorité : research (si steps) > document (si preview) > tasks > files.
    // L'état serveur activeTab est respecté UNIQUEMENT si l'onglet est encore visible.
    effect(() => {
      const state = this.ai.canvasState();
      const visible = this.visibleTabs();
      if (!visible.length) return;

      const serverTab = state?.activeTab as ('document' | 'research' | 'tasks' | 'files' | undefined);
      const currentIsVisible = visible.includes(this.activeTab);
      const serverTabVisible = serverTab && visible.includes(serverTab);

      // 1. Si le server a un tab valide et visible → priorité serveur
      if (serverTabVisible && serverTab !== this.activeTab) {
        this.activeTab = serverTab!;
        return;
      }
      // 2. Si l'actuel est toujours visible → on reste
      if (currentIsVisible) return;
      // 3. Sinon, choisir par priorité
      const priority: Array<'research' | 'document' | 'tasks' | 'files'> = ['research', 'document', 'tasks', 'files'];
      const next = priority.find(t => visible.includes(t)) || visible[0];
      this.activeTab = next;
      this.ai.setCanvasTab(next);
    });
  }

  private visibleTabs(): Array<'document' | 'research' | 'tasks' | 'files'> {
    const tabs: Array<'document' | 'research' | 'tasks' | 'files'> = [];
    if (this.showDocumentTab()) tabs.push('document');
    if (this.showResearchTab()) tabs.push('research');
    if (this.showTasksTab()) tabs.push('tasks');
    if (this.showFilesTab()) tabs.push('files');
    return tabs;
  }

  ngOnInit() {
    if (this.threadId) this.ai.loadCanvas(this.threadId);
    // L'effect du constructor gère la sélection automatique dès que canvasState/visibleTabs changent.
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  setTab(tab: 'document' | 'research' | 'tasks' | 'files') {
    this.activeTab = tab;
    this.ai.setCanvasTab(tab);
  }

  togglePin() { this.ai.togglePinCanvas(); }
  close() { this.ai.closeCanvas(); }

  onAnswerPermission(evt: { taskId: string; jobId: string }) {
    // Tasks component already scrolls to permission card; nothing to do here
  }
}
