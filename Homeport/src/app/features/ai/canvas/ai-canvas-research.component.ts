import { Component, Input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService } from '../ai.service';

@Component({
  selector: 'ai-canvas-research',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzEmptyModule, NzToolTipModule],
  template: `
    <div class="res-wrap" *ngIf="research()?.steps?.length; else empty">
      <div class="res-header" *ngIf="research()?.query">
        <span nz-icon nzType="search" nzTheme="outline"></span>
        <strong>{{ research()?.query }}</strong>
      </div>
      <div class="timeline">
        <div *ngFor="let step of research()?.steps; let i = index" class="step" [class]="'status-' + step.status">
          <div class="step-dot">
            <span nz-icon [nzType]="stepIcon(step)" nzTheme="outline" [nzSpin]="step.status === 'running'"></span>
          </div>
          <div class="step-line" *ngIf="i < (research()?.steps?.length || 0) - 1"></div>
          <div class="step-body">
            <div class="step-title">
              <span class="step-title-text" [nz-tooltip]="step.title || ''">{{ step.title || stepTypeLabel(step.type) }}</span>
              <span class="step-type">{{ stepTypeLabel(step.type) }}</span>
            </div>
            <a *ngIf="step.url" [href]="step.url" target="_blank" class="step-url" [nz-tooltip]="step.url">
              <span class="step-url-text">{{ step.url }}</span>
              <button nz-button nzType="text" nzSize="small" class="copy-btn" (click)="copyUrl($event, step.url!)">
                <span nz-icon nzType="copy" nzTheme="outline"></span>
              </button>
            </a>
            <div class="step-snippet" *ngIf="step.snippet">{{ asText(step.snippet) }}</div>
            <pre class="step-preview" *ngIf="step.resultPreview">{{ asText(step.resultPreview) }}</pre>
          </div>
        </div>
      </div>
    </div>
    <ng-template #empty>
      <div class="res-empty">
        <nz-empty nzNotFoundContent="Aucune recherche en cours"></nz-empty>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; overflow: auto; }
    .res-wrap { padding: 12px 16px; }
    .res-header { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: #f6ffed; border-left: 3px solid #52c41a; border-radius: 4px; margin-bottom: 12px; font-size: 13px; }
    .timeline { position: relative; }
    .step { position: relative; display: grid; grid-template-columns: 28px 1fr; gap: 10px; padding-bottom: 12px; }
    .step-dot { grid-column: 1; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #999; font-size: 14px; z-index: 1; }
    .step.status-running .step-dot { background: #e6f4ff; color: #1677ff; animation: pulse 1.5s infinite; }
    .step.status-done .step-dot { background: #f6ffed; color: #52c41a; }
    .step.status-error .step-dot { background: #fff2f0; color: #ff4d4f; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .step-line { position: absolute; left: 13px; top: 28px; bottom: -4px; width: 2px; background: #f0f0f0; }
    .step-body { grid-column: 2; min-width: 0; padding-top: 2px; overflow: hidden; }
    .step-title { display: flex; align-items: baseline; gap: 8px; font-size: 13px; font-weight: 500; color: #333; min-width: 0; }
    .step-title-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .step-type { font-size: 10px; color: #999; background: #f5f5f5; padding: 1px 6px; border-radius: 3px; text-transform: uppercase; flex-shrink: 0; }
    .step-url { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #1677ff; margin: 3px 0; max-width: 100%; min-width: 0; text-decoration: none; }
    .step-url-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .step-url:hover .step-url-text { text-decoration: underline; }
    .step-url .copy-btn { flex-shrink: 0; padding: 0 4px; height: 20px; line-height: 20px; }
    .step-snippet { font-size: 12px; color: #666; margin-top: 3px; line-height: 1.5; overflow-wrap: anywhere; }
    .step-preview { font-size: 11px; color: #555; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 4px; padding: 6px 8px; margin-top: 4px; max-height: 160px; overflow: auto; }
    .res-empty { display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px; }
  `],
})
export class AiCanvasResearchComponent {
  @Input() threadId!: string;
  public ai = inject(AiService);
  private nzMsg = inject(NzMessageService);

  research = computed(() => this.ai.canvasState()?.research);

  stepIcon(step: any) {
    if (step.status === 'running') return 'loading';
    if (step.status === 'error') return 'close-circle';
    if (step.type === 'search') return 'search';
    if (step.type === 'fetch') return 'global';
    if (step.type === 'synth') return 'bulb';
    return 'check-circle';
  }

  stepTypeLabel(type: string) {
    const map: Record<string, string> = { search: 'Recherche', fetch: 'Téléchargement', synth: 'Synthèse' };
    return map[type] || type;
  }

  /** Rend proprement un snippet/preview qui peut être string OU array d'objets (events legacy). */
  asText(v: any): string {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) {
      return v.map(item => {
        if (item == null) return '';
        if (typeof item === 'string') return `• ${item}`;
        if (typeof item === 'object') {
          const title = item.title || item.label || item.name || '';
          const url = item.url || item.href || '';
          return `• ${title}${url ? ' — ' + url : ''}`.trim();
        }
        return `• ${String(item)}`;
      }).filter(Boolean).join('\n');
    }
    if (typeof v === 'object') {
      try { return JSON.stringify(v, null, 2); } catch { return String(v); }
    }
    return String(v);
  }

  copyUrl(e: Event, url: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(url);
      this.nzMsg.success('URL copiée');
    } catch {}
  }
}
