import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type PlanStep = { title?: string; description?: string; status?: string };

@Component({
  selector: 'ai-live-plan-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lp-plan">
      <div class="lp-summary" *ngIf="data?.summary">{{ data.summary }}</div>
      <ol class="lp-steps">
        <li *ngFor="let step of steps(); let i = index; trackBy: trackStep" class="lp-step fade-in">
          <span class="step-idx">{{ i + 1 }}</span>
          <div class="step-body">
            <div class="step-title">{{ step.title || ('Étape ' + (i + 1)) }}</div>
            <div class="step-desc" *ngIf="step.description">{{ step.description }}</div>
          </div>
        </li>
      </ol>
      <div class="lp-risks" *ngIf="risks()?.length">
        <div class="risks-title">Risques</div>
        <ul>
          <li *ngFor="let r of risks(); trackBy: trackRisk">{{ r }}</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; font-size: 13px; }
    .lp-plan { display: flex; flex-direction: column; gap: 8px; }
    .lp-summary { color: rgba(0,0,0,.75); }
    .lp-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .lp-step { display: flex; gap: 8px; align-items: flex-start; }
    .step-idx { flex: 0 0 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; background: rgba(22,119,255,.08); color: #1677ff; font-weight: 600; font-size: 12px; }
    .step-title { font-weight: 600; }
    .step-desc { color: rgba(0,0,0,.65); margin-top: 2px; }
    .lp-risks { margin-top: 8px; padding: 8px 10px; border-left: 3px solid #faad14; background: rgba(250,173,20,.06); border-radius: 4px; }
    .risks-title { font-weight: 600; margin-bottom: 4px; color: #d48806; }
    .lp-risks ul { margin: 0; padding-left: 18px; }
    .fade-in { animation: lpFade 120ms ease-out; }
    @keyframes lpFade { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class AiLivePlanPreviewComponent {
  @Input() data: any = null;
  steps(): PlanStep[] {
    const s = this.data?.steps;
    return Array.isArray(s) ? s : [];
  }
  risks(): string[] {
    const r = this.data?.risks;
    return Array.isArray(r) ? r : [];
  }
  trackStep = (_: number, s: PlanStep) => (s?.title || '') + '::' + _;
  trackRisk = (i: number, r: string) => i + '::' + r;
}
