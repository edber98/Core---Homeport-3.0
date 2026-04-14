import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ResearchStep {
  type: 'search' | 'fetch' | string;
  query?: string;
  url?: string;
  title?: string;
  status?: string;
  summary?: string;
}

@Component({
  selector: 'ai-live-research-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lp-research">
      <div class="lp-question" *ngIf="data?.question">{{ data.question }}</div>
      <ul class="lp-steps">
        <li *ngFor="let s of steps(); trackBy: trackStep" class="lp-step fade-in" [attr.data-status]="s.status || ''">
          <span class="step-dot" [class.dot-run]="s.status === 'running'" [class.dot-done]="s.status === 'done'" [class.dot-err]="s.status === 'error'"></span>
          <div class="step-body">
            <div class="step-kind">{{ labelFor(s) }}</div>
            <div class="step-summary" *ngIf="s.summary">{{ s.summary }}</div>
          </div>
        </li>
      </ul>
      <div class="lp-citations" *ngIf="citations()?.length">
        <div class="citations-title">Sources ({{ citations().length }})</div>
        <ul>
          <li *ngFor="let c of citations(); trackBy: trackCit">
            <a [href]="c.url" target="_blank" rel="noopener noreferrer">{{ c.title || c.url }}</a>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; font-size: 13px; }
    .lp-research { display: flex; flex-direction: column; gap: 8px; }
    .lp-question { font-weight: 600; color: rgba(0,0,0,.78); }
    .lp-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .lp-step { display: flex; gap: 8px; align-items: flex-start; padding: 3px 0; }
    .step-dot { flex: 0 0 8px; height: 8px; width: 8px; border-radius: 50%; background: rgba(0,0,0,.2); margin-top: 6px; }
    .step-dot.dot-run { background: #1677ff; animation: pulse 1.2s ease-in-out infinite; }
    .step-dot.dot-done { background: #52c41a; }
    .step-dot.dot-err { background: #ff4d4f; }
    .step-kind { font-weight: 500; }
    .step-summary { color: rgba(0,0,0,.6); font-size: 12px; margin-top: 1px; }
    .lp-citations { margin-top: 6px; font-size: 12px; }
    .citations-title { font-weight: 600; margin-bottom: 4px; }
    .lp-citations ul { margin: 0; padding-left: 18px; }
    .fade-in { animation: lpFade 120ms ease-out; }
    @keyframes lpFade { from { opacity: 0; transform: translateX(-3px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
  `],
})
export class AiLiveResearchPreviewComponent {
  @Input() data: any = null;
  steps(): ResearchStep[] {
    const s = this.data?.steps;
    return Array.isArray(s) ? s : [];
  }
  citations(): { title?: string; url: string }[] {
    const c = this.data?.citations;
    return Array.isArray(c) ? c : [];
  }
  labelFor(s: ResearchStep): string {
    if (s.type === 'search') return `Recherche : "${s.query || '…'}"`;
    if (s.type === 'fetch') return `Lecture : ${s.title || s.url || '…'}`;
    return s.type || '…';
  }
  trackStep = (i: number, s: ResearchStep) => i + '::' + (s?.url || s?.query || '');
  trackCit = (i: number, c: { url: string }) => c?.url || String(i);
}
