import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ai-live-download-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lp-dl fade-in">
      <div class="lp-dl-head">
        <span class="lp-dl-icon">⬇</span>
        <span class="lp-dl-title">{{ title() }}</span>
        <span class="lp-dl-size">{{ sizeLabel() }}</span>
      </div>
      <div class="lp-progress" *ngIf="progress() != null">
        <div class="bar" [style.width.%]="progress()"></div>
      </div>
      <div class="lp-dl-url" *ngIf="data?.url">{{ data.url }}</div>
    </div>
  `,
  styles: [`
    :host { display: block; font-size: 13px; }
    .lp-dl { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border: 1px solid rgba(0,0,0,.08); border-radius: 6px; }
    .lp-dl-head { display: flex; gap: 8px; align-items: center; }
    .lp-dl-icon { color: #1677ff; }
    .lp-dl-title { font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lp-dl-size { font-size: 11px; color: rgba(0,0,0,.5); }
    .lp-progress { width: 100%; height: 3px; background: rgba(0,0,0,.06); border-radius: 2px; overflow: hidden; }
    .lp-progress .bar { height: 100%; background: #1677ff; transition: width .15s ease; }
    .lp-dl-url { font-size: 11px; color: rgba(0,0,0,.4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fade-in { animation: lpFade 120ms ease-out; }
    @keyframes lpFade { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class AiLiveDownloadPreviewComponent {
  @Input() data: any = null;
  title(): string { return this.data?.name || this.data?.filename || 'Téléchargement en cours…'; }
  progress(): number | null {
    const rec = this.data?.receivedBytes;
    const tot = this.data?.totalBytes;
    if (typeof rec === 'number' && typeof tot === 'number' && tot > 0) {
      return Math.max(0, Math.min(100, Math.round(rec * 100 / tot)));
    }
    return null;
  }
  sizeLabel(): string {
    const rec = this.data?.receivedBytes;
    const tot = this.data?.totalBytes;
    if (typeof rec === 'number') {
      const recKb = (rec / 1024).toFixed(1);
      if (typeof tot === 'number' && tot > 0) return `${recKb} / ${(tot / 1024).toFixed(1)} Ko`;
      return `${recKb} Ko`;
    }
    return '';
  }
}
