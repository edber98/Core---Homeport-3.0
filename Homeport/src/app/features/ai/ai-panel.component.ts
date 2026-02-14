import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AiService, AiThread } from './ai.service';
import { AiChatComponent } from './ai-chat.component';

@Component({
  selector: 'ai-panel',
  standalone: true,
  imports: [CommonModule, NzDrawerModule, NzButtonModule, NzIconModule, NzDropDownModule, NzMenuModule, NzListModule, NzEmptyModule, NzToolTipModule, AiChatComponent],
  template: `
    <nz-drawer
      [nzVisible]="ai.drawerOpen()"
      (nzOnClose)="ai.closeDrawer()"
      [nzWidth]="460"
      nzPlacement="right"
      [nzClosable]="false"
      [nzBodyStyle]="{ padding: 0 }">

      <ng-container *nzDrawerContent>
        <div class="panel-wrapper">
          <!-- Header -->
          <div class="panel-header">
            <div class="header-left">
              <span nz-icon nzType="robot" nzTheme="outline" class="ai-icon"></span>
              <span class="title" *ngIf="!showHistory">
                {{ ai.currentThread()?.title || 'Assistant IA' }}
              </span>
              <span class="title" *ngIf="showHistory">Historique</span>
            </div>
            <div class="header-right">
              <button nz-button nzType="text" nzSize="small" nz-tooltip nzTooltipTitle="Historique" (click)="toggleHistory()">
                <span nz-icon nzType="history" nzTheme="outline"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" nz-tooltip nzTooltipTitle="Nouvelle conversation" (click)="newThread()">
                <span nz-icon nzType="plus" nzTheme="outline"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" (click)="ai.closeDrawer()">
                <span nz-icon nzType="close" nzTheme="outline"></span>
              </button>
            </div>
          </div>

          <!-- Thread list (history) -->
          <div class="thread-list" *ngIf="showHistory">
            <div *ngIf="threads.length === 0" class="empty-history">
              <nz-empty nzNotFoundContent="Aucune conversation"></nz-empty>
            </div>
            <div class="thread-item" *ngFor="let t of threads" (click)="openThread(t)" [class.active]="t._id === ai.currentThread()?._id">
              <div class="thread-title">{{ t.title }}</div>
              <div class="thread-meta">
                <span class="mode-badge">{{ modeLabel(t.mode) }}</span>
                <span class="date">{{ t.updatedAt | date:'short' }}</span>
              </div>
            </div>
          </div>

          <!-- Chat -->
          <ai-chat *ngIf="!showHistory" class="chat-area"></ai-chat>
        </div>
      </ng-container>
    </nz-drawer>
  `,
  styles: [`
    .panel-wrapper { display: flex; flex-direction: column; height: 100%; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #f0f0f0; background: #fafafa; flex-shrink: 0; }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .header-right { display: flex; align-items: center; gap: 2px; }
    .ai-icon { font-size: 18px; color: #1677ff; }
    .title { font-weight: 600; font-size: 15px; }
    .thread-list { flex: 1; overflow-y: auto; padding: 8px; }
    .thread-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; }
    .thread-item:hover { background: #f5f5f5; }
    .thread-item.active { background: #e6f4ff; }
    .thread-title { font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .thread-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 12px; color: #999; }
    .mode-badge { background: #f0f0f0; padding: 0 6px; border-radius: 3px; font-size: 11px; text-transform: uppercase; }
    .empty-history { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; }
    .chat-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
  `]
})
export class AiPanelComponent {
  showHistory = false;
  threads: AiThread[] = [];

  constructor(public ai: AiService, private cdr: ChangeDetectorRef) {}

  toggleHistory() {
    this.showHistory = !this.showHistory;
    if (this.showHistory) this.loadThreads();
  }

  loadThreads() {
    this.ai.listThreads().subscribe({
      next: (res: any) => {
        this.threads = res?.data || res || [];
        this.cdr.detectChanges();
      },
      error: () => { this.threads = []; },
    });
  }

  async openThread(thread: AiThread) {
    await this.ai.loadThread(thread.id || thread._id);
    this.showHistory = false;
    this.cdr.detectChanges();
  }

  async newThread() {
    await this.ai.createThread('chat');
    this.showHistory = false;
    this.cdr.detectChanges();
  }

  modeLabel(mode: string): string {
    switch (mode) {
      case 'chat': return 'Chat';
      case 'workflow': return 'Workflow';
      case 'node_args': return 'Args';
      case 'form': return 'Formulaire';
      default: return mode;
    }
  }
}
