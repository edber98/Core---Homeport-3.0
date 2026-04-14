import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiStructuredPayload } from '../ai.service';
import { AiStructuredChipsTabsComponent } from './ai-structured-chips-tabs.component';
import { AiStructuredSteppedPlanComponent } from './ai-structured-stepped-plan.component';
import { AiStructuredComparisonTableComponent } from './ai-structured-comparison-table.component';
import { AiStructuredAccordionComponent } from './ai-structured-accordion.component';
import { AiStructuredTimelineComponent } from './ai-structured-timeline.component';
import { AiStructuredCardGridComponent } from './ai-structured-card-grid.component';

@Component({
  selector: 'ai-structured-message',
  standalone: true,
  imports: [
    CommonModule,
    AiStructuredChipsTabsComponent,
    AiStructuredSteppedPlanComponent,
    AiStructuredComparisonTableComponent,
    AiStructuredAccordionComponent,
    AiStructuredTimelineComponent,
    AiStructuredCardGridComponent,
  ],
  template: `
    <div class="structured" *ngIf="data">
      <div class="structured-title" *ngIf="data.title">{{ data.title }}</div>

      <ng-container [ngSwitch]="data.layout">
        <ai-structured-chips-tabs
          *ngSwitchCase="'chips_tabs'"
          [data]="data.data">
        </ai-structured-chips-tabs>

        <ai-structured-stepped-plan
          *ngSwitchCase="'stepped_plan'"
          [data]="data.data">
        </ai-structured-stepped-plan>

        <ai-structured-comparison-table
          *ngSwitchCase="'comparison_table'"
          [data]="data.data">
        </ai-structured-comparison-table>

        <ai-structured-accordion
          *ngSwitchCase="'accordion'"
          [data]="data.data">
        </ai-structured-accordion>

        <ai-structured-timeline
          *ngSwitchCase="'timeline'"
          [data]="data.data">
        </ai-structured-timeline>

        <ai-structured-card-grid
          *ngSwitchCase="'card_grid'"
          [data]="data.data"
          (action)="onAction($event)">
        </ai-structured-card-grid>

        <div *ngSwitchDefault class="fallback">
          Layout inconnu : {{ data.layout }}
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .structured {
      background: #fff;
      border: 1px solid #f0f0f0;
      border-radius: 12px;
      padding: 12px 14px;
      margin: 4px 0;
      max-width: 100%;
      min-width: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .structured-title {
      font-size: 14px; font-weight: 600; color: #333;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f5f5f5;
    }
    .fallback {
      padding: 8px; color: #ff4d4f; font-size: 12px;
      background: #fff2f0; border-radius: 6px;
    }
  `],
})
export class AiStructuredMessageComponent {
  @Input() data!: AiStructuredPayload;
  @Output() action = new EventEmitter<any>();

  onAction(evt: { payload: any; card: any }): void {
    this.action.emit(evt);
  }
}
