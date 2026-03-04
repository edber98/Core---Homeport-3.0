import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DemoBlock } from '../learn-curriculum';
import { DemoDragNodesComponent } from './demo-drag-nodes.component';
import { DemoConnectNodesComponent } from './demo-connect-nodes.component';
import { DemoExpressionEvalComponent } from './demo-expression-eval.component';

@Component({
  selector: 'learn-demo',
  standalone: true,
  imports: [CommonModule, NzIconModule, DemoDragNodesComponent, DemoConnectNodesComponent, DemoExpressionEvalComponent],
  template: `
    <div class="ld" *ngIf="block">
      <div class="ld-header">
        <span nz-icon nzType="experiment" nzTheme="outline" class="ld-icon"></span>
        <span class="ld-title">{{ block.title }}</span>
      </div>
      <p class="ld-desc" *ngIf="block.description">{{ block.description }}</p>
      <div class="ld-host" [style.height.px]="block.height || 400">
        <demo-drag-nodes *ngIf="block.demoId === 'drag-nodes'"></demo-drag-nodes>
        <demo-connect-nodes *ngIf="block.demoId === 'connect-nodes'"></demo-connect-nodes>
        <demo-expression-eval *ngIf="block.demoId === 'expression-eval'"></demo-expression-eval>
        <div *ngIf="!['drag-nodes','connect-nodes','expression-eval'].includes(block.demoId)" class="ld-unknown">
          Démo « {{ block.demoId }} » non disponible.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ld {
      border: 1px solid #e8e8e8; border-radius: 12px;
      background: #fafafa; overflow: hidden;
    }
    .ld-header {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 18px; border-bottom: 1px solid #e8e8e8;
    }
    .ld-icon { font-size: 18px; color: #722ed1; }
    .ld-title { font-weight: 600; font-size: 15px; }
    .ld-desc { font-size: 14px; color: #666; padding: 0 18px; margin: 10px 0 0; }
    .ld-host { position: relative; overflow: hidden; }
    .ld-unknown {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: #999; font-size: 14px;
    }
  `]
})
export class LearnDemoComponent {
  @Input() block!: DemoBlock;
}
