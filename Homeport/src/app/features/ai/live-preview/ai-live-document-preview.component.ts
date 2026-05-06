import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ai-live-document-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lp-doc fade-in">
      <div class="lp-doc-head">
        <span class="lp-format-badge" *ngIf="format()">{{ format() }}</span>
        <span class="lp-doc-title">{{ title() || 'Document en cours de rédaction…' }}</span>
      </div>
      <div class="lp-progress" *ngIf="progress() != null">
        <div class="bar" [style.width.%]="progress()"></div>
      </div>
      <div class="lp-hint">Le document sera disponible dans le canvas une fois terminé.</div>
    </div>
  `,
  styles: [`
    :host { display: block; font-size: 13px; }
    .lp-doc { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border: 1px solid rgba(0,0,0,.08); border-radius: 6px; }
    .lp-doc-head { display: flex; gap: 8px; align-items: center; }
    .lp-format-badge { background: rgba(22,119,255,.08); color: #1677ff; border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .lp-doc-title { font-weight: 600; }
    .lp-progress { width: 100%; height: 3px; background: rgba(0,0,0,.06); border-radius: 2px; overflow: hidden; }
    .lp-progress .bar { height: 100%; background: #1677ff; transition: width .15s ease; }
    .lp-hint { color: rgba(0,0,0,.5); font-size: 11px; }
    .fade-in { animation: lpFade 120ms ease-out; }
    @keyframes lpFade { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class AiLiveDocumentPreviewComponent {
  @Input() data: any = null;
  title(): string { return this.data?.title || this.data?.filename || ''; }
  format(): string {
    const f = this.data?.format || this.data?.extension || '';
    return String(f).replace(/^\./, '');
  }
  progress(): number | null {
    if (typeof this.data?.progress === 'number') return Math.max(0, Math.min(100, this.data.progress));
    return null;
  }
}
