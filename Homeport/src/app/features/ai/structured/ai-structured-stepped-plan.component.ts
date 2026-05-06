import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';

type StepStatus = 'pending' | 'done' | 'blocked';

interface PlanStep {
  id?: string;
  title: string;
  description?: string;
  duration?: string;
  tools?: string[];
  status?: StepStatus;
}

interface SteppedPlanData {
  steps: PlanStep[];
}

@Component({
  selector: 'ai-structured-stepped-plan',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzTagModule],
  template: `
    <ol class="plan" *ngIf="data?.steps?.length">
      <li class="step"
          *ngFor="let s of data.steps; let i = index"
          [class.done]="s.status === 'done'"
          [class.blocked]="s.status === 'blocked'">
        <div class="bullet">
          <span *ngIf="s.status === 'done'" nz-icon nzType="check" nzTheme="outline"></span>
          <span *ngIf="s.status === 'blocked'" nz-icon nzType="warning" nzTheme="outline"></span>
          <span *ngIf="s.status !== 'done' && s.status !== 'blocked'">{{ i + 1 }}</span>
        </div>
        <div class="body">
          <div class="title">{{ s.title }}</div>
          <div class="desc" *ngIf="s.description">{{ s.description }}</div>
          <div class="meta" *ngIf="s.duration || (s.tools && s.tools.length)">
            <nz-tag *ngIf="s.duration" nzColor="default" class="duration">
              <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
              {{ s.duration }}
            </nz-tag>
            <nz-tag *ngFor="let t of s.tools || []" nzColor="pink" class="tool-chip">{{ t }}</nz-tag>
          </div>
        </div>
      </li>
    </ol>
  `,
  styles: [`
    .plan {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 10px;
      position: relative;
    }
    .step {
      display: flex; gap: 12px; align-items: flex-start;
      position: relative; padding-bottom: 4px;
    }
    .step:not(:last-child)::after {
      content: ''; position: absolute;
      left: 13px; top: 28px; bottom: -8px; width: 2px;
      background: #eee;
    }
    .bullet {
      width: 28px; height: 28px; border-radius: 50%;
      background: #fdf2f8; color: #e61982;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600; flex-shrink: 0;
      border: 2px solid #fbe1ee;
      z-index: 1;
    }
    .step.done .bullet {
      background: #e61982; color: #fff; border-color: #e61982;
    }
    .step.blocked .bullet {
      background: #fff2f0; color: #ff4d4f; border-color: #ffccc7;
    }
    .body { flex: 1; min-width: 0; }
    .title {
      font-size: 13px; font-weight: 600; color: #333;
      line-height: 1.4;
    }
    .step.done .title {
      text-decoration: line-through; color: #999; font-weight: 500;
    }
    .desc {
      font-size: 12px; color: #666;
      margin-top: 2px; line-height: 1.5;
      word-break: break-word;
    }
    .meta {
      display: flex; flex-wrap: wrap; gap: 4px;
      margin-top: 6px;
    }
    .meta nz-tag { margin: 0; font-size: 11px; }
    .duration span[nz-icon] { margin-right: 3px; }
  `],
})
export class AiStructuredSteppedPlanComponent {
  @Input() data!: SteppedPlanData;
}
