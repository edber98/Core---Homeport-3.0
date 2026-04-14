import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AiCacheSyncRequest } from '../ai.service';

@Component({
  selector: 'ai-cache-sync-request-card',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule],
  template: `
    <div class="cs-card" [class.disabled]="!!request.answer">
      <div class="cs-header">
        <span nz-icon nzType="cloud-sync" nzTheme="outline"></span>
        <span class="cs-title">Synchronisation du cache</span>
        <nz-tag nzColor="blue">{{ request.pendingFiles?.length || 0 }} fichier(s)</nz-tag>
      </div>
      <div class="cs-desc">
        Le cache local contient des modifications non synchronisées
        <span *ngIf="request.sizeBytes">({{ formatSize(request.sizeBytes) }})</span>.
        Que souhaitez-vous faire&nbsp;?
      </div>

      <ul class="files-list" *ngIf="request.pendingFiles?.length">
        <li *ngFor="let f of request.pendingFiles.slice(0, 5)">
          <span nz-icon nzType="file" nzTheme="outline"></span>
          <span class="file-name">{{ f.name || f.path }}</span>
          <span class="file-size" *ngIf="f.size">{{ formatSize(f.size) }}</span>
        </li>
        <li *ngIf="request.pendingFiles.length > 5" class="more">… et {{ request.pendingFiles.length - 5 }} de plus</li>
      </ul>

      <div class="cs-actions" *ngIf="!request.answer">
        <button nz-button nzType="primary" nzSize="small" (click)="answer('sync_and_cleanup')">
          <span nz-icon nzType="cloud-upload" nzTheme="outline"></span> Synchroniser + nettoyer
        </button>
        <button nz-button nzSize="small" (click)="answer('cleanup_only')">
          <span nz-icon nzType="delete" nzTheme="outline"></span> Nettoyer sans synchroniser
        </button>
        <button nz-button nzSize="small" (click)="answer('keep_24h')">
          <span nz-icon nzType="clock-circle" nzTheme="outline"></span> Garder 24h de plus
        </button>
      </div>

      <div class="answered-badge" *ngIf="request.answer">
        <nz-tag nzColor="green">
          <span nz-icon nzType="check-circle" nzTheme="outline"></span>
          {{ answerLabel() }}
        </nz-tag>
      </div>
    </div>
  `,
  styles: [`
    .cs-card { background: #fff; border: 1px solid #f0f0f0; border-left: 3px solid #1677ff; border-radius: 10px; padding: 12px 14px; margin: 6px 0; }
    .cs-card.disabled { opacity: 0.75; }
    .cs-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #333; }
    .cs-header span[nz-icon]:first-child { color: #1677ff; font-size: 16px; }
    .cs-title { flex: 1; }
    .cs-desc { font-size: 12px; color: #666; margin-bottom: 8px; line-height: 1.5; }
    .files-list { list-style: none; padding: 0; margin: 0 0 8px; font-size: 11px; color: #666; max-height: 120px; overflow: auto; }
    .files-list li { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
    .file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-size { color: #bbb; font-size: 10px; }
    .files-list .more { color: #bbb; font-style: italic; padding-top: 2px; }
    .cs-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .answered-badge { margin-top: 6px; }
  `],
})
export class AiCacheSyncRequestCardComponent {
  @Input() request!: AiCacheSyncRequest;
  @Output() answered = new EventEmitter<{ decision: string }>();

  answer(decision: string) {
    if (this.request?.answer) return;
    this.answered.emit({ decision });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  }

  answerLabel(): string {
    const map: Record<string, string> = {
      sync_and_cleanup: 'Synchronisé et nettoyé',
      cleanup_only: 'Nettoyé sans synchroniser',
      keep_24h: 'Conservé 24h supplémentaires',
    };
    return map[this.request.answer || ''] || 'Répondu';
  }
}
