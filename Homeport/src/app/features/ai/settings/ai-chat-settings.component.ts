import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService } from '../ai.service';

@Component({
  selector: 'ai-chat-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzIconModule, NzSelectModule, NzCheckboxModule, NzDividerModule,
  ],
  template: `
    <div class="cs-wrap">
      <div class="cs-title">Paramètres de cette conversation</div>
      <nz-divider style="margin: 8px 0"></nz-divider>

      <div class="field">
        <label>Autonomie</label>
        <nz-select [(ngModel)]="autonomy" (ngModelChange)="save()" nzSize="small" style="width:100%">
          <nz-option nzValue="prudent" nzLabel="Prudent"></nz-option>
          <nz-option nzValue="balanced" nzLabel="Équilibré"></nz-option>
          <nz-option nzValue="autonomous" nzLabel="Autonome"></nz-option>
        </nz-select>
      </div>

      <label nz-checkbox [(ngModel)]="autoOpenCanvas" (ngModelChange)="save()">Ouvrir canvas auto</label>
      <label nz-checkbox [(ngModel)]="keepCacheAfterClose" (ngModelChange)="save()">Garder cache à la fermeture</label>

      <div class="cs-actions">
        <button nz-button nzSize="small" (click)="reset()">
          <span nz-icon nzType="undo" nzTheme="outline"></span> Réinitialiser
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cs-wrap { padding: 10px; min-width: 260px; }
    .cs-title { font-size: 12px; font-weight: 600; color: #555; }
    .field { margin: 8px 0; }
    .field label { display: block; font-size: 11px; color: #999; margin-bottom: 3px; }
    label[nz-checkbox] { display: block; margin: 6px 0; font-size: 12px; }
    .cs-actions { margin-top: 10px; display: flex; justify-content: flex-end; }
  `],
})
export class AiChatSettingsComponent implements OnInit {
  @Input() threadId!: string;
  public ai = inject(AiService);
  private nzMsg = inject(NzMessageService);

  autonomy: 'prudent' | 'balanced' | 'autonomous' = 'autonomous';
  autoOpenCanvas = true;
  keepCacheAfterClose = false;

  ngOnInit() {
    if (!this.threadId) return;
    this.ai.getThreadPreferences(this.threadId).subscribe({
      next: (p: any) => {
        if (p?.defaultAutonomyLevel) this.autonomy = p.defaultAutonomyLevel;
        if (p?.canvasBehavior?.autoOpenOnDocument !== undefined) this.autoOpenCanvas = !!p.canvasBehavior.autoOpenOnDocument;
        if (p?.cacheBehavior?.keepCacheAfterClose !== undefined) this.keepCacheAfterClose = !!p.cacheBehavior.keepCacheAfterClose;
      },
      error: () => {},
    });
  }

  save() {
    if (!this.threadId) return;
    this.ai.updateThreadPreferences(this.threadId, {
      defaultAutonomyLevel: this.autonomy,
      canvasBehavior: {
        autoOpenOnDocument: this.autoOpenCanvas,
        autoOpenOnResearch: this.autoOpenCanvas,
        autoOpenOnProjectMode: this.autoOpenCanvas,
        defaultTab: 'document',
      },
      cacheBehavior: {
        autoSyncOnIdle: true,
        idleTtlHours: 24,
        askBeforeSync: true,
        askBeforeCleanup: true,
        keepCacheAfterClose: this.keepCacheAfterClose,
      },
    } as any).subscribe({
      error: (e: any) => this.nzMsg.error(e?.message || 'Erreur'),
    });
  }

  reset() {
    if (!this.threadId) return;
    this.ai.resetThreadPreferences(this.threadId).subscribe({
      next: () => this.nzMsg.success('Réinitialisé'),
      error: (e: any) => this.nzMsg.error(e?.message || 'Erreur'),
    });
  }
}
