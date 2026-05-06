import { ChangeDetectionStrategy, Component, Input, OnChanges, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

interface TodoItemLike {
  id: string;
  content: string;
  activeForm?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

interface PlanHeaderData {
  todos: TodoItemLike[];
  title?: string;
}

/**
 * Plan/TODO sticky affiché EN HAUT d'un message assistant (style ChatGPT
 * "Thinking"). Collapsible. Affiche uniquement la progress + le current step
 * quand replié. Expanse pour voir tous les steps.
 *
 * Monté uniquement sur les messages assistant qui ont une metadata.todoList
 * OU quand le thread a une checklist active. Rendu compact, zéro card.
 */
@Component({
  selector: 'ai-message-plan-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule],
  template: `
    <div class="plh" *ngIf="data && data.todos?.length" [class.expanded]="expanded()">
      <header class="plh-head" (click)="toggle()">
        <span nz-icon [nzType]="expanded() ? 'down' : 'right'" nzTheme="outline" class="plh-chev"></span>
        <span class="plh-ico" [class.running]="hasActive()">
          <span nz-icon [nzType]="allDone() ? 'check-circle' : (hasActive() ? 'sync' : 'ordered-list')" [nzSpin]="hasActive()" nzTheme="outline"></span>
        </span>
        <div class="plh-label">
          <span class="plh-title">{{ allDone() ? 'Terminé' : (hasActive() ? currentStep() : 'Plan') }}</span>
          <span class="plh-progress">{{ completedCount() }}/{{ total() }}</span>
        </div>
        <div class="plh-bar" *ngIf="!expanded()">
          <div class="plh-bar-fill" [style.width.%]="progressPct()"></div>
        </div>
      </header>

      <ul class="plh-steps" *ngIf="expanded()">
        <li *ngFor="let t of data.todos; trackBy: trackId"
            class="plh-step"
            [class]="'plh-s-' + t.status">
          <span class="plh-step-ico" nz-icon [nzType]="stepIcon(t.status)" nzTheme="outline"></span>
          <span class="plh-step-text" [class.done]="t.status === 'completed'">
            {{ t.status === 'in_progress' && t.activeForm ? t.activeForm : t.content }}
          </span>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .plh {
      margin: 4px 0 12px;
      border-left: 2px solid #e8e8e8;
      padding-left: 10px;
      transition: border-color 0.15s ease;
    }
    .plh.expanded { border-left-color: #e61982; }
    .plh-head {
      display: flex; align-items: center; gap: 6px;
      cursor: pointer; user-select: none;
      padding: 2px 0;
      font-size: 11.5px; color: #8c8c8c;
      transition: color 0.15s ease;
    }
    .plh-head:hover { color: #e61982; }
    .plh-chev { font-size: 10px; }
    .plh-ico {
      font-size: 12px; color: #8c8c8c;
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px;
    }
    .plh-ico.running { color: #e61982; }
    .plh-label { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .plh-title {
      font-weight: 600; font-size: 12px; color: #262626;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .plh-progress { font-size: 10.5px; color: #8c8c8c; font-variant-numeric: tabular-nums; }
    .plh-bar {
      flex: 0 0 100px; height: 3px; background: #f0f0f0; border-radius: 2px; overflow: hidden;
    }
    .plh-bar-fill {
      height: 100%; background: linear-gradient(90deg, #e61982, #ff70a6);
      transition: width 0.3s ease;
    }
    .plh-steps {
      list-style: none; padding: 4px 0 4px 0; margin: 4px 0 0;
    }
    .plh-step {
      display: flex; align-items: center; gap: 8px;
      padding: 2px 0; font-size: 12px;
    }
    .plh-step-ico { font-size: 11px; color: #8c8c8c; }
    .plh-s-completed .plh-step-ico { color: #52c41a; }
    .plh-s-in_progress { color: #e61982; font-weight: 600; }
    .plh-s-in_progress .plh-step-ico { color: #e61982; animation: plh-spin 1.4s linear infinite; }
    .plh-s-cancelled { opacity: 0.5; text-decoration: line-through; }
    .plh-step-text { flex: 1; }
    .plh-step-text.done { text-decoration: line-through; color: #8c8c8c; }
    @keyframes plh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `],
})
export class AiMessagePlanHeaderComponent implements OnChanges {
  @Input() data: PlanHeaderData | null = null;

  expanded = signal(false);

  ngOnChanges(): void {
    // Auto-expand si en cours (hasActive) et qu'on vient de l'initialiser
    if (this.hasActive() && !this.expanded() && this.total() <= 6) {
      this.expanded.set(true);
    }
  }

  toggle(): void {
    this.expanded.update(v => !v);
  }

  total(): number { return this.data?.todos?.length || 0; }

  completedCount(): number {
    return (this.data?.todos || []).filter(t => t.status === 'completed').length;
  }

  allDone(): boolean {
    const todos = this.data?.todos || [];
    return todos.length > 0 && todos.every(t => t.status === 'completed' || t.status === 'cancelled');
  }

  hasActive(): boolean {
    return (this.data?.todos || []).some(t => t.status === 'in_progress');
  }

  currentStep(): string {
    const active = (this.data?.todos || []).find(t => t.status === 'in_progress');
    return active ? (active.activeForm || active.content) : '';
  }

  progressPct(): number {
    const total = this.total();
    if (!total) return 0;
    return Math.round((this.completedCount() / total) * 100);
  }

  stepIcon(status: string): string {
    if (status === 'completed') return 'check-circle';
    if (status === 'in_progress') return 'sync';
    if (status === 'cancelled') return 'stop';
    return 'clock-circle';
  }

  trackId = (_: number, t: TodoItemLike) => t.id;
}
