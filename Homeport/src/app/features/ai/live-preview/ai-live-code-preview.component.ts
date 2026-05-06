import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ai-live-code-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lp-code fade-in">
      <div class="lp-code-head">
        <span class="lp-lang-badge">{{ lang() }}</span>
        <span class="lp-status" [class.running]="status() === 'running'" [class.success]="status() === 'success'" [class.error]="status() === 'error' || status() === 'timeout'">{{ statusLabel() }}</span>
      </div>
      <pre class="lp-code-src" *ngIf="codeSnippet()">{{ codeSnippet() }}</pre>
      <div class="lp-terminal" *ngIf="stdout()?.length || stderr()?.length">
        <div *ngFor="let l of stdout(); trackBy: trackLine" class="term-line term-out">{{ l }}</div>
        <div *ngFor="let l of stderr(); trackBy: trackLine" class="term-line term-err">{{ l }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; font-size: 12px; }
    .lp-code { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border: 1px solid rgba(0,0,0,.08); border-radius: 6px; background: #0b1020; color: #e4ecf7; }
    .lp-code-head { display: flex; gap: 8px; align-items: center; }
    .lp-lang-badge { background: rgba(255,255,255,.08); color: #9bcaff; border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .lp-status { font-size: 11px; padding: 1px 6px; border-radius: 10px; background: rgba(255,255,255,.06); color: #cbd5e1; }
    .lp-status.running { background: rgba(22,119,255,.25); color: #9bcaff; }
    .lp-status.success { background: rgba(82,196,26,.25); color: #a7e3a0; }
    .lp-status.error { background: rgba(255,77,79,.25); color: #ffb4b4; }
    .lp-code-src { margin: 0; padding: 6px 8px; background: rgba(255,255,255,.04); border-radius: 4px; font-family: 'JetBrains Mono', 'Courier New', monospace; max-height: 140px; overflow: hidden; white-space: pre-wrap; word-break: break-all; }
    .lp-terminal { font-family: 'JetBrains Mono', 'Courier New', monospace; background: rgba(0,0,0,.35); border-radius: 4px; padding: 6px 8px; max-height: 180px; overflow: auto; }
    .term-line { white-space: pre-wrap; line-height: 1.35; animation: lineIn 120ms ease-out; }
    .term-out { color: #e4ecf7; }
    .term-err { color: #ffb4b4; }
    .fade-in { animation: lpFade 120ms ease-out; }
    @keyframes lpFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes lineIn { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class AiLiveCodePreviewComponent {
  @Input() data: any = null;
  lang(): string { return this.data?.language || this.data?.lang || 'code'; }
  status(): string { return this.data?.status || 'running'; }
  statusLabel(): string {
    const s = this.status();
    if (s === 'running') return 'En cours';
    if (s === 'success') return `OK${this.data?.duration ? ' · ' + this.data.duration + 'ms' : ''}`;
    if (s === 'error') return 'Erreur';
    if (s === 'timeout') return 'Timeout';
    return s;
  }
  codeSnippet(): string {
    const c = String(this.data?.code || '');
    if (!c) return '';
    return c.length > 400 ? c.slice(0, 400) + '…' : c;
  }
  stdout(): string[] { const l = this.data?.stdoutLines; return Array.isArray(l) ? l : []; }
  stderr(): string[] { const l = this.data?.stderrLines; return Array.isArray(l) ? l : []; }
  trackLine = (i: number, l: string) => i + '::' + (l?.length || 0);
}
