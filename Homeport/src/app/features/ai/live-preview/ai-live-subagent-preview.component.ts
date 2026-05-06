import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ai-live-subagent-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lp-sub fade-in">
      <div class="lp-sub-head">
        <span class="lp-sub-badge">Sous-agent</span>
        <span class="lp-sub-type">{{ subagentType() }}</span>
        <span class="lp-sub-status" [class.running]="status() === 'running'" [class.success]="status() === 'success'" [class.error]="status() === 'error'">{{ statusLabel() }}</span>
      </div>
      <div class="lp-sub-prompt" *ngIf="prompt()">{{ prompt() }}</div>
    </div>
  `,
  styles: [`
    :host { display: block; font-size: 13px; }
    .lp-sub { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border: 1px solid rgba(0,0,0,.08); border-radius: 6px; }
    .lp-sub-head { display: flex; gap: 8px; align-items: center; }
    .lp-sub-badge { background: rgba(114,46,209,.08); color: #722ed1; border-radius: 4px; padding: 1px 6px; font-size: 11px; font-weight: 600; }
    .lp-sub-type { font-weight: 600; }
    .lp-sub-status { margin-left: auto; font-size: 11px; padding: 1px 6px; border-radius: 10px; background: rgba(0,0,0,.05); }
    .lp-sub-status.running { background: rgba(22,119,255,.1); color: #1677ff; }
    .lp-sub-status.success { background: rgba(82,196,26,.1); color: #389e0d; }
    .lp-sub-status.error { background: rgba(255,77,79,.1); color: #cf1322; }
    .lp-sub-prompt { color: rgba(0,0,0,.6); font-size: 12px; max-height: 60px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
    .fade-in { animation: lpFade 120ms ease-out; }
    @keyframes lpFade { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class AiLiveSubagentPreviewComponent {
  @Input() data: any = null;
  subagentType(): string { return this.data?.subagentType || this.data?.subagent_type || 'general'; }
  status(): string { return this.data?.status || 'running'; }
  statusLabel(): string {
    const s = this.status();
    if (s === 'running') return 'En cours';
    if (s === 'success') return 'Terminé';
    if (s === 'error') return 'Erreur';
    return s;
  }
  prompt(): string {
    const p = String(this.data?.prompt || '');
    return p.length > 200 ? p.slice(0, 200) + '…' : p;
  }
}
